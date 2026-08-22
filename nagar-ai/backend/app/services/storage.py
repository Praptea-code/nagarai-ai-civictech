"""Storage service — Supabase Storage uploads for complaint evidence images."""

import logging
from datetime import datetime, timezone

from app.services.db import supabase

logger = logging.getLogger(__name__)

BUCKET_NAME = "complaint-images"

_CONTENT_TYPE_TO_EXT = {
    "image/jpeg": "jpg",
    "image/png": "png",
}


async def upload_complaint_image(
    data: bytes, complaint_id: str, content_type: str | None = None
) -> str:
    """Upload a complaint's evidence image to Supabase Storage and return its public URL.

    Object path follows docs/ARCHITECTURE_CITIZEN_FLOW.md: complaint-images bucket,
    keyed by {year}/{month}/ at upload time.
    """
    logger.info(
        "upload_complaint_image called | size_bytes=%d complaint_id=%s", len(data), complaint_id
    )
    try:
        ext = _CONTENT_TYPE_TO_EXT.get(content_type or "", "jpg")
        now = datetime.now(timezone.utc)
        object_path = f"{now.year}/{now.month:02d}/{complaint_id}.{ext}"
        file_options = {"content-type": content_type or "image/jpeg"}

        supabase.storage.from_(BUCKET_NAME).upload(object_path, data, file_options)
        public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(object_path)

        logger.info(
            "upload_complaint_image success | bucket=%s object_path=%s url_len=%d",
            BUCKET_NAME,
            object_path,
            len(public_url),
        )
        return public_url
    except Exception:
        logger.exception(
            "upload_complaint_image failed | size_bytes=%d complaint_id=%s", len(data), complaint_id
        )
        raise
