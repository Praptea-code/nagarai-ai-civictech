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

Requires Docker and Docker Compose. `.env` (backend) and `.env.local` (citizen) still
need to exist locally exactly as described above — Compose reads them via `env_file`,
they are never baked into the image, and they're still git-ignored.

```bash
docker compose up --build
```

Backend: http://localhost:8000
Citizen app: http://localhost:3000

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
