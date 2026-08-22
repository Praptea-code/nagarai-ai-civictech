# Nagar AI — Citizen Flow Agent Instructions

You are the engineering agent responsible for **Person 1's scope only**: the
citizen-facing side of Nagar AI, an AI-powered civic infrastructure reporting platform.

Read this file first, every session, before writing any code. It is short on purpose —
each rule below points to a longer doc. Read that doc before the relevant work, not all
of them upfront.

## Your scope — do not go outside this
You own, end to end:
- Citizen authentication (signup/login) via Supabase Auth
- Complaint submission form (text + photo)
- `POST /complaints` and other citizen-facing FastAPI endpoints
- NLP classification of complaint text
- Photo upload to Supabase Storage
- Citizen selects a complaint category from a fixed list at submission time
- Duplicate complaint detection (embeddings + pgvector)
- The citizen's "my complaints" status tracker

You do NOT own: the admin dashboard, department assignment, the predictive risk model,
or any admin-only endpoint. Those belong to Person 2. Do not create, edit, or delete
files under `apps/admin/` or `backend/app/routers/admin.py` unless explicitly told to.

## Tech stack — use exactly this, do not substitute
| Layer | Technology |
|---|---|
| Frontend | Next.js (App Router) + TypeScript + Tailwind CSS |
| Backend | FastAPI + Pydantic v2 + Python 3.11+ |
| Auth, DB, Storage | Supabase (Postgres, Supabase Auth, Supabase Storage) |
| NLP | Hugging Face `transformers` — zero-shot classification |
| Embeddings / dedup | `sentence-transformers` (`all-MiniLM-L6-v2`, 384 dims) + `pgvector` |
| Package managers | `npm` (frontend), `pip` + `venv` (backend) |
| Containerization | Docker — `backend/` and `apps/citizen/` only; `apps/admin/` is Person 2's own service definition, coordinate before editing `docker-compose.yml` |

If a task seems to need a different framework, ORM, CSS library, or model family, stop
and log the reason in `docs/DECISION_LOG.md` before switching — don't substitute quietly.

## Non-negotiable rules
1. **Git.** Follow `docs/GIT_WORKFLOW.md` exactly. You work in exactly one branch,
   `feature/citizen-flow`. You never touch `main`. Re-read it before your first commit
   of each session.
2. **Logging.** Follow `docs/LOGGING.md`. Every function you write gets entry, exit, and
   error logs. No exceptions, including trivial helpers.
3. **Decisions.** Follow `docs/DECISION_LOG.md`. Any time you choose between two
   reasonable approaches, pick one and append an entry explaining why — before moving to
   the next task, not at the end of the day.
4. **Contract.** The shapes in `docs/API_CONTRACT.md` and `nagar_ai_schema.sql` are
   fixed. If a task requires changing either, stop, log the proposed change as a
   decision, and flag it — Person 2 builds against the same contract.
5. **Secrets.** Never commit `.env`, `.env.local`, or any Supabase key. Confirm
   `.gitignore` covers them before your first commit — see `docs/ENVIRONMENT_SETUP.md`.
6. **Scope.** If a task isn't in `docs/TASKS_PERSON1_CITIZEN.md`, don't do it without
   asking. Don't refactor Person 2's files "while you're in there."

## Where everything lives
- `docs/GIT_WORKFLOW.md` — branch, commit, pull/push rules
- `docs/ARCHITECTURE_CITIZEN_FLOW.md` — system design + function flow diagrams
- `docs/API_CONTRACT.md` — exact endpoint request/response shapes
- `docs/TASKS_PERSON1_CITIZEN.md` — the ordered task list, day by day
- `docs/LOGGING.md` — runtime logging standard for every function
- `docs/DECISION_LOG.md` — running log of every non-trivial decision (you append to this)
- `docs/ENVIRONMENT_SETUP.md` — env vars, local setup, how to run
- `nagar_ai_schema.sql` — the database schema, source of truth

## Definition of done for any task
- [ ] Code works locally and matches `docs/API_CONTRACT.md` exactly
- [ ] Every new function has logging per `docs/LOGGING.md`
- [ ] Any non-obvious choice is recorded in `docs/DECISION_LOG.md`
- [ ] Changes are committed following `docs/GIT_WORKFLOW.md` (correct branch, message format)
- [ ] No secrets, no stray `console.log`/`print` debugging, no commented-out dead code
