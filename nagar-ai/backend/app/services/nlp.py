"""NLP service — complaint severity classification and summarization."""

import asyncio
import logging
import re

from app.core.config import settings

logger = logging.getLogger(__name__)

SEVERITY_LABELS = ["low", "medium", "high", "critical"]

_classifier = None


def _get_classifier():
    """Lazily load and cache the zero-shot classification pipeline."""
    global _classifier
    logger.info("_get_classifier called | model=%s cached=%s", settings.HF_NLP_MODEL, _classifier is not None)
    try:
        if _classifier is None:
            from transformers import pipeline

            _classifier = pipeline("zero-shot-classification", model=settings.HF_NLP_MODEL)
        logger.info("_get_classifier success | model=%s", settings.HF_NLP_MODEL)
        return _classifier
    except Exception:
        logger.exception("_get_classifier failed | model=%s", settings.HF_NLP_MODEL)
        raise


def _extract_summary(text: str, max_chars: int = 200) -> str:
    """Return the first sentence of the text, truncated to max_chars."""
    first_sentence = re.split(r"(?<=[.!?])\s+", text.strip(), maxsplit=1)[0]
    return first_sentence[:max_chars]


async def classify_complaint_text(text: str) -> dict:
    """Classify complaint severity via zero-shot NLP and return a short summary.

    Returns {"severity": str, "summary": str, "confidence": float} — no category;
    category is citizen-supplied per DECISION_LOG 2026-08-22.
    """
    logger.info("classify_complaint_text called | text_len=%d", len(text))
    try:
        result = await asyncio.to_thread(_get_classifier(), text, candidate_labels=SEVERITY_LABELS)
        severity = result["labels"][0]
        confidence = float(result["scores"][0])
        summary = _extract_summary(text)
        payload = {"severity": severity, "summary": summary, "confidence": round(confidence, 4)}
        logger.info(
            "classify_complaint_text success | severity=%s confidence=%.2f summary_len=%d",
            payload["severity"],
            payload["confidence"],
            len(payload["summary"]),
        )
        return payload
    except Exception:
        logger.exception("classify_complaint_text failed | text_len=%d", len(text))
        raise
