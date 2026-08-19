"""Embedding service — vector generation for duplicate detection."""


async def generate_embedding(text: str) -> list[float]:
    """Return a 384-dim embedding vector for the given text."""
    return [0.0] * 384
