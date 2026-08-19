"""Computer vision service — image analysis for complaints."""


async def analyze_image(image_bytes: bytes) -> dict:
    """Return label and confidence for a complaint image."""
    return {
        "label": "unknown",
        "confidence": 0.0,
    }
