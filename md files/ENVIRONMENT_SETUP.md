# Environment setup — citizen flow

## Required accounts / access
- Supabase project (URL + anon key + service role key) — get these from Person 2 or the
  shared project owner. Do not create a second Supabase project.
- No Hugging Face account is needed for the models listed below (none are gated).

## Backend `.env` (never commit this file)
```
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>   # backend only, full access — never expose to frontend
HF_NLP_MODEL=facebook/bart-large-mnli
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
LOG_LEVEL=INFO
```

## Frontend `.env.local` (never commit this file)
```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>       # safe for the client, RLS protects the data
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
```

## Root `.env` (docker compose build args — never commit this file)

A third env file must exist at the project root, next to `docker-compose.yml`,
**before** running `docker compose up --build`. Copy the template:

```bash
cp .env.example .env    # from the nagar-ai/ root, then fill in real values
```

The citizen image is a production Next.js build (`npm run build`), and
`NEXT_PUBLIC_*` variables are inlined into the client bundle at **build time**,
not runtime. Compose therefore reads these two values from this file and passes
them to `docker build` as build args:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

These are the same public client-side values as in `apps/citizen/.env.local`.
They are safe for the browser (RLS protects the data), but if this file is
missing at image build time every Supabase call in the built app fails.

## Local run

Backend:
```bash
cd backend
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Frontend:
```bash
cd apps/citizen
npm install
npm run dev
```

## Local run (Docker)

Requires Docker and Docker Compose. Three local files are needed, all git-ignored:
- `backend/.env` — read by Compose via `env_file`; never baked into the image.
- `apps/citizen/.env.local` — not used by Compose; only needed for `npm run dev`.
- `.env` (project root) — **required**: supplies the citizen production build
  args (see section above).

```bash
docker compose up --build
```

Citizen app (also serves /admin): http://localhost:8080 — the only published
port. The backend is not exposed to the host; API calls go to
http://localhost:8080/api/v1, which next.config.mjs proxies to the backend
container.

Rebuild after changing `requirements.txt` or `package.json`:
```bash
docker compose up --build
```
Rebuild after pulling changes from another contributor if either file changed — a stale
image is the most common Docker-related bug on a shared repo, not a git problem.

## `.gitignore` must include
```
.env
.env.local
__pycache__/
.venv/
node_modules/
logs/
.next/
```
Confirm this before your first commit — see `docs/GIT_WORKFLOW.md`.
