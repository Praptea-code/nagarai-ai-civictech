"""Citizen-facing routes: submit complaints, list and inspect own reports."""

import asyncio
import logging
import uuid

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    Header,
    HTTPException,
    Query,
    UploadFile,
)

from app.models.complaint import ComplaintCategory
from app.services.db import citizen_client, save_complaint, supabase
from app.services.embeddings import find_duplicate_complaints, generate_embedding
from app.services.nlp import classify_complaint_text
from app.services.storage import upload_complaint_image

router = APIRouter()
logger = logging.getLogger(__name__)

MAX_IMAGE_BYTES = 8 * 1024 * 1024
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png"}
VALID_STATUSES = {
    "submitted",
    "under_review",
    "assigned",
    "in_progress",
    "resolved",
    "rejected",
    "duplicate",
}


async def require_citizen(
    authorization: str | None = Header(default=None),
) -> tuple[str, str]:
    """Validate the Supabase JWT and return (auth.uid, access_token).

    Verification is delegated to Supabase Auth via get_user(): GoTrue checks
    signature, expiry and revocation authoritatively, so no local JWT secret
    is required (see DECISION_LOG 2026-08-22).
    """
    if not authorization or not authorization.startswith("Bearer "):
        logger.info("require_citizen rejected request | missing_or_malformed_header=true")
        raise HTTPException(
            status_code=401,
            detail="Missing bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = authorization.removeprefix("Bearer ").strip()
    try:
        response = await asyncio.to_thread(supabase.auth.get_user, access_token)
    except Exception:
        logger.info("require_citizen rejected request | invalid_or_expired_token=true")
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    logger.info("require_citizen success | uid_len=%d", len(response.user.id))
    return response.user.id, access_token


@router.post("/complaints", status_code=201)
async def create_complaint(
    description: str = Form(...),
    category: ComplaintCategory = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    ward: str | None = Form(None),
    municipality: str | None = Form(None),
    image: UploadFile | None = File(None),
    citizen: tuple[str, str] = Depends(require_citizen),
):
    """Run the Flow 1 / Flow 2 submission pipeline and persist the complaint."""
    citizen_id, _access_token = citizen
    has_image = image is not None and bool(image.filename)
    logger.info(
        "create_complaint called | desc_len=%d has_image=%s content_type=%s",
        len(description),
        has_image,
        getattr(image, "content_type", None) if has_image else None,
    )
    try:
        if not (-90 <= latitude <= 90) or not (-180 <= longitude <= 180):
            raise HTTPException(status_code=422, detail="latitude/longitude out of range")

        image_bytes: bytes | None = None
        content_type: str | None = None
        if has_image:
            content_type = image.content_type
            if content_type not in ALLOWED_IMAGE_TYPES:
                raise HTTPException(status_code=422, detail="image must be a JPEG or PNG")
            image_bytes = await image.read()
            if len(image_bytes) > MAX_IMAGE_BYTES:
                raise HTTPException(status_code=422, detail="image exceeds the 8MB size limit")

        # Flow 2: NLP, embedding and evidence upload are independent — run them
        # concurrently; only duplicate detection waits on the embedding.
        complaint_id = str(uuid.uuid4())
        tasks = [
            classify_complaint_text(description),
            asyncio.to_thread(generate_embedding, description),
        ]
        if image_bytes is not None:
            tasks.append(upload_complaint_image(image_bytes, complaint_id, content_type))
        results = await asyncio.gather(*tasks)
        nlp_result, embedding = results[0], results[1]
        image_url = results[2] if len(results) == 3 else None

        matches = await find_duplicate_complaints(embedding)
        status = "submitted"
        duplicate_of_complaint_id = None
        if matches:
            best = max(matches, key=lambda m: m["similarity"])
            duplicate_of_complaint_id = best["id"]
            status = "duplicate"

        complaint = await asyncio.to_thread(
            save_complaint,
            complaint_id=complaint_id,
            citizen_id=citizen_id,
            description=description,
            category=category,
            severity=nlp_result["severity"],
            latitude=latitude,
            longitude=longitude,
            ward=ward,
            municipality=municipality,
            ai_summary=nlp_result["summary"],
            ai_confidence=nlp_result["confidence"],
            embedding=embedding,
            status=status,
            duplicate_of_complaint_id=duplicate_of_complaint_id,
            image_url=image_url,
        )

        payload = {
            "id": complaint["id"],
            "status": complaint["status"],
            "category": category,
            "severity": nlp_result["severity"],
            "ai_summary": nlp_result["summary"],
            "ai_confidence": nlp_result["confidence"],
            "duplicate_of_complaint_id": duplicate_of_complaint_id,
            "image_url": image_url,
            "created_at": complaint["created_at"],
        }
        logger.info(
            "create_complaint success | complaint_id=%s status=%s severity=%s",
            payload["id"],
            payload["status"],
            payload["severity"],
        )
        return payload
    except HTTPException:
        raise
    except Exception:
        logger.exception("create_complaint failed | desc_len=%d", len(description))
        raise


@router.get("/complaints/mine")
async def list_my_complaints(
    status: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    citizen: tuple[str, str] = Depends(require_citizen),
):
    """List the authenticated citizen's complaints (RLS-scoped read)."""
    citizen_id, access_token = citizen
    logger.info(
        "list_my_complaints called | uid_len=%d status_filtered=%s limit=%d offset=%d",
        len(citizen_id),
        status is not None,
        limit,
        offset,
    )
    try:
        if status is not None and status not in VALID_STATUSES:
            raise HTTPException(status_code=422, detail="invalid status filter")

        client = citizen_client(access_token)

        def _run():
            count_q = client.table("complaints").select("id", count="exact")
            items_q = (
                client.table("complaints")
                .select(
                    "id, description, category, severity, status, "
                    "created_at, updated_at, departments(name)"
                )
                .order("created_at", desc=True)
                .range(offset, offset + limit - 1)
            )
            if status is not None:
                count_q = count_q.eq("status", status)
                items_q = items_q.eq("status", status)
            return count_q.execute(), items_q.execute()

        count_res, items_res = await asyncio.to_thread(_run)
        total = count_res.count or 0
        items = []
        for row in items_res.data:
            department = row.pop("departments", None)
            row["department"] = department.get("name") if isinstance(department, dict) else None
            items.append(row)

        payload = {"items": items, "total": total}
        logger.info(
            "list_my_complaints success | uid_len=%d returned=%d total=%d",
            len(citizen_id),
            len(items),
            total,
        )
        return payload
    except HTTPException:
        raise
    except Exception:
        logger.exception("list_my_complaints failed | uid_len=%d", len(citizen_id))
        raise


@router.get("/complaints/{complaint_id}")
async def get_complaint(
    complaint_id: str,
    citizen: tuple[str, str] = Depends(require_citizen),
):
    """Return one complaint plus its status history, scoped to its owner."""
    citizen_id, access_token = citizen
    logger.info("get_complaint called | complaint_id=%s", complaint_id)
    try:
        try:
            parsed_id = uuid.UUID(complaint_id)
        except ValueError:
            raise HTTPException(status_code=422, detail="complaint_id must be a UUID")
        complaint_id = str(parsed_id)

        client = citizen_client(access_token)
        owned = await asyncio.to_thread(
            lambda: client.table("complaints")
            .select("id, citizen_id, description, status, duplicate_of_complaint_id")
            .eq("id", complaint_id)
            .limit(1)
            .execute()
        )
        row = owned.data[0] if owned.data else None
        if row is None:
            # RLS makes foreign rows indistinguishable from missing ones; probe
            # with the trusted client solely to answer 403 (contract) vs 404.
            probe = await asyncio.to_thread(
                lambda: supabase.table("complaints")
                .select("citizen_id")
                .eq("id", complaint_id)
                .limit(1)
                .execute()
            )
            if probe.data:
                logger.info(
                    "get_complaint rejected foreign complaint | complaint_id=%s", complaint_id
                )
                raise HTTPException(status_code=403, detail="Not your complaint")
            raise HTTPException(status_code=404, detail="Complaint not found")

        history_res = await asyncio.to_thread(
            lambda: client.table("complaint_status_history")
            .select("status, created_at")
            .eq("complaint_id", complaint_id)
            .order("created_at")
            .execute()
        )
        images_res = await asyncio.to_thread(
            lambda: client.table("complaint_images")
            .select("image_url")
            .eq("complaint_id", complaint_id)
            .order("created_at")
            .limit(1)
            .execute()
        )
        image_url = images_res.data[0]["image_url"] if images_res.data else None

        payload = {
            "id": row["id"],
            "description": row["description"],
            "status": row["status"],
            "status_history": [
                {"status": entry["status"], "created_at": entry["created_at"]}
                for entry in history_res.data
            ],
            "image_url": image_url,
            "duplicate_of_complaint_id": row["duplicate_of_complaint_id"],
        }
        logger.info(
            "get_complaint success | complaint_id=%s history_len=%d has_image=%s",
            complaint_id,
            len(payload["status_history"]),
            image_url is not None,
        )
        return payload
    except HTTPException:
        raise
    except Exception:
        logger.exception("get_complaint failed | complaint_id=%s", complaint_id)
        raise
