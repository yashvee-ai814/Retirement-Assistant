# Retirement Assistant — Backend

FastAPI backend hosting a LangGraph agentic assistant with PostgreSQL persistence, ChromaDB semantic search, and 11 financial tools.

---

## What it Does

- Serves a REST API consumed by the React frontend
- Runs a LangGraph agent that selects tools based on the user's query
- Persists users, sessions, messages, tool calls, and calculations to PostgreSQL
- Ingests pension PDFs into ChromaDB on startup and via the Admin API
- Validates all input and output through a guardrails layer before touching the LLM

---

## Folder Structure

```
backend/
├── Dockerfile
├── pyproject.toml
├── initdb/01_privileges.sql     PostgreSQL grants run on first container start
├── pgadmin/servers.json         pgAdmin pre-configured connection
└── app/
    ├── main.py                  FastAPI app creation, CORS, routers, lifespan
    ├── core/
    │   ├── config.py            pydantic-settings (all env vars)
    │   ├── logger.py            Shared logger factory
    │   └── middleware.py        HTTP request/response logging
    ├── agent/
    │   ├── graph.py             LangGraph StateGraph + MemorySaver compile
    │   ├── nodes.py             agent_node, route_after_agent
    │   ├── state.py             RetirementRAGState (message accumulator)
    │   └── tools.py             11 tool definitions + ALL_TOOLS list
    ├── services/
    │   ├── db/
    │   │   ├── database.py      Async + sync SQLAlchemy engines; init_db()
    │   │   ├── models.py        ORM models (User, Session, Message, etc.)
    │   │   └── sessions.py      MemorySaver checkpointer helper
    │   ├── vector/
    │   │   ├── client.py        ChromaDB HTTP client + OllamaEmbeddings factory
    │   │   ├── ingest.py        PDF → chunks → ChromaDB + DB record
    │   │   └── documents.py     /admin/documents router
    │   └── shared/
    │       ├── auth.py          /auth router (login, register, me)
    │       ├── chat.py          /chat and /sessions routers
    │       ├── guardrails.py    Input/output safety filters
    │       ├── models.py        Pydantic request/response models
    │       └── profile.py       /users/{id}/profile router
    └── data/
        ├── prompts.json         System prompt + guardrail messages
        └── docs/                PDF knowledge base (place PDFs here — gitignored)
```

---

## Tech Stack

| Concern | Choice |
|---|---|
| Framework | FastAPI |
| Agent runtime | LangGraph >= 0.2 |
| LLM client | langchain-ollama ChatOllama |
| Embeddings | OllamaEmbeddings — nomic-embed-text |
| Vector store | ChromaDB via langchain-chroma |
| ORM | SQLAlchemy 2.0 — asyncpg (async) + psycopg2-binary (sync) |
| Validation | Pydantic v2 |
| Settings | pydantic-settings |
| Package manager | uv |
| Server | uvicorn |

---

## Prerequisites

- Python 3.12+
- `uv` — `pip install uv`
- Ollama running with both models pulled:
  ```bash
  ollama pull gpt-oss:120b-cloud
  ollama pull nomic-embed-text
  ```

---

## Running Locally

```bash
cd backend
cp ../.env.example .env   # edit CHROMA_HOST and DATABASE_URL to use localhost
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

Interactive API docs: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## Running with Docker

```bash
# From the repo root
docker compose up backend --build
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://retirement:retirement@db:5432/retirement_db` | Async PostgreSQL connection string |
| `CHROMA_HOST` | `chroma` | ChromaDB hostname |
| `CHROMA_PORT` | `8001` | ChromaDB port |
| `OLLAMA_BASE_URL` | `http://host.docker.internal:11434` | Ollama server URL |
| `OLLAMA_MODEL` | `gpt-oss:120b-cloud` | LLM model name |
| `OLLAMA_EMBED_MODEL` | `nomic-embed-text` | Embedding model name |

---

## API Reference

### Auth — `/auth`

**POST /auth/login**
- Request: `{ "username": "string" }`
- Response: `{ "user_id": int, "username": "string" }`
- 404 if username not found

**POST /auth/register**
- Request: `{ "username": "string" }`
- Response: `{ "user_id": int, "username": "string", "created": true }`
- Status: 201
- 409 if username already taken

**GET /auth/me?user_id={id}**
- Response: `{ "user_id": int, "username": "string" }`

---

### Profile — `/users`

**GET /users/{user_id}/profile**
- Response: `UserProfileData` — all fields nullable:
  `age`, `current_pot`, `monthly_personal`, `monthly_employer`,
  `target_annual_income`, `retirement_age`, `annual_growth_rate`, `inflation_rate`

**PUT /users/{user_id}/profile**
- Request: any subset of profile fields
- Response: updated `UserProfileData`

---

### Chat — `/chat`, `/sessions`

**POST /chat**
- Request:
  ```json
  {
    "session_id": "uuid-string",
    "user_id": 1,
    "message": "What are my pension options?",
    "resume_input": null
  }
  ```
- Response:
  ```json
  {
    "session_id": "uuid-string",
    "reply": "...",
    "status": "complete",
    "pending_interrupt": null,
    "tool_calls_used": [{ "tool": "search_pension_documents", "args": {}, "result": "..." }],
    "sources": [{ "filename": "doc.pdf", "page": 2, "excerpt": "..." }]
  }
  ```
- `status` is `"complete"` or `"awaiting_clarification"` (when `ask_human` fires)

**GET /sessions?user_id={id}**
- Response: list of `{ "id", "title", "created_at", "updated_at" }`

**GET /sessions/{id}/tool-calls?user_id={id}**
- Response: tool call history for the session

**DELETE /sessions/{id}?user_id={id}**
- Deletes session and all associated messages

---

### Documents — `/admin`

**POST /admin/documents**
- Multipart PDF upload
- Response: `DocumentInfo { id, original_name, chunk_count, status, ingested_at }`

**GET /admin/documents**
- Response: list of `DocumentInfo`

**DELETE /admin/documents/{id}**
- Removes from ChromaDB, database, and disk

---

### Health

**GET /health**
- Response: `{ "status": "ok", "model": "gpt-oss:120b-cloud" }`

---

## Agent Tools

| Tool | Input Schema | Output Schema | Description | When Called |
|---|---|---|---|---|
| search_pension_documents | `query: str`, `n_results: int = 5` | JSON array of `{ page_content, filename, page, score }` | Semantic search over ingested pension PDFs | User asks a specific pension rule or product question |
| get_user_profile | `user_id: int` | Profile dict or `{ "found": false }` | Retrieve stored financial profile | Profile data not yet in conversation |
| update_user_profile | `user_id: int`, `field: str`, `value: Any` | `{ "updated": true, "value": Any }` | Persist a confirmed financial detail | User confirms a specific financial figure |
| calculate_projected_pot | `current_pot`, `monthly_personal`, `monthly_employer`, `annual_growth_rate`, `years` | `{ projected_pot, total_contributions, total_growth }` | FV = PV*(1+r)^n + PMT_annual*((1+r)^n - 1)/r | User asks "how much will I have at retirement?" |
| calculate_drawdown_income | `pot_value`, `drawdown_rate`, `state_pension_annual` | `{ annual_income, drawdown_from_pot, state_pension_contribution }` | Annual income from drawdown + state pension | User asks about drawdown income |
| calculate_monthly_savings_needed | `target_pot`, `current_pot`, `annual_growth_rate`, `years` | `{ monthly_savings_needed, total_to_accumulate }` | Monthly contributions needed to hit a target pot | User asks how much to save per month |
| calculate_shortfall | `income_goal`, `projected_annual_income` | `{ shortfall, surplus, is_on_track }` | Gap between goal income and projected income | User asks if they are on track |
| calculate_readiness_score | `projected_income`, `income_goal` | `{ score (0–100), label }` — >= 70 = On track, 40–69 = Needs attention, < 40 = At risk | Readiness score with label | After shortfall calc to summarise position |
| calculate_inflation_adjusted_goal | `current_goal`, `inflation_rate`, `years` | `{ adjusted_goal, inflation_uplift }` | Inflation-uplifted income goal | User asks about inflation impact |
| get_uk_state_pension_info | `current_age`, `retirement_age` | `{ annual_state_pension, eligible_from_age, years_until_eligible, note }` — £11,502/yr from age 67 | UK state pension eligibility and amount | User asks about state pension |
| ask_human | `question: str` | LangGraph interrupt — execution pauses | Clarifying question to user | Agent needs missing information before proceeding |

---

## Agent Flow

```
POST /chat
  → guardrail check (input)
  → LangGraph graph.invoke()
      → agent node (LLM picks tools or responds)
          ├── tool calls → tools node (ToolNode runs all tools) → back to agent
          └── no tools → END
  → guardrail check (output)
  → response returned
```

---

## Database Schema

| Table | Key Columns |
|---|---|
| users | `id`, `username`, `login_count`, `last_login`, `created_at` |
| login_events | `id`, `user_id`, `event_type`, `created_at` |
| user_profiles | `id`, `user_id`, `age`, `current_pot`, `monthly_personal`, `monthly_employer`, `target_annual_income`, `retirement_age`, `annual_growth_rate`, `inflation_rate` |
| sessions | `id` (UUID), `user_id`, `title`, `created_at`, `updated_at` |
| messages | `id`, `session_id`, `role`, `content`, `sources`, `tool_call_ids`, `created_at` |
| tool_calls | `id`, `session_id`, `tool_name`, `args`, `result`, `created_at` |
| calculations | `id`, `user_id`, `session_id`, `calc_type`, `inputs`, `outputs`, `created_at` |
| documents | `id`, `original_name`, `stored_name`, `chunk_count`, `status`, `ingested_at` |

---

## Document Ingestion

Place `.pdf` files in `backend/app/data/docs/` — they are auto-ingested on every backend startup (idempotent; already-ingested docs are skipped by checking stored filenames).

Upload at runtime via **Admin > Documents** in the UI or `POST /admin/documents`.

Chunking settings: `chunk_size=1000`, `chunk_overlap=200`, using LangChain `RecursiveCharacterTextSplitter`.

---

## Guardrails

The guardrails layer runs before sending input to the LLM and after receiving output.

- **Prompt injection** — blocks patterns like `ignore previous instructions`, `system:`, `<|im_start|>`
- **Harmful topics** — blocks requests involving self-harm, violence, or illegal activity
- **Off-topic** — queries longer than 8 words with no finance-related keywords are blocked
- **Output validation** — strips any LLM output that begins with a refusal to answer finance questions

---

## Logging

| Logger | Covers |
|---|---|
| `retirement.api` | FastAPI route handlers |
| `retirement.http` | HTTP request/response middleware |
| `retirement.agent` | LangGraph node execution |
| `retirement.ingest` | PDF ingestion pipeline |
| `retirement.guardrails` | Blocked inputs and outputs |
