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

### 2026-08-22 — Drop computer vision, citizen selects category manually
**Decision:** Remove the YOLOv8 CV pipeline entirely. The citizen selects the complaint
category from a fixed dropdown at submission time; the uploaded photo is stored as
evidence only and is not processed by any model.
**Context:** CV auto-detection added complexity (model weights, confidence thresholds,
category-source conflicts with NLP) without a clear accuracy bar for a 5-day build, and
manual selection is more reliable for the categories in scope.
**Alternatives considered:** Keeping CV as a suggestion the citizen could accept or
override — rejected as extra UI/scope for marginal benefit given the timeline.
**Impact:** `nagar_ai_schema.sql` (`complaint_images` loses `cv_label`/`cv_confidence`,
`complaints.category` becomes `not null`), `docs/API_CONTRACT.md` (new required
`category` request field), `docs/ARCHITECTURE_CITIZEN_FLOW.md`, `opencode.md`,
`docs/TASKS_PERSON1_CITIZEN.md`, `docs/ENVIRONMENT_SETUP.md`, `docs/GIT_WORKFLOW.md`,
`backend/app/services/cv.py` (deleted), `backend/app/services/nlp.py` (no longer returns
category).

### 2026-08-22 — Add Docker for backend and citizen frontend
**Decision:** Containerize `backend/` (FastAPI) and `apps/citizen/` (Next.js) via
individual Dockerfiles and a root `docker-compose.yml`. Supabase remains hosted/external
and is not containerized. The admin service is intentionally left out of
`docker-compose.yml` pending coordination with Person 2.
**Context:** Wanted a consistent local dev environment across both contributors'
machines and a path to containerized deploy.
**Alternatives considered:** Running bare-metal only (kept as a documented fallback in
`ENVIRONMENT_SETUP.md` rather than removed, since it's simpler for quick iteration).
**Impact:** `backend/Dockerfile`, `backend/.dockerignore`, `apps/citizen/Dockerfile`,
`apps/citizen/.dockerignore`, `docker-compose.yml`, `docs/ENVIRONMENT_SETUP.md`,
`PROJECT_STRUCTURE.txt`, `opencode.md`, `docs/GIT_WORKFLOW.md`.
