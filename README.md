# Nagar AI

AI-powered civic issue reporting and resolution system for municipalities.

## Quickstart (Docker — one command, one port)

Prereq: Docker Desktop (with WSL integration enabled) or any Docker Engine.

```bash
cd nagar-ai
cp .env.example .env                      # fill in Supabase URL + anon key
cp backend/.env.example backend/.env      # same keys + service role key
docker compose up --build
```

Then open **http://localhost:8080** (citizen app; the admin console lives at
`/admin`). That's it — no second terminal, no CORS setup. The FastAPI backend
runs inside the compose network and is proxied through the frontend.

First boot downloads ML models (~4GB) into a named Docker volume; later boots
start instantly from cache.

## Local dev (without Docker)

Two terminals, as before:

```bash
# terminal 1 — backend (models lazy-load on first use)
cd nagar-ai/backend
./venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# terminal 2 — frontend
cd nagar-ai/apps/citizen
npm run dev        # http://localhost:3000
```

## Architecture notes

- `apps/citizen` serves both the citizen site and `/admin`; `next.config.mjs`
  proxies same-origin `/api/v1/*` to `BACKEND_ORIGIN` (default
  `http://localhost:8000`, `http://backend:8000` in compose).
- Severity pipeline: zero-shot classification with Nepali->English translation
  rescue, critical-evidence escalation, and a keyboard-mash gate — see
  `backend/app/services/nlp.py`, `backend/app/services/translation.py`, and the
  decision log in `md files/DECISION_LOG.md`.
