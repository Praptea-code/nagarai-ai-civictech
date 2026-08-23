"""Admin-facing routes: list/filter all complaints, inspect detail, mutate status,
and aggregate dashboard stats.

Every route requires a Supabase JWT belonging to a profiles row with role='admin'.
JWT verification is delegated to Supabase Auth (same approach as require_citizen in
routers/citizen.py, DECISION_LOG 2026-08-22); the role check reads profiles under the
service-role client so RLS cannot recurse (public.is_admin() is the DB-side mirror).
Writes run under the service-role client because complaint_status_history is
admin-insert-only by RLS and complaints updates are admin-only — the backend is the
trusted write boundary and takes changed_by exclusively from the verified JWT.
"""

import asyncio
import logging
import uuid

from fastapi import (
    APIRouter,
    Depends,
    Header,
    HTTPException,
    Query,
)

from app.models.complaint import ComplaintUpdate
from app.services.db import supabase

router = APIRouter()
logger = logging.getLogger(__name__)

LIST_FIELDS = (
    "id, description, category, severity, status, ward, municipality, "
    "created_at, updated_at"
)
DETAIL_FIELDS = (
    "id, description, category, severity, status, ward, municipality, "
    "latitude, longitude, ai_summary, ai_confidence, duplicate_of_complaint_id, "
    "department_id, citizen_id, created_at, updated_at"
)


async def require_admin(authorization: str | None = Header(default=None)) -> str:
    """Validate the Supabase JWT and confirm the profile role is 'admin'.

    Returns the admin's auth.uid on success. Invalid/expired tokens yield 401;
    valid tokens from non-admin accounts yield 403.
    """
    if not authorization or not authorization.startswith("Bearer "):
        logger.info("require_admin rejected request | missing_or_malformed_header=true")
        raise HTTPException(
            status_code=401,
            detail="Missing bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = authorization.removeprefix("Bearer ").strip()
    try:
        response = await asyncio.to_thread(supabase.auth.get_user, access_token)
    except Exception as exc:
        logger.info(
            "require_admin rejected request | invalid_or_expired_token=true err=%s",
            type(exc).__name__,
        )
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    uid = response.user.id

    profile_res = await asyncio.to_thread(
        lambda: supabase.table("profiles")
        .select("role")
        .eq("id", uid)
        .limit(1)
        .execute()
    )
    role = profile_res.data[0].get("role") if profile_res.data else None
    if role != "admin":
        logger.info(
            "require_admin rejected request | uid_len=%d role=%s", len(uid), role
        )
        raise HTTPException(status_code=403, detail="Admin access required")

    logger.info("require_admin success | uid_len=%d", len(uid))
    return uid


def _parse_uuid(complaint_id: str) -> str:
    try:
        return str(uuid.UUID(complaint_id))
    except ValueError:
        raise HTTPException(status_code=422, detail="complaint_id must be a UUID")


def _apply_list_filters(query, *, status: str | None, category: str | None,
                        severity: str | None, q: str | None):
    if status is not None:
        query = query.eq("status", status)
    if category is not None:
        query = query.eq("category", category)
    if severity is not None:
        if severity == "none":
            query = query.is_("severity", "null")
        else:
            query = query.eq("severity", severity)
    if q:
        query = query.ilike("description", f"%{q}%")
    return query


@router.get("/complaints")
async def list_all_complaints(
    status: str | None = Query(default=None),
    category: str | None = Query(default=None),
    severity: str | None = Query(default=None),
    q: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    admin_uid: str = Depends(require_admin),
):
    """Paginated list of every complaint with optional filters.

    Matches the {items, total} shape of GET /complaints/mine so the admin table
    can paginate identically. `q` does a case-insensitive substring match on the
    description; `severity=none` selects rows where NLP confidence fell below the
    floor and severity was stored null (manual triage queue).
    """
    logger.info(
        "list_all_complaints called | admin_uid_len=%d status_filtered=%s "
        "category_filtered=%s severity_filtered=%s q=%r limit=%d offset=%d",
        len(admin_uid),
        status is not None,
        category is not None,
        severity is not None,
        q,
        limit,
        offset,
    )
    try:
        def _run():
            base_count = supabase.table("complaints").select("id", count="exact")
            base_items = supabase.table("complaints").select(LIST_FIELDS)
            count_q = _apply_list_filters(
                base_count, status=status, category=category, severity=severity, q=q
            )
            items_q = _apply_list_filters(
                base_items, status=status, category=category, severity=severity, q=q
            ).order("created_at", desc=True).range(offset, offset + limit - 1)
            return count_q.execute(), items_q.execute()

        count_res, items_res = await asyncio.to_thread(_run)
        total = count_res.count or 0
        payload = {"items": items_res.data, "total": total}
        logger.info(
            "list_all_complaints success | admin_uid_len=%d returned=%d total=%d",
            len(admin_uid),
            len(payload["items"]),
            total,
        )
        return payload
    except Exception:
        logger.exception("list_all_complaints failed | admin_uid_len=%d", len(admin_uid))
        raise


async def _load_complaint_detail(complaint_id: str) -> dict:
    """Shared detail loader for GET and PATCH responses.

    Runs three queries under the service-role client: the complaint row, its
    images and its status history, plus a reporter-profile lookup keyed by
    citizen_id. Profiles are fetched separately rather than embedded via
    PostgREST relationship hints to avoid depending on auto-generated FK names.
    """
    def _fetch_row():
        return (
            supabase.table("complaints")
            .select(DETAIL_FIELDS)
            .eq("id", complaint_id)
            .limit(1)
            .execute()
        )

    row_res = await asyncio.to_thread(_fetch_row)
    if not row_res.data:
        raise HTTPException(status_code=404, detail="Complaint not found")
    row = row_res.data[0]

    images_res, history_res = await asyncio.to_thread(
        lambda: (
            supabase.table("complaint_images")
            .select("image_url")
            .eq("complaint_id", complaint_id)
            .order("created_at")
            .execute(),
            supabase.table("complaint_status_history")
            .select("status, note, changed_by, created_at")
            .eq("complaint_id", complaint_id)
            .order("created_at")
            .execute(),
        )
    )

    citizen_id = row.pop("citizen_id", None)
    citizen = None
    if citizen_id:
        profile_res = await asyncio.to_thread(
            lambda: supabase.table("profiles")
            .select("id, full_name, phone")
            .eq("id", citizen_id)
            .limit(1)
            .execute()
        )
        if profile_res.data:
            citizen = profile_res.data[0]

    row["citizen"] = citizen
    row["image_urls"] = [entry["image_url"] for entry in images_res.data]
    row["status_history"] = history_res.data
    return row


@router.get("/complaints/{complaint_id}")
async def get_complaint(
    complaint_id: str,
    admin_uid: str = Depends(require_admin),
):
    """Full complaint record for the triage view: metadata, evidence photos,
    reporter info, AI classification and the complete audit trail."""
    logger.info("get_complaint called | complaint_id=%s", complaint_id)
    try:
        complaint_id = _parse_uuid(complaint_id)
        detail = await _load_complaint_detail(complaint_id)
        logger.info(
            "get_complaint success | complaint_id=%s history_len=%d num_images=%d",
            complaint_id,
            len(detail["status_history"]),
            len(detail["image_urls"]),
        )
        return detail
    except HTTPException:
        raise
    except Exception:
        logger.exception("get_complaint failed | complaint_id=%s", complaint_id)
        raise


@router.patch("/complaints/{complaint_id}")
async def update_complaint(
    complaint_id: str,
    update: ComplaintUpdate,
    admin_uid: str = Depends(require_admin),
):
    """Apply an admin action: transition status, reassign department, or append
    a prediction/resolution note.

    Every accepted mutation appends a complaint_status_history row carrying
    changed_by=admin uid and the optional note, preserving the audit trail that
    powers resolution-time analytics. A note without a status change is recorded
    as a same-status history entry so prediction notes remain traceable.
    """
    logger.info(
        "update_complaint called | complaint_id=%s has_status=%s has_note=%s "
        "has_department=%s",
        complaint_id,
        update.status is not None,
        update.note is not None,
        update.department_id is not None,
    )
    try:
        complaint_id = _parse_uuid(complaint_id)

        if update.status is None and update.note is None and update.department_id is None:
            raise HTTPException(
                status_code=422,
                detail="provide at least one of status, note or department_id",
            )

        current_res = await asyncio.to_thread(
            lambda: supabase.table("complaints")
            .select("status, department_id")
            .eq("id", complaint_id)
            .limit(1)
            .execute()
        )
        if not current_res.data:
            raise HTTPException(status_code=404, detail="Complaint not found")
        current = current_res.data[0]

        fields: dict = {}
        if update.department_id is not None:
            dept_res = await asyncio.to_thread(
                lambda: supabase.table("departments")
                .select("id")
                .eq("id", str(update.department_id))
                .limit(1)
                .execute()
            )
            if not dept_res.data:
                raise HTTPException(status_code=422, detail="Unknown department_id")
            fields["department_id"] = str(update.department_id)

        if update.status is not None and update.status != current["status"]:
            fields["status"] = update.status

        if fields:
            await asyncio.to_thread(
                lambda: supabase.table("complaints")
                .update(fields)
                .eq("id", complaint_id)
                .execute()
            )

        if update.status is not None or update.note is not None:
            history_status = update.status if update.status is not None else current["status"]
            await asyncio.to_thread(
                lambda: supabase.table("complaint_status_history")
                .insert(
                    {
                        "complaint_id": complaint_id,
                        "status": history_status,
                        "changed_by": admin_uid,
                        "note": update.note,
                    }
                )
                .execute()
            )

        detail = await _load_complaint_detail(complaint_id)
        logger.info(
            "update_complaint success | complaint_id=%s new_status=%s",
            complaint_id,
            detail["status"],
        )
        return detail
    except HTTPException:
        raise
    except Exception:
        logger.exception("update_complaint failed | complaint_id=%s", complaint_id)
        raise


@router.get("/dashboard/summary")
async def dashboard_summary(admin_uid: str = Depends(require_admin)):
    """Aggregate counts for the overview page.

    One lightweight column fetch aggregated in Python: per-status/severity/
    category COUNT endpoints would be 19 round trips through PostgREST; at this
    scale a single select of three small columns wins on both latency and code.
    Revisit with a Postgres view if complaint volume grows large enough to matter.
    """
    logger.info("dashboard_summary called | admin_uid_len=%d", len(admin_uid))
    try:
        def _run():
            return (
                supabase.table("complaints")
                .select("status, severity, category")
                .order("created_at", desc=True)
                .execute(),
                supabase.table("complaints")
                .select(LIST_FIELDS)
                .order("created_at", desc=True)
                .range(0, 4)
                .execute(),
            )

        all_res, recent_res = await asyncio.to_thread(_run)

        by_status: dict[str, int] = {}
        by_severity: dict[str, int] = {}
        by_category: dict[str, int] = {}
        for row in all_res.data:
            if row["status"]:
                by_status[row["status"]] = by_status.get(row["status"], 0) + 1
            if row["severity"]:
                by_severity[row["severity"]] = by_severity.get(row["severity"], 0) + 1
            if row["category"]:
                by_category[row["category"]] = by_category.get(row["category"], 0) + 1

        payload = {
            "total": len(all_res.data),
            "by_status": by_status,
            "by_severity": by_severity,
            "by_category": by_category,
            "recent": recent_res.data,
        }
        logger.info(
            "dashboard_summary success | admin_uid_len=%d total=%d",
            len(admin_uid),
            payload["total"],
        )
        return payload
    except Exception:
        logger.exception("dashboard_summary failed | admin_uid_len=%d", len(admin_uid))
        raise
