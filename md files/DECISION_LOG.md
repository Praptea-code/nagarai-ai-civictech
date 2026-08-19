# Decision log — citizen flow

Append an entry every time you choose between two or more reasonable approaches. Do this
*before* moving to the next task, not retroactively at the end of the day. Newest entries
at the bottom.

## Format
```
### YYYY-MM-DD — <short title>
**Decision:** what you chose
**Context:** what problem you were solving
**Alternatives considered:** what else you weighed, and why you didn't pick it
**Impact:** what this affects (files, Person 2's work, the contract)
```

## Entries

### 2026-08-18 — Embedding model for duplicate detection
**Decision:** `sentence-transformers/all-MiniLM-L6-v2`, 384 dimensions
**Context:** needed a fast, free-to-run embedding model matching the `embedding
vector(384)` column already fixed in the schema
**Alternatives considered:** OpenAI `text-embedding-3-small` (1536 dims — would require
changing the schema and costs per call; rejected for a 5-day local build)
**Impact:** `nagar_ai_schema.sql`, `backend/app/services/embeddings.py`

### 2026-08-18 — Duplicate similarity threshold
**Decision:** cosine similarity >= 0.87 flags a candidate as a likely duplicate
**Context:** needed a starting threshold before real complaint data exists to tune against
**Alternatives considered:** none yet — this is a placeholder; revisit once 20+ real
complaints exist and false-positive rate can actually be checked
**Impact:** `backend/app/services/embeddings.py::find_duplicate_complaints()`
