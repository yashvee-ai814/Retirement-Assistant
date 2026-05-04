# Retirement Assistant — Backend

FastAPI backend hosting a LangGraph agentic assistant with PostgreSQL persistence, ChromaDB semantic search, and 11 financial tools.

---

## What it Does

- Runs a LangGraph agent backed by Ollama (`gpt-oss:120b-cloud`)
- Provides REST endpoints for auth, chat, profile management, and document administration
- Ingests pension PDFs into ChromaDB on startup for semantic search
- Persists all conversations, tool calls, and user profiles in PostgreSQL
- Applies input/output guardrails against injection and off-topic queries

---

## Folder Structure

```
backend/
├── Dockerfile
├── pyproject.toml
├── initdb/
│   └── 01_privileges.sql      PostgreSQL user grants (run on first start)
├── pgadmin/
│   └── servers.json           pgAdmin pre-configured server connection
└── app/
    ├── main.py                FastAPI app creation, CORS, routers, lifespan
    ├── core/
    │   ├── config.py          pydantic-settings (all env vars)
    │   ├── logger.py          Shared logger factory
    │   └── middleware.py      HTTP request/response logging middleware
    ├── agent/
    │   ├── graph.py           LangGraph StateGraph + MemorySaver compile
    │   ├── nodes.py           agent_node + route_after_agent
    │   ├── state.py           RetirementRAGState (message accumulator)
    │   └── tools.py           11 tool definitions + ALL_TOOLS list
    ├── services/
    │   ├── db/
    │   │   ├── database.py    Async + sync SQLAlchemy engines; init_db()
    │   │   ├── models.py      ORM models (User, Session, Message, etc.)
    │   │   └── sessions.py    MemorySaver checkpointer helper
    │   ├── vector/
    │   │   ├── client.py      ChromaDB HTTP client + OllamaEmbeddings factory
    │   │   ├── ingest.py      PDF → chunks → ChromaDB + DB record
    │   │   └── documents.py   /admin/documents router
    │   └── shared/
    │       ├── auth.py        /auth router (login, register, me)
    │       ├── chat.py        /chat and /sessions routers
    │       ├── guardrails.py  Input/output safety filters
    │       ├── models.py      Pydantic request/response models
    │       └── profile.py     /users/{id}/profile router
    └── data/
        ├── prompts.json       System prompt + guardrail messages
        └── docs/              PDF knowledge base (place PDFs here — gitignored)
```

---

## Tech Stack

| Concern         | Choice                                                              |
|-----------------|---------------------------------------------------------------------|
| Framework       | FastAPI                                                             |
| Agent runtime   | LangGraph ≥ 0.2                                                     |
| LLM client      | `langchain-ollama` — `ChatOllama`                                   |
| Embeddings      | `OllamaEmbeddings` — `nomic-embed-text`                             |
| Vector store    | ChromaDB via `langchain-chroma`                                     |
| ORM             | SQLAlchemy 2.0 — async (`asyncpg`) + sync (`psycopg2-binary`)       |
| Validation      | Pydantic v2                                                         |
| Settings        | `pydantic-settings`                                                 |
| Package manager | `uv`                                                                |
| Server          | `uvicorn`                                                           |

---

## Prerequisites

- Python 3.12+
- [`uv`](https://github.com/astral-sh/uv): `pip install uv`
- [Ollama](https://ollama.com) running with both models pulled (see root README)

---

## Running Locally

```bash
cd backend
cp ../.env.example .env
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

Interactive API docs: http://localhost:8000/docs

---

## Running with Docker

```bash
# From the repo root
docker compose up backend --build
```

The backend connects to Ollama on the Mac host via `host.docker.internal:11434`.

---

## Environment Variables

| Variable             | Default                                                                   | Description          |
|----------------------|---------------------------------------------------------------------------|----------------------|
| `DATABASE_URL`       | `postgresql+asyncpg://retirement:retirement@localhost:5432/retirement_db` | PostgreSQL connection |
| `CHROMA_HOST`        | `localhost`                                                               | ChromaDB host        |
| `CHROMA_PORT`        | `8001`                                                                    | ChromaDB port        |
| `OLLAMA_BASE_URL`    | `http://localhost:11434`                                                  | Ollama server URL    |
| `OLLAMA_MODEL`       | `gpt-oss:120b-cloud`                                                      | LLM model name       |
| `OLLAMA_EMBED_MODEL` | `nomic-embed-text`                                                        | Embedding model name |

---

## API Reference

### Auth — `/auth`

#### `POST /auth/login`
Sign in by username.
```json
// Request
{ "username": "alice" }

// Response 200
{ "user_id": "uuid", "username": "alice" }
// 404 if user not found
```

#### `POST /auth/register`
Create a new account.
```json
// Request
{ "username": "alice" }

// Response 201
{ "user_id": "uuid", "username": "alice", "created": true }
// 409 if username already taken
```

#### `GET /auth/me?user_id={id}`
```json
{ "user_id": "uuid", "username": "alice" }
```

---

### Profile — `/users`

#### `GET /users/{user_id}/profile`
Returns the stored financial profile. All fields are nullable.

```json
{
  "age": 54,
  "current_pot": 120000.0,
  "monthly_personal": 500.0,
  "monthly_employer": 250.0,
  "target_annual_income": 30000.0,
  "retirement_age": 67,
  "annual_growth_rate": 0.05,
  "inflation_rate": 0.025
}
```

#### `PUT /users/{user_id}/profile`
Update any subset of profile fields. Returns the updated profile.

---

### Chat — `/chat`, `/sessions`

#### `POST /chat`
Send a message or resume a clarification interrupt.

```json
// Request
{
  "session_id": "uuid",
  "user_id": "uuid",
  "message": "Am I on track for retirement?",
  "resume_input": null
}

// Response
{
  "session_id": "uuid",
  "reply": "Based on your profile...",
  "status": "complete",
  "pending_interrupt": null,
  "tool_calls_used": [
    { "name": "calculate_projected_pot", "args": {}, "result": "..." }
  ],
  "sources": [
    { "filename": "guide.pdf", "page": 3, "excerpt": "..." }
  ]
}
```

`status`: `complete` | `awaiting_clarification`

When `status` is `awaiting_clarification`, send the user's answer as `resume_input`:
```json
{ "session_id": "...", "user_id": "...", "resume_input": { "answer": "67" } }
```

#### `GET /sessions?user_id={id}`
List of `[{ "id", "title", "created_at", "updated_at" }]`

#### `GET /sessions/{id}/tool-calls?user_id={id}`
All tool calls recorded for a session.

#### `DELETE /sessions/{id}?user_id={id}`
Delete the session and all its messages.

---

### Documents — `/admin`

#### `POST /admin/documents`
Upload a PDF (multipart). Returns `DocumentInfo`.
```json
{
  "id": "uuid",
  "original_name": "pension-guide.pdf",
  "chunk_count": 42,
  "status": "ingested",
  "ingested_at": "2026-05-04T12:00:00Z",
  "uploaded_by": "admin"
}
```

#### `GET /admin/documents`
List all ingested documents.

#### `DELETE /admin/documents/{id}`
Remove document from ChromaDB and PostgreSQL; delete file from disk.

---

### Health

#### `GET /health`
```json
{ "status": "ok", "model": "gpt-oss:120b-cloud" }
```

---

## Agent Tools

| Tool | Inputs | Outputs | Description |
|------|--------|---------|-------------|
| `search_pension_documents` | `query`, `n_results` (1–20) | `[{page_content, filename, page, score}]` | Semantic search over ingested PDFs |
| `get_user_profile` | `user_id` | `{found, age, current_pot, …}` | Fetch stored financial profile |
| `update_user_profile` | `user_id`, `field`, `value` | `{updated, value}` | Persist a single profile field |
| `calculate_projected_pot` | `current_pot`, `monthly_personal`, `monthly_employer`, `annual_growth_rate`, `years` | `{projected_pot, total_contributions, total_growth}` | FV = PV·(1+r)^n + PMT·((1+r)^n−1)/r |
| `calculate_drawdown_income` | `pot_value`, `drawdown_rate`, `state_pension_annual` | `{annual_income, drawdown_from_pot, state_pension_contribution}` | income = pot × rate + state pension |
| `calculate_monthly_savings_needed` | `target_pot`, `current_pot`, `annual_growth_rate`, `years` | `{monthly_savings_needed, total_to_accumulate}` | PMT to reach target pot |
| `calculate_shortfall` | `income_goal`, `projected_annual_income` | `{shortfall, surplus, is_on_track}` | Gap between goal and projection |
| `calculate_readiness_score` | `projected_income`, `income_goal` | `{score (0–100), label}` | ≥70 On track · 40–69 Needs attention · <40 At risk |
| `calculate_inflation_adjusted_goal` | `current_goal`, `inflation_rate`, `years` | `{adjusted_goal, inflation_uplift}` | FV = goal × (1+rate)^years |
| `get_uk_state_pension_info` | `current_age`, `retirement_age` | `{annual_state_pension, eligible_from_age, years_until_eligible, note}` | £11,502/yr from age 67 |
| `ask_human` | `question` | LangGraph interrupt | Pause graph to ask user a clarifying question |

---

## Agent Flow

```
POST /chat
  │
  ├─ guardrail check (input)
  │
  ├─ LangGraph graph.invoke()
  │      │
  │      └─ agent node  →  tool calls?  ─yes─→  tools node  →  back to agent
  │                                     ─no──→  END
  │
  ├─ guardrail check (output)
  │
  └─ response returned
```

---

## Database Schema

| Table           | Key Columns                                                                 |
|-----------------|-----------------------------------------------------------------------------|
| `users`         | `id` (uuid), `username`, `login_count`, `last_login_at`                    |
| `login_events`  | `id`, `user_id`, `username`, `action` (login/register), `created_at`       |
| `user_profiles` | `id`, `user_id`, `age`, `current_pot`, `monthly_personal`, `monthly_employer`, `target_annual_income`, `retirement_age`, `annual_growth_rate`, `inflation_rate` |
| `sessions`      | `id` (uuid), `user_id`, `title`, `created_at`, `updated_at`               |
| `messages`      | `id`, `session_id`, `role`, `content`, `sources` (JSON), `created_at`     |
| `tool_calls`    | `id`, `session_id`, `name`, `args` (JSON), `result` (JSON), `created_at`  |
| `calculations`  | `id`, `session_id`, `tool_name`, `inputs` (JSON), `outputs` (JSON)        |
| `documents`     | `id`, `filename`, `original_name`, `chunk_count`, `status`, `ingested_at`, `uploaded_by` |

Schema auto-migrates on every startup: `create_all` for new tables; `ALTER TABLE IF NOT EXISTS` for new columns.

---

## Document Ingestion

Place PDFs in `backend/app/data/docs/` — ingested automatically on startup. Already-ingested files (matched by filename) are skipped.

Upload via `POST /admin/documents` or the Admin page in the frontend.

**Chunking:** `RecursiveCharacterTextSplitter` — `chunk_size=1000`, `chunk_overlap=200`.

---

## Guardrails

`services/shared/guardrails.py` filters all input and output:

- **Injection patterns** — blocks `ignore previous instructions`, SQL fragments, etc.
- **Harmful topics** — blocks content outside the retirement/finance domain
- **Off-topic** — blocks messages >8 words with no retirement/finance keywords
- **Output validation** — checks LLM replies before returning to client

---

## Logging

All logs to stdout: `YYYY-MM-DDTHH:MM:SS [LEVEL] logger.name: message`

| Logger                  | Coverage                                           |
|-------------------------|----------------------------------------------------|
| `retirement.api`        | App startup and shutdown                           |
| `retirement.http`       | Every HTTP request — method, path, status, latency |
| `retirement.agent`      | LLM invocations and tool selections                |
| `retirement.ingest`     | Document ingestion per file                        |
| `retirement.guardrails` | Blocked inputs/outputs with matched pattern        |
