"""Embedding service — MiniLM vector generation and pgvector duplicate search."""

import logging

from app.core.config import settings
from app.services.db import supabase

logger = logging.getLogger(__name__)

EMBEDDING_DIMENSIONS = 384
DUPLICATE_SIMILARITY_THRESHOLD = 0.87

_model = None


def _get_model():
    """Lazily load and cache the sentence-transformers embedding model."""
    global _model
    logger.info(
        "_get_model called | model=%s cached=%s", settings.EMBEDDING_MODEL, _model is not None
    )
    try:
        if _model is None:
            from sentence_transformers import SentenceTransformer

            _model = SentenceTransformer(settings.EMBEDDING_MODEL)
        logger.info("_get_model success | model=%s", settings.EMBEDDING_MODEL)
        return _model
    except Exception:
        logger.exception("_get_model failed | model=%s", settings.EMBEDDING_MODEL)
        raise


def generate_embedding(text: str) -> list[float]:
    """Generate a 384-dim embedding for complaint text.

    Dimension matches nagar_ai_schema.sql's `embedding vector(384)` column.
    """
    logger.info("generate_embedding called | text_len=%d", len(text))
    try:
        vector = _get_model().encode(text, normalize_embeddings=True).tolist()
        if len(vector) != EMBEDDING_DIMENSIONS:
            raise ValueError(f"expected {EMBEDDING_DIMENSIONS}-dim embedding, got {len(vector)}")
        logger.info("generate_embedding success | dim=%d", len(vector))
        return vector
    except Exception:
        logger.exception("generate_embedding failed | text_len=%d", len(text))
        raise


async def find_duplicate_complaints(embedding: list[float]) -> list[dict]:
    """Return complaints with cosine similarity >= 0.87 to the given embedding.

    Queries via the find_duplicate_complaints RPC defined in nagar_ai_schema.sql —
    supabase-py/PostgREST cannot express vector operators directly. RLS applies,
    so callers only match against complaints they are allowed to see.
    """
    logger.info(
        "find_duplicate_complaints called | dim=%d threshold=%.2f",
        len(embedding),
        DUPLICATE_SIMILARITY_THRESHOLD,
    )
    try:
        response = supabase.rpc(
            "find_duplicate_complaints",
            {
                "query_embedding": embedding,
                "similarity_threshold": DUPLICATE_SIMILARITY_THRESHOLD,
            },
        ).execute()
        matches = response.data or []
        logger.info("find_duplicate_complaints success | match_count=%d", len(matches))
        return matches
    except Exception:
        logger.exception("find_duplicate_complaints failed | dim=%d", len(embedding))
        raise
