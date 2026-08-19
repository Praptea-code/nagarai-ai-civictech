"""NLP service — complaint classification and summarization."""


async def classify_complaint(description: str) -> dict:
    """Return category, severity, and summary for a complaint description."""
    return {
        "category": "other",
        "severity": "low",
        "summary": description[:200],
        "confidence": 0.0,
    }
