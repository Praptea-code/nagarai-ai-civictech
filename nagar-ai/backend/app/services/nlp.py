"""NLP service — complaint classification and summarization."""


async def classify_complaint_text(description: str) -> dict:
    """Return severity and summary for a complaint description."""
    return {
        "severity": "low",
        "summary": description[:200],
        "confidence": 0.0,
    }
