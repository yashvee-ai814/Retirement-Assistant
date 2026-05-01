# Retirement Assistant

A RAG-powered agentic assistant for UK retirement and pension guidance. Users log in by username, their financial profile is persisted in PostgreSQL, and a LangGraph agent combines document retrieval (Chroma) with deterministic financial calculations to answer questions.

## What it does

- **User authentication** — login by username; profile persisted in PostgreSQL
- **RAG document search** — pension policy PDFs ingested into Chroma vector store; sources cited with filename, page, and excerpt
- **Agentic tool selection** — LangGraph agent picks the right tool (RAG, profile DB, or 7 financial calculators)
- **Deterministic math** — all projections use hardcoded financial formulas
- **Human-in-the-loop** — tool approval before every non-trivial tool call
- **Multi-turn persistence** — conversation history survives page refreshes (stored in PostgreSQL)
- **Admin UI** — upload pension PDFs via drag-and-drop; view chunk counts and ingestion status

---

## Architecture

```
Browser :5173  →  React + Vite + Tailwind
                       ↓ POST /chat, GET /sessions, PUT /users/{id}/profile …
FastAPI :8000  →  LangGraph Agent
                       ↓ Tool calls
                  ┌─────────────────────────────┐
                  │  search_pension_documents    │ → Chroma :8001
                  │  get/update_user_profile     │ → PostgreSQL :5432
                  │  calculate_projected_pot     │ ─┐
                  │  calculate_drawdown_income   │  │ Pure Python math
                  │  calculate_monthly_savings   │  │
                  │  calculate_shortfall         │  │
                  │  calculate_readiness_score   │  │
                  │  calculate_inflation_goal    │  │
                  │  get_uk_state_pension_info   │ ─┘
                  │  ask_human                   │ → interrupt()
                  └─────────────────────────────┘
                  LLM: Ollama gpt-oss:120b-cloud (Mac host :11434)
```

### Service ports

| Service  | Port | Description                          |
|----------|------|--------------------------------------|
| frontend | 5173 | React dev server (Vite)              |
| backend  | 8000 | FastAPI REST API                     |
| chroma   | 8001 | Vector store (Chroma HTTP server)    |
| postgres | 5432 | Relational DB (users, sessions, docs)|
| pgadmin  | 5050 | pgAdmin 4 web UI                     |
| ollama   | 11434| LLM runtime on Mac host              |

---

## Prerequisites

- Docker Desktop installed and running
- Ollama installed on Mac: `brew install ollama`
- Models pulled:
  ```bash
  ollama pull nomic-embed-text
  ollama pull gpt-oss:120b-cloud
  ```

---

## How to run (Docker)

```bash
# Step 1 — start Ollama on your Mac
ollama serve

# Step 2 — build and start all services
docker compose up --build

# Step 3 — open the app
open http://localhost:5173
```

**pgAdmin:** http://localhost:5050 — login: `admin@retirement.local` / `admin`
Add server: host=`postgres`, user=`retirement`, password=`retirement`

---

## Local dev (no Docker)

```bash
# Tab 1 — Ollama
ollama serve

# Tab 2 — Start PostgreSQL + Chroma via Docker only
docker compose up postgres chroma -d

# Tab 3 — Backend
cd backend
uv sync
uv run uvicorn app.main:app --reload

# Tab 4 — Frontend
cd frontend
npm install
npm run dev
```

---

## Ingesting pension PDFs

Place any `.pdf` files in `backend/app/data/docs/` before starting the backend.
They will be automatically ingested into Chroma on startup.

You can also upload PDFs via the Admin page in the UI (Sidebar → Documents).

---

## API endpoints

| Method | Path                      | Description                           |
|--------|---------------------------|---------------------------------------|
| GET    | `/health`                 | Health check + active model           |
| POST   | `/auth/login`             | Login / register by username          |
| GET    | `/auth/me`                | Get current user                      |
| GET    | `/users/{id}/profile`     | Fetch financial profile               |
| PUT    | `/users/{id}/profile`     | Update financial profile              |
| POST   | `/chat`                   | Send message or resume interrupt      |
| GET    | `/sessions`               | List sessions for a user              |
| DELETE | `/sessions/{id}`          | Delete a session                      |
| POST   | `/admin/documents`        | Upload and ingest a PDF               |
| GET    | `/admin/documents`        | List all ingested documents           |
| DELETE | `/admin/documents/{id}`   | Delete a document                     |
