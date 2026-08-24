"""NLP service — complaint severity classification and summarization."""

import asyncio
import logging
import re

from app.core.config import settings
from app.services.translation import has_devanagari, maybe_translate_to_english

logger = logging.getLogger(__name__)

# Zero-shot NLI models cannot meaningfully separate bare words like
# "low"/"high" (scores hover ~0.3, under the confidence floor, so every
# complaint stored severity=null). Descriptive consequence-phrased labels
# give the model something entailable; verified on sample complaints
# 2026-08-23 (pothole+danger -> high @0.99, sewage overflow -> high @0.97,
# single streetlight -> high @0.75, hairline crack -> below floor -> triage).
SEVERITY_CANDIDATES = [
    ("minor cosmetic damage with no risk to anyone", "low"),
    ("a problem that should be fixed but is not dangerous", "medium"),
    ("a serious problem that could hurt someone or damage property", "high"),
    ("an immediate life-threatening emergency", "critical"),
]
SEVERITY_HYPOTHESIS_TEMPLATE = "This complaint reports {}."
_LABEL_TO_SEVERITY = dict(SEVERITY_CANDIDATES)

# Below this top-label score the classifier is effectively guessing (random
# baseline for 4 labels is ~0.25); the text is retried once via Nepali->English
# translation and, if still under the floor, severity defaults to "low" as an
# unparseable-input placeholder rather than a misleading guess. See
# DECISION_LOG 2026-08-22 (floor rationale) and 2026-08-24 (default change).
SEVERITY_CONFIDENCE_FLOOR = 0.5

# Zero-shot NLI anchors on the hazard type and under-ranks past casualties:
# "There is a pothole and there have been 3 major accidents" reads high @0.99
# with critical @0.005, and re-wording the critical hypothesis does not move
# it. Explicit harm evidence therefore deterministically escalates a
# medium/high reading to critical (DECISION_LOG 2026-08-24).
_CRITICAL_EVIDENCE_RE = re.compile(
    "|".join(
        [
            r"\baccidents?\b",
            r"\binjur",
            r"\bdeaths?\b",
            r"\bdied\b",
            r"\bkilled\b",
            r"\bfatal",
            r"\bcasualt",
            r"\belectrocut",
            r"\bdrown",
            r"\bcollaps",
            r"hit.and.run",
            # romanized Nepali: durghatna (accident), ghayal (injured),
            # mrityu/mrit (death/dead)
            r"\bdur[gy]?[ah]?tn",
            r"\bghayal\b",
            r"\bmrityu\b",
            r"\bmrit\b",
            # Devanagari: दुर्घटना घायल मृत्यु मृत (substring match; \b is
            # unreliable around Devanagari script)
            "दुर्घटना",
            "घायल",
            "मृत्यु",
            "मृत",
        ]
    ),
    re.IGNORECASE,
)

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
    logger.info("_extract_summary called | text_len=%d max_chars=%d", len(text), max_chars)
    try:
        first_sentence = re.split(r"(?<=[.!?])\s+", text.strip(), maxsplit=1)[0]
        summary = first_sentence[:max_chars]
        logger.info("_extract_summary success | summary_len=%d", len(summary))
        return summary
    except Exception:
        logger.exception("_extract_summary failed | text_len=%d", len(text))
        raise


async def _classify_once(text: str) -> tuple[str, float]:
    """Run the zero-shot classifier once and return (top_severity, top_score)."""
    result = await asyncio.to_thread(
        _get_classifier(),
        text,
        candidate_labels=[label for label, _ in SEVERITY_CANDIDATES],
        hypothesis_template=SEVERITY_HYPOTHESIS_TEMPLATE,
    )
    severity = _LABEL_TO_SEVERITY[result["labels"][0]]
    confidence = float(result["scores"][0])
    return severity, confidence


def _has_critical_evidence(original: str, translated: str | None) -> bool:
    """True when either the original or its English rendering mentions
    concrete harm (accidents/injuries/deaths)."""
    if _CRITICAL_EVIDENCE_RE.search(original):
        return True
    return bool(translated and _CRITICAL_EVIDENCE_RE.search(translated))


def _looks_like_language(text: str) -> bool:
    """Heuristic gate for keyboard-mash input.

    Noise like "mmmmmmmmmookoioko", "vhj" or "a" scores right around the
    confidence floor (0.47-0.53 observed), so the floor alone cannot separate
    noise from signal. Text is language-like when it has a few distinct letters,
    some vowels, and no long single-character runs; any Devanagari passes.
    """
    if has_devanagari(text):
        return True
    words = re.findall(r"[A-Za-z]{2,}", text)
    if not words:
        return False
    letters = "".join(words).lower()
    if len(set(letters)) < 5:
        return False
    vowels = sum(c in "aeiou" for c in letters)
    if vowels / len(letters) < 0.2:
        return False
    longest_run = max(
        (len(m.group(0)) for m in re.finditer(r"(.)\1*", letters)), default=0
    )
    return longest_run < 4


async def classify_complaint_text(text: str) -> dict:
    """Classify complaint severity via zero-shot NLP and return a short summary.

    Returns {"severity": str, "summary": str, "confidence": float} — no
    category; category is citizen-supplied per DECISION_LOG 2026-08-22. When
    the top-label score is under SEVERITY_CONFIDENCE_FLOOR, the text is retried
    once through Nepali->English translation (the classifier is English-trained,
    so romanized-Nepali complaints score low as-is); if it still reads under the
    floor the input is treated as unparseable and severity defaults to "low".
    Explicit harm evidence (accidents, injuries, deaths — English or Nepali)
    escalates a medium/high reading to critical.
    """
    logger.info("classify_complaint_text called | text_len=%d", len(text))
    try:
        language_like = _looks_like_language(text)
        severity, confidence = await _classify_once(text)
        translated_text: str | None = None

        # Skip the (expensive) translation rescue for keyboard-mash input —
        # there is nothing to translate.
        if confidence < SEVERITY_CONFIDENCE_FLOOR and language_like:
            english = await maybe_translate_to_english(text)
            if english != text:
                translated_text = english
                translated_severity, translated_confidence = await _classify_once(
                    english
                )
                logger.info(
                    "classify_complaint_text retry with translation "
                    "| before=%.4f after=%.4f",
                    confidence,
                    translated_confidence,
                )
                if translated_confidence > confidence:
                    severity, confidence = (
                        translated_severity,
                        translated_confidence,
                    )

        if not language_like or confidence < SEVERITY_CONFIDENCE_FLOOR:
            logger.info(
                "classify_complaint_text low signal | language_like=%s confidence=%.4f "
                "floor=%.2f -> severity='low'",
                language_like,
                confidence,
                SEVERITY_CONFIDENCE_FLOOR,
            )
            severity = "low"
        elif severity in ("medium", "high") and _has_critical_evidence(
            text, translated_text
        ):
            logger.info(
                "classify_complaint_text critical escalation | was=%s evidence=true",
                severity,
            )
            severity = "critical"
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
