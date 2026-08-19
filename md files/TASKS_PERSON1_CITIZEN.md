# Task list — Person 1 (citizen flow)

Work top to bottom. Do not start a task before the previous one is committed and pushed
per `docs/GIT_WORKFLOW.md`. Check off each item as you complete it.

## Day 1 — foundations
- [ ] Read `CLAUDE.md`, `docs/GIT_WORKFLOW.md`, `docs/API_CONTRACT.md`, `nagar_ai_schema.sql`
- [ ] Create `feature/citizen-flow` branch (see `GIT_WORKFLOW.md`)
- [ ] Scaffold Next.js app in `apps/citizen/` (App Router, TypeScript, Tailwind):
      `npx create-next-app@latest apps/citizen --typescript --tailwind --app`
- [ ] Install Supabase JS client: `npm install @supabase/supabase-js`
- [ ] Scaffold FastAPI app in `backend/` if it doesn't exist yet (`app/main.py`,
      `app/routers/citizen.py`, `app/services/`)
- [ ] Set up `.env.local` (frontend) and `.env` (backend) per
      `docs/ENVIRONMENT_SETUP.md`; confirm both are in `.gitignore`
- [ ] Write a throwaway script testing Hugging Face zero-shot classification
      (`facebook/bart-large-mnli`) against 3 sample complaint texts — confirm the output
      shape before building the real service
- [ ] Commit: `chore(setup): scaffold citizen app and backend skeleton`

## Day 2 — submission pipeline goes live
- [ ] Build `backend/app/services/nlp.py::classify_complaint_text()` using the model
      confirmed on Day 1. Log the model choice in `docs/DECISION_LOG.md`.
- [ ] Build `backend/app/services/storage.py::upload_complaint_image()` — uploads to the
      Supabase Storage bucket `complaint-images/{year}/{month}/`, returns a public URL
- [ ] Build `backend/app/routers/citizen.py::create_complaint()` exactly per
      `docs/API_CONTRACT.md` — wire NLP + storage in
- [ ] Build the citizen submission form: `apps/citizen/app/submit/page.tsx` —
      description textarea, optional photo upload, geolocation capture
      (`navigator.geolocation`, with manual lat/lng entry as a fallback)
- [ ] Build `apps/citizen/lib/api.ts::submitComplaint()`
- [ ] Manual test: submit a real complaint end to end, confirm it lands in Supabase with
      AI-generated category/severity/summary
- [ ] Commit + push (one commit per function/component — see `GIT_WORKFLOW.md`)

## Day 3 — CV, duplicate detection, status tracker
- [ ] Build `backend/app/services/cv.py::detect_issue_in_image()` using pretrained
      YOLOv8n (`ultralytics`) — general object detection, do not fine-tune unless Day 3
      finishes early
- [ ] Build `backend/app/services/embeddings.py::generate_embedding()` using
      `sentence-transformers/all-MiniLM-L6-v2` (384-dim, matches the schema)
- [ ] Build `backend/app/services/embeddings.py::find_duplicate_complaints()` — pgvector
      cosine similarity query, threshold configurable, default 0.87
- [ ] Wire CV + embeddings + dedup into `create_complaint()`
- [ ] Build `apps/citizen/app/my-complaints/page.tsx` — list + detail view with status
      history and a duplicate warning banner where applicable
- [ ] Build `backend/app/routers/citizen.py::list_my_complaints()` and `get_complaint()`
- [ ] Commit + push

## Day 4 — polish and edge cases
- [ ] Handle submission without a photo gracefully (CV step skipped, not errored)
- [ ] Handle low-confidence NLP/CV results — don't force a category below a confidence
      floor; leave `category = null` for admin triage instead of guessing
- [ ] Add duplicate-warning UI: "This looks similar to an existing report," linking to
      the original, but still lets the citizen submit if they confirm it's different
- [ ] Add client-side and server-side validation (required fields, lat/lng bounds, image
      size/type limits per `docs/API_CONTRACT.md`)
- [ ] Commit + push

## Day 5 — integration and deploy
- [ ] Run a full end-to-end test with Person 2: citizen submits, admin sees it
      (coordinate timing via the Day 5 sync checkpoint)
- [ ] Fix any contract mismatches found during integration — log each one in
      `docs/DECISION_LOG.md`
- [ ] Deploy `apps/citizen/` (Vercel or the agreed host)
- [ ] Spot-check `docs/LOGGING.md` compliance across all citizen-scope functions
- [ ] Final commit + push, open a PR into `main`
