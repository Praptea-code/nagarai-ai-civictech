"""Best-effort Nepali -> English translation used to rescue low-confidence
severity classifications (facebook/bart-large-mnli is English-trained, so
romanized-Nepali complaints often score under SEVERITY_CONFIDENCE_FLOOR).

Latin-script input is transliterated to Devanagari with indic-transliteration,
then translated with NLLB-200. Every failure is logged and the ORIGINAL text is
returned so callers degrade gracefully to today's behaviour (severity=null ->
admin triage) instead of failing the request. No raw user text is logged.
"""

import asyncio
import logging
import re

logger = logging.getLogger(__name__)

_TRANSLATION_MODEL = "facebook/nllb-200-distilled-600M"
_SRC_LANG = "nep_Npan"
_TGT_LANG = "eng_Latn"
_MAX_TRANSLATION_CHARS = 600

# Devanagari block U+0900..U+097F, built from code points so this file stays
# pure ASCII (some editors/tools mangle literal Devanagari characters).
_DEVANAGARI_RE = re.compile("[%s-%s]" % (chr(0x0900), chr(0x097F)))

_transliterator = None
_translator = None


def has_devanagari(text: str) -> bool:
    """Public check used by callers deciding whether transliteration applies."""
    return bool(_DEVANAGARI_RE.search(text))


def _get_transliterator():
    """Lazily load and cache the Latin->Devanagari transliterator (pure Python,
    no fairseq — ai4bharat's XlitEngine is broken on Python 3.12)."""
    global _transliterator
    if _transliterator is None:
        from indic_transliteration import sanscript

        def _transliterate(text: str) -> str:
            return sanscript.transliterate(
                text, sanscript.ITRANS, sanscript.DEVANAGARI
            )

        _transliterator = _transliterate
    return _transliterator


def _get_translator():
    """Lazily load and cache NLLB-200 (~2.4GB first run). transformers v5 has
    no 'translation' pipeline task, so drive the seq2seq model directly."""
    global _translator
    if _translator is None:
        import torch
        from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

        tokenizer = AutoTokenizer.from_pretrained(_TRANSLATION_MODEL, src_lang=_SRC_LANG)
        model = AutoModelForSeq2SeqLM.from_pretrained(_TRANSLATION_MODEL)
        bos_english = tokenizer.convert_tokens_to_ids(_TGT_LANG)

        def _translate(text: str) -> str:
            inputs = tokenizer(text, return_tensors="pt", truncation=True)
            with torch.no_grad():
                generated = model.generate(
                    **inputs,
                    forced_bos_token_id=bos_english,
                    max_new_tokens=256,
                )
            return tokenizer.batch_decode(generated, skip_special_tokens=True)[0].strip()

        _translator = _translate
    return _translator


def _transliterate_sync(text: str) -> str:
    return _get_transliterator()(text)


def _translate_sync(text: str) -> str:
    return _get_translator()(text)


async def maybe_translate_to_english(text: str) -> str:
    """Return an English rendering of Nepali text (any script), best-effort."""
    logger.info("maybe_translate_to_english called | text_len=%d", len(text))
    try:
        if not text.strip():
            return text

        if _DEVANAGARI_RE.search(text):
            devanagari = text
        else:
            devanagari = await asyncio.to_thread(_transliterate_sync, text.strip())
            logger.info(
                "transliteration done | out_len=%d changed=%s",
                len(devanagari),
                devanagari != text,
            )

        translated = await asyncio.to_thread(
            _translate_sync, devanagari[:_MAX_TRANSLATION_CHARS]
        )
        logger.info(
            "translation success | model=%s out_len=%d",
            _TRANSLATION_MODEL,
            len(translated),
        )
        return translated or text
    except Exception as exc:
        logger.exception(
            "maybe_translate_to_english failed | err=%s", type(exc).__name__
        )
        return text
