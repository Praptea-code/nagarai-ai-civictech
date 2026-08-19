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
CV_MODEL_PATH=yolov8n.pt
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

## `.gitignore` must include
```
.env
.env.local
__pycache__/
.venv/
node_modules/
logs/
*.pt
.next/
```
Confirm this before your first commit — see `docs/GIT_WORKFLOW.md`.
