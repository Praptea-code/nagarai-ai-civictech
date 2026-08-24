"""Pre-download ML models at container start so API requests never wait on a
multi-GB download. Runs as the Docker ENTRYPOINT before uvicorn; the HuggingFace
cache directory should be a mounted volume (hf-cache) so this is a no-op after
the first boot.

Local bare-metal dev does not need this script — models lazy-load on first use.
"""

import os
import sys

HF_NLP_MODEL = os.environ.get("HF_NLP_MODEL", "facebook/bart-large-mnli")
EMBEDDING_MODEL = os.environ.get(
    "EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2"
)
TRANSLATION_MODEL = "facebook/nllb-200-distilled-600M"


def main() -> None:
    from sentence_transformers import SentenceTransformer
    from transformers import (
        AutoModelForSeq2SeqLM,
        AutoTokenizer,
        pipeline,
    )

    print(f"[prefetch] zero-shot classifier: {HF_NLP_MODEL}", flush=True)
    pipeline("zero-shot-classification", model=HF_NLP_MODEL)

    print(f"[prefetch] embedding model: {EMBEDDING_MODEL}", flush=True)
    SentenceTransformer(EMBEDDING_MODEL)

    print(f"[prefetch] translation model: {TRANSLATION_MODEL}", flush=True)
    AutoTokenizer.from_pretrained(TRANSLATION_MODEL, src_lang="nep_Npan")
    AutoModelForSeq2SeqLM.from_pretrained(TRANSLATION_MODEL)

    print("[prefetch] all models cached", flush=True)


if __name__ == "__main__":
    main()
    # With exec-form ENTRYPOINT + CMD, Docker passes the server command (CMD)
    # to this script as argv. Replace this process with it via execvp so
    # uvicorn inherits PID 1 signal handling; without this the script exits
    # after prefetching and the container never serves any traffic.
    if len(sys.argv) > 1:
        os.execvp(sys.argv[1], sys.argv[1:])
