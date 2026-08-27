# NagarAI

AI-powered civic issue reporting and resolution system for municipalities in Nepal. Citizens report local infrastructure problems (potholes, garbage, water leakage, streetlights, flooding, etc.), and the system uses AI to automatically classify severity, detect duplicates, and route complaints to the correct department.

## Features

- **Citizen Complaint Submission** — Report issues with descriptions, GPS coordinates, and up to 5 evidence photos
- **AI Severity Classification** — Zero-shot NLP model automatically determines complaint severity (low / medium / high / critical)
- **Nepali Language Support** — Romanized Nepali is transliterated to Devanagari, translated to English for classification
- **Critical Evidence Escalation** — Detects mentions of accidents, injuries, or deaths and auto-escalates severity
- **Duplicate Detection** — Vector similarity search flags likely duplicate complaints (threshold >= 0.87)
- **Keyboard-Mash Gate** — Heuristic detects nonsensical input and forces severity to low
- **Image Evidence Upload** — Photos stored in Supabase Storage with time-keyed paths
- **Citizen Complaint Tracker** — View your own complaints and full status history
- **Admin Dashboard** — View all complaints, filter by status/category/severity, update status, assign departments
- **Role-Based Access Control** — Citizen and admin roles enforced via Supabase Row Level Security
- **Audit Trail** — Every status change is recorded with admin user ID and optional notes

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS |
| Backend | Python 3.11+, FastAPI, Pydantic |
| ML / AI | Hugging Face Transformers (BART-MNLI, NLLB-200), Sentence Transformers, PyTorch |
| Database | PostgreSQL (Supabase) with pgvector extension |
| Auth | Supabase Auth (email/password) |
| Storage | Supabase Storage (S3-compatible) |
| Containerization | Docker + Docker Compose |

## Prerequisites

- **Docker Desktop** with WSL integration (for Docker setup), OR
- **Python 3.11+**, **Node.js 20+**, and **npm** (for local dev)
- A **Supabase project** — you need the project URL, anon key, and service role key

## Setup

### 1. Get Supabase Credentials

Create a project at [supabase.com](https://supabase.com) and grab:

| Variable | Description |
|---|---|
| `SUPABASE_URL` | e.g. `https://your-project.supabase.co` |
| `SUPABASE_ANON_KEY` | Safe for browser use (RLS-protected) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only secret — never expose to frontend |

### 2. Apply the Database Schema

Run the contents of `nagar-ai/docs/nagar_ai_schema.sql` in the **Supabase SQL Editor**. This creates all tables, enums, triggers, RLS policies, and seed data.

### 3. Run the Application

#### Docker (recommended)

```bash
cd nagar-ai
cp .env.example .env                      # fill in Supabase URL + anon key
cp backend/.env.example backend/.env      # same keys + service role key
docker compose up --build
```

Open **http://localhost:8080** (citizen app; admin console at `/admin`).

First boot downloads ML models (~4GB) into a named Docker volume; subsequent boots start from cache.

#### Local Development (without Docker)

```bash
# Terminal 1 — Backend
cd nagar-ai/backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/Mac:
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2 — Frontend
cd nagar-ai/apps/citizen
npm install
npm run dev
```

- Frontend: **http://localhost:3000**
- Backend API docs: **http://localhost:8000/docs** (Swagger UI)
- Health check: **http://localhost:8000/health**

## Environment Variables

Three `.env` files need to be configured (all git-ignored):

**Root `.env`** (`nagar-ai/.env`) — Docker Compose build args:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Backend `.env`** (`nagar-ai/backend/.env`) — server-side secrets:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
HF_NLP_MODEL=facebook/bart-large-mnli
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
LOG_LEVEL=INFO
CORS_ORIGINS=http://localhost:3000,http://localhost:8080
```

**Frontend `.env.local`** (`nagar-ai/apps/citizen/.env.local`) — client-side values:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
```

No external API keys (e.g., OpenAI) are needed. All ML models run locally via Hugging Face / PyTorch.

## Project Structure

```
NagarAI/
├── README.md
├── .gitignore
├── md files/                          # Development documentation
│   ├── API_CONTRACT.md
│   ├── ARCHITECTURE_CITIZEN_FLOW.md
│   ├── DECISION_LOG.md
│   ├── ENVIRONMENT_SETUP.md
│   ├── GIT_WORKFLOW.md
│   └── LOGGING.md
│
└── nagar-ai/                          # Main application
    ├── docker-compose.yml
    ├── .env.example
    │
    ├── docs/
    │   ├── API_CONTRACT.md
    │   ├── nagar_ai_schema.sql
    │   └── PROJECT_STRUCTURE.txt
    │
    ├── backend/                       # FastAPI backend
    │   ├── app/
    │   │   ├── main.py
    │   │   ├── core/
    │   │   ├── routers/
    │   │   ├── services/              # NLP, embeddings, translation, storage, DB
    │   │   ├── models/
    │   │   └── utils/
    │   ├── requirements.txt
    │   ├── Dockerfile
    │   └── .env.example
    │
    └── apps/
        └── citizen/                   # Next.js citizen + admin app
            ├── app/
            │   ├── (site)/            # Citizen-facing pages
            │   ├── admin/             # Admin console
            │   └── api/
            ├── components/
            ├── lib/                   # Supabase client, API helpers, auth
            ├── package.json
            ├── Dockerfile
            └── .env.local
```

## API Overview

The backend exposes a REST API at `/api/v1/`:

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/complaints` | Submit a new complaint with optional images |
| `GET` | `/complaints` | List complaints (filtered by role) |
| `GET` | `/complaints/{id}` | Get complaint details |
| `GET` | `/complaints/{id}/history` | Get status change history |
| `PATCH` | `/complaints/{id}` | Update complaint status (admin) |
| `GET` | `/complaints/{id}/images` | Get complaint images |
| `GET` | `/admin/dashboard` | Dashboard statistics |
| `GET` | `/admin/complaints` | List all complaints (admin) |

Full API contract: [`nagar-ai/docs/API_CONTRACT.md`](nagar-ai/docs/API_CONTRACT.md)

## Documentation

| Document | Description |
|---|---|
| [API Contract](nagar-ai/docs/API_CONTRACT.md) | Full REST API specification |
| [Architecture Flow](md%20files/ARCHITECTURE_CITIZEN_FLOW.md) | Layer diagrams and Mermaid flow diagrams |
| [Decision Log](md%20files/DECISION_LOG.md) | 12 technical decision records |
| [Environment Setup](md%20files/ENVIRONMENT_SETUP.md) | Detailed env setup instructions |
| [Git Workflow](md%20files/GIT_WORKFLOW.md) | Branching model and commit conventions |
| [Logging](md%20files/LOGGING.md) | Logging standards for backend and frontend |
| [Database Schema](nagar-ai/docs/nagar_ai_schema.sql) | Complete PostgreSQL DDL, triggers, RLS, seed data |
