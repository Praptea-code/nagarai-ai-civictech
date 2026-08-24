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

### 2026-08-22 — Zero-shot NLP via bart-large-mnli, severity only
**Decision:** `classify_complaint_text()` uses HF `transformers`
`pipeline("zero-shot-classification", model=HF_NLP_MODEL)` with
`facebook/bart-large-mnli`; classifies severity against ["low","medium","high","critical"]
only; summary is a first-sentence extraction truncated to 200 chars rather than a second
summarization model; pipeline loads lazily on first call and is cached module-level.
**Context:** Needed real severity classification per ENVIRONMENT_SETUP's HF_NLP_MODEL;
category is citizen-supplied now so NLP must not produce one; a summarization model would
double model weight/memory for marginal quality at this stage.
**Alternatives considered:** Full summarization model (rejected — extra ~1GB+ weights and
latency); loading the pipeline at import time (rejected — slows container boot and breaks
any import-time test without weights).
**Impact:** `backend/app/services/nlp.py`, `backend/requirements.txt`
(transformers/torch added).

### 2026-08-22 — Storage layout: complaint-images/{year}/{month}/ via service-role key
**Decision:** Evidence images upload to bucket `complaint-images` at object path
`{year}/{month}/{complaint_id}.{ext}` (UTC upload date; extension from content-type,
default jpg). All backend Supabase access uses the shared service-role client from
`db.py`; the anon key stays frontend-only.
**Context:** Matches the function inventory in ARCHITECTURE_CITIZEN_FLOW.md and the env
contract in ENVIRONMENT_SETUP.md (`SUPABASE_SERVICE_ROLE_KEY`, backend only).
**Alternatives considered:** Per-complaint flat paths (poor browseability); client-side
uploads direct to Storage with anon key (rejected — bypasses backend validation of size/
type and complicates RLS).
**Impact:** `backend/app/services/storage.py`, `backend/app/core/config.py` (Settings now
mirror .env names incl. SUPABASE_SERVICE_ROLE_KEY; stale OPENAI_API_KEY removed),
`backend/app/services/db.py`. Requires the public `complaint-images` bucket to exist.

### 2026-08-22 — Dedup: MiniLM embeddings + pgvector search exposed as SQL RPC
**Decision:** `generate_embedding()` runs `sentence-transformers/all-MiniLM-L6-v2`
(normalized, asserted 384-dim). `find_duplicate_complaints()` calls a new SQL function
`public.find_duplicate_complaints(query_embedding vector(384), similarity_threshold)`
added to `nagar_ai_schema.sql`, computing similarity as `1 - cosine_distance(<=>)`,
threshold 0.87 per the 2026-08-18 decision, top-5 ordered by similarity.
**Context:** supabase-py/PostgREST cannot express pgvector operators directly, so an RPC
is the only way to keep using the existing supabase client (consistency with db.py)
without adding a raw Postgres driver/connection string.
**Alternatives considered:** Direct psycopg/asyncpg connection (rejected — new driver,
new DATABASE_URL secret, drift from db.py); fetching all embeddings and computing
cosine in Python (rejected — defeats pgvector/indexing, won't scale).
**Impact:** `backend/app/services/embeddings.py`, `backend/requirements.txt`
(sentence-transformers added), `nagar_ai_schema.sql` (+1 function — must be applied to
the live Supabase project before dedup works end to end).

### 2026-08-22 � JWT validation delegated to Supabase Auth (GoTrue), not local decode
**Decision:** `require_citizen()` in the citizen router validates the
`Authorization: Bearer` token by calling `supabase.auth.get_user(token)` (offloaded to a
worker thread). Missing/malformed header and invalid/expired tokens both yield 401 with
`WWW-Authenticate: Bearer`; ownership failures later yield 403 per the contract.
**Context:** supabase-py has no offline verify helper, and local PyJWT verification would
need either the shared HS256 secret or JWKS support � neither available in `.env`.
GoTrue already performs authoritative signature, expiry and revocation checks.
**Alternatives considered:** Local PyJWT + JWT secret env var (rejected � new secret to
distribute/rotate, duplicates GoTrue logic); decoding without verification (rejected �
insecure).
**Impact:** `backend/app/routers/citizen.py`. One extra HTTP round trip per request
(~100-200ms); acceptable at current scale.

### 2026-08-22 � RLS-scoped reads via anon-key client; service-role only for trusted writes
**Decision:** List/get queries run through a fresh per-request client built from
`SUPABASE_ANON_KEY` with the citizen's JWT set via `postgrest.auth()`, so Postgres RLS
actually scopes rows. Writes in the submission pipeline (`save_complaint`) use the
service-role client. In `get_complaint`, when the RLS-scoped fetch misses, one existence
probe under the trusted client distinguishes 403 (exists but foreign) from 404.
**Context:** The status-history insert policy is admin-only by schema, so a citizen-JWT
write path can never persist the initial history row � the backend is therefore the
trusted write boundary and takes `citizen_id` exclusively from the verified JWT, never
from form data. A fresh client per request is required because supabase-py's
`postgrest.auth()` mutates shared header state and is unsafe across concurrent requests.
**Alternatives considered:** Service-role reads with manual citizen_id filtering
(rejected for list/get � task requires RLS to genuinely apply); changing RLS so citizens
may insert history rows (rejected � weakens admin-only audit trail invariant).
**Impact:** `backend/app/core/config.py` (+SUPABASE_ANON_KEY), backend `.env` (anon key
added locally), `backend/app/services/db.py` (citizen_client factory),
`backend/app/routers/citizen.py`. Existence probe reveals whether a complaint id exists
to non-owners; ids are UUIDs (unguessable) so this leaks nothing practical.

### 2026-08-22 � CORS middleware for the citizen SPA origin
**Decision:** `main.py` adds FastAPI `CORSMiddleware` allowing GET/POST with
Authorization/Content-Type headers from origins listed in the new `CORS_ORIGINS`
setting (comma-separated, default `http://localhost:3000`). No credentials mode �
auth is bearer tokens in a header, never cookies.
**Context:** The first real browser test of the submission flow (headless Edge against
the live backend) exposed that every POST from the SPA died at preflight:
`OPTIONS /api/v1/complaints -> 405`, so the browser silently blocked the request. All
earlier backend verification used non-browser clients (httpx), which skip CORS entirely.
**Alternatives considered:** Proxying API calls through Next.js rewrites to keep
everything same-origin (rejected for now � extra moving part; revisit for production);
allow_origins=["*"] (rejected � sloppy default even with token auth).
**Impact:** `backend/app/main.py`, `backend/app/core/config.py`. Production must set
CORS_ORIGINS to the deployed citizen origin(s).

### 2026-08-22 - Description length cap of 2000 characters
**Decision:** Complaint descriptions are capped at `MAX_DESCRIPTION_LENGTH = 2000`
(defined once in `backend/app/models/complaint.py`, imported by the router's Form
declaration and mirrored client-side in `apps/citizen/app/submit/page.tsx`).
**Context:** Day-4 task called for a "reasonable max length". Typical field reports are
a few sentences; 2000 chars (~300 words) is generous for a pothole report while keeping
NLP/embedding input bounded and DB rows small. The cap is enforced identically on
client (textarea maxLength + JS check) and server (FastAPI Form constraint -> default
422 shape), with a whitespace-only blank check alongside it.
**Alternatives considered:** 500 chars (rejected - risks truncating legitimate detail);
no limit but truncating before NLP (rejected - silently altering citizen input is worse
than asking them to shorten it).
**Impact:** Server rejects >2000 or whitespace-only descriptions with FastAPI's default
422 validation shape; client blocks submission before any network call.

### 2026-08-22 - Severity confidence floor of 0.5; low-confidence severity stored as null
**Decision:** `SEVERITY_CONFIDENCE_FLOOR = 0.5` in `backend/app/services/nlp.py`. When
the zero-shot classifier's top-label score is below the floor, `severity` is stored as
null (and returned null to the client) so admin triage decides instead of acting on a
guess. `ai_confidence` still stores the raw score either way.
**Context:** TASKS_PERSON1 Day 4 asks for a confidence floor on NLP output. It phrases
this as leaving *category* null, but category is citizen-supplied and validated against
the enum per DECISION_LOG 2026-08-22 - it is never guessed by NLP. Severity is the only
model-derived field, so it is the one that gets nulled. The floor value: random
baseline for 4 labels is ~0.25; bart-large-mnli's confident scores on this label set
typically land 0.4-0.9, so 0.5 separates "meaningful signal" from "coin flip" without
nulling most real submissions.
**Alternatives considered:** 0.35 floor (rejected - too close to baseline, passes
garbage through); 0.7 (rejected - would null a large share of legitimate
classifications); asking NLP for category too when citizen text is ambiguous (rejected -
contradicts the citizen-supplied-category decision).
**Impact:** `severity: string | null` in the 201 response (contract already types it
nullable); complaints table already allows null severity; no client change needed - the
tracker UI never renders severity.

### 2026-08-22 - CONTRACT CHANGE: single image -> multiple images (max 5)
**Decision:** POST /api/v1/complaints accepts an optional `images` multipart file
array (jpeg/png only, max 8MB each, max 5 files) instead of a single `image` file.
The 201 response and GET /complaints/{id} now return `image_urls: string[]` instead
of `image_url: string`. Empty array when no photos were submitted.
**Person 2 action required:** the admin dashboard must switch from reading
`image_url` (string) to `image_urls` (string array) wherever it displays complaint
evidence. Any complaint created after this change will NOT have the old field, and
the new field is always an array - render every entry or take image_urls[0].
**Context:** Citizens often attach several angles of the same pothole/leak; forcing
one photo loses evidence. The complaint_images table was already one-row-per-photo,
so this aligns the API with the schema. Max count (5) and per-file size (8MB) are
assumptions pending review, not values from any existing doc. A failed file rejects
the whole request with 422 rather than silently dropping it.
**Impact:** `backend/app/models/complaint.py`, `backend/app/services/storage.py`
(per-object slot suffix), `backend/app/services/db.py`, `backend/app/routers/citizen.py`,
`apps/citizen/lib/api.ts`, submit form, tracker detail page. Old complaints keep their
single row and are served as a one-element array.

### 2026-08-24 - Translate-and-retry for low-confidence severity (Nepali support)
**Decision:** When the zero-shot severity score lands under SEVERITY_CONFIDENCE_FLOOR,
retry once through a Nepali->English translation path: Latin-script text is
transliterated to Devanagari with `indic-transliteration` (ITRANS), then translated with
`facebook/nllb-200-distilled-600M`; keep whichever reading (original vs translated) has
the higher confidence. If still under the floor, behaviour is unchanged (severity=null).
Citizen UI shows an "AI triage pending" chip where it previously hid null severity.
**Context:** bart-large-mnli is English-trained; romanized-Nepali complaints ("nitya le
dillibazar ko pul choryo") scored 0.49 -> null. The same text through translate+retry
scores 0.97 high.
**Alternatives considered:** Helsinki opus-mt-ne-en (does not exist publicly); ai4bharat
XlitEngine transliterator (rejected - depends on fairseq, which cannot import on Python
3.12); multilingual zero-shot model swap (rejected - slower, weaker Nepali coverage than
NLLB, and would re-tune every threshold); lowering the confidence floor (rejected -
admits guesses by design decision 2026-08-22).
**Impact:** `backend/app/services/translation.py` (new), `backend/app/services/nlp.py`
(_classify_once helper + retry), `backend/requirements.txt` (+indic-transliteration),
`apps/citizen/app/(site)/my-complaints/page.tsx`. No API contract change - 201 response
shape untouched, severity stays nullable. First rescue request loads NLLB (~2.4GB,
cached afterwards).

### 2026-08-24 - Critical escalation on harm evidence; unparseable input defaults to low
**Decision:** Three changes to severity classification. (1) If the text explicitly mentions
concrete harm - accidents, injuries, deaths (English, romanized Nepali, or Devanagari) -
a medium/high model reading escalates to critical via `_CRITICAL_EVIDENCE_RE`. (2) Text
still under the confidence floor after the translation retry defaults to severity="low"
instead of null. (3) A `_looks_like_language` heuristic gate (distinct-letter count,
vowel ratio, repeated-character runs) forces severity="low" for keyboard-mash input
regardless of model confidence, and skips the translation rescue for it.
**Context:** Zero-shot NLI anchors on hazard type and ignores past casualties:
"pothole...3 major accidents because of it" read high @0.99 with critical @0.005, and
re-wording the critical hypothesis moved it to only 0.066 - unusable. Deterministic
keyword escalation is transparent and tunable. The null default confused citizens whose
reports showed no severity at all ("vhj" -> nothing rendered). Noise cannot simply be
floored either: "mmmmmmmmmookoioko" scored 0.5105 and "a" scored 0.53 - keyboard mash
hovers right at the 0.5 boundary, so a deterministic language gate is required on every
path, not just under-floor ones.
**Alternatives considered:** Reworded critical hypotheses (tested 3 variants - model
ignores them); LLM-based severity (no API budget); dictionary wordlist validation
(no bundled dictionary, brittle for romanized Nepali); leaving null for admin triage
(rejected per product call that every report should show something).
**Impact:** `backend/app/services/nlp.py`, `backend/app/services/translation.py`
(public `has_devanagari()` helper). Escalation applies to medium/high only (a
genuinely-low report mentioning an accident stays low). The admin `severity=none` filter
becomes a legacy queue for old rows. Old null rows keep their value.
