"""Database service — Supabase clients and persistence helpers."""

import logging

from supabase import Client, create_client

from app.core.config import settings

logger = logging.getLogger(__name__)

# Trusted server-side client: bypasses RLS. Used for writes citizens are not
# allowed under RLS (e.g. complaint_status_history is admin-insert-only) and
# for existence probes. citizen_id always originates from a verified JWT.
supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


def citizen_client(access_token: str) -> Client:
    """Return a fresh client whose PostgREST requests carry the citizen's JWT.

    A new client per request is required: supabase-py's postgrest.auth() mutates
    shared header state, so reusing one client across concurrent requests would
    leak one user's token into another user's query. With the user's bearer set,
    Postgres RLS scopes every read/write to that citizen.
    """
    logger.info("citizen_client called | token_len=%d", len(access_token))
    try:
        client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
        client.postgrest.auth(access_token)
        logger.info("citizen_client success | token_len=%d", len(access_token))
        return client
    except Exception:
        logger.exception("citizen_client failed | token_len=%d", len(access_token))
        raise


def save_complaint(
    *,
    complaint_id: str,
    citizen_id: str,
    description: str,
    category: str,
    severity: str | None,
    latitude: float,
    longitude: float,
    ward: str | None,
    municipality: str | None,
    ai_summary: str | None,
    ai_confidence: float | None,
    embedding: list[float] | None,
    status: str,
    duplicate_of_complaint_id: str | None = None,
    image_url: str | None = None,
) -> dict:
    """Insert the complaints row plus optional image row and initial status-history row.

    Runs under the service-role client because the complaint_status_history RLS
    policy only permits admin inserts; the backend is the trusted write boundary
    and citizen_id comes from a verified JWT upstream. Returns the inserted row.
    """
    logger.info(
        "save_complaint called | desc_len=%d has_image=%s has_embedding=%s status=%s",
        len(description),
        image_url is not None,
        embedding is not None,
        status,
    )
    try:
        res = (
            supabase.table("complaints")
            .insert(
                {
                    "id": complaint_id,
                    "citizen_id": citizen_id,
                    "description": description,
                    "category": category,
                    "severity": severity,
                    "status": status,
                    "latitude": latitude,
                    "longitude": longitude,
                    "ward": ward,
                    "municipality": municipality,
                    "ai_summary": ai_summary,
                    "ai_confidence": ai_confidence,
                    "embedding": embedding,
                    "duplicate_of_complaint_id": duplicate_of_complaint_id,
                }
            )
            .execute()
        )
        complaint = res.data[0]
        if image_url:
            supabase.table("complaint_images").insert(
                {"complaint_id": complaint["id"], "image_url": image_url}
            ).execute()
        supabase.table("complaint_status_history").insert(
            {
                "complaint_id": complaint["id"],
                "status": status,
                "changed_by": citizen_id,
            }
        ).execute()
        logger.info(
            "save_complaint success | complaint_id=%s status=%s has_image=%s",
            complaint["id"],
            complaint["status"],
            bool(image_url),
        )
        return complaint
    except Exception:
        logger.exception("save_complaint failed | complaint_id=%s", complaint_id)
        raise
