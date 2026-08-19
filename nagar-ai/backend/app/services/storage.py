"""Storage service — Supabase Storage / S3 file uploads."""


async def upload_image(bucket: str, path: str, data: bytes) -> str:
    """Upload an image and return the public URL."""
    return f"https://placeholder/{bucket}/{path}"
