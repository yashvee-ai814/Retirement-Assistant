# Retirement Assistant

An agentic RAG chatbot that helps UK pension members understand their retirement options through accurate, document-grounded guidance.

---

## Key Features

- **User authentication** — username-based sign-in and registration; full login audit trail in PostgreSQL
- **RAG document search** — pension PDFs ingested into ChromaDB; responses cited with filename, page, and excerpt
- **Agentic tool selection** — LangGraph agent dynamically selects from 11 tools (document search, profile management, 7 financial calculators, state pension lookup, clarification)
- **Deterministic calculations** — all financial projections computed via hardcoded formulas, eliminating LLM hallucination risk
- **Full persistence** — conversations, tool calls, calculations, and user profiles stored in PostgreSQL
- **Live activity panel** — every tool invocation (inputs + result) and cited source visible to the user in real time
- **Admin document management** — drag-and-drop PDF upload with chunk count and ingestion status tracking

---

## Problem Statement

- Pension documentation is dense and technically complex, leaving many members unable to navigate their options independently
- Members default to calling pension providers, where handlers spend **10–15 minutes per call** covering basic concepts — drawdown vs. annuity, lump-sum tax implications, applicable allowances
- These calls frequently end without a concrete outcome: members remain uncertain; handlers move on without a measurable result
- The root cause is a gap between the complexity of pension information and the accessibility of pre-call guidance

---

## Solution

An **agentic AI chatbot powered by Retrieval-Augmented Generation (RAG)**, purpose-built for the pension domain:

- Members ask plain-English questions and receive clear, document-grounded answers with verifiable citations
- A LangGraph agent selects from seven deterministic financial calculators to deliver personalised projections rather than generic guidance
- Conversation history and user financial profiles are persisted for continuity across sessions
- The system is strictly educational — it signposts professional advice where appropriate and never makes direct recommendations

---

## Benefits

**For the business and call handlers:**
- Reduces routine explanatory calls, freeing handler capacity for higher-value interactions
- Members arrive better informed, eliminating the 10–15 minute foundational briefing at the start of each call
- Estimated saving of **30+ minutes per handler per day**, compounding across teams into measurable throughput and cost gains

**For members:**
- Self-serve guidance at their own pace, in plain language, without time pressure
- Personalised projections across pot value, drawdown income, shortfall, and retirement readiness score
- Better equipped for focused, productive conversations with advisers when needed

---

## Future Scope

- **AI platform integration** — expose the assistant via API or Model Context Protocol (MCP) to embed it within existing AI ecosystems (e.g. ChatGPT, enterprise assistants) rather than requiring a standalone interface
- **Voice and telephony integration** — extend to voice channels via speech-to-text and text-to-speech pipelines, enabling pre-call triage: simple queries resolved instantly, complex cases escalated with context already established

---

## Architecture

```mermaid
flowchart TD
    Browser["Browser :5173\nReact + Vite + Tailwind"] -->|"REST API"| API["FastAPI :8000"]
    API --> Agent["LangGraph Agent"]
    Agent -->|"gpt-oss:120b-cloud"| LLM["Ollama :11434\n(Mac host)"]
    Agent -->|"semantic search"| Chroma["ChromaDB :8001\nVector Store"]
    Agent -->|"profiles · sessions"| PG["PostgreSQL :5432\nRelational DB"]
    Agent -->|"pure Python math"| Calc["Financial Calculators\n7 deterministic tools"]
```
---

## Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant UI as React Frontend
    participant API as FastAPI Backend
    participant Agent as LangGraph Agent
    participant LLM as Ollama LLM
    participant Chroma as ChromaDB
    participant Calc as Financial Calculators
    participant PG as PostgreSQL

    User->>UI: Ask pension withdrawal question
    UI->>API: POST /chat
    API->>PG: Load user profile and session history
    PG-->>API: Profile and previous messages
    API->>Agent: Send user query + context

    Agent->>LLM: Interpret intent and decide next action
    LLM-->>Agent: Tool selection decision

    alt Document-grounded explanation needed
        Agent->>Chroma: Search pension documents
        Chroma-->>Agent: Relevant chunks with source metadata
    end

    alt Calculation needed
        Agent->>Calc: Run deterministic calculator
        Calc-->>Agent: Calculation result
    end

    Agent->>LLM: Generate grounded response using retrieved context and tool outputs
    LLM-->>Agent: Final response
    Agent->>PG: Store message, sources, tool calls, and calculations
    Agent-->>API: Response payload
    API-->>UI: Answer + citations + activity data
    UI-->>User: Display explanation, sources, and tool activity
```

---

### Service Ports

| Service  | Port  | Description                           |
|----------|-------|---------------------------------------|
| frontend | 5173  | React dev server (Vite)               |
| backend  | 8000  | FastAPI REST API                      |
| chroma   | 8001  | ChromaDB HTTP server                  |
| postgres | 5432  | Relational DB (users, sessions, docs) |
| pgadmin  | 5050  | pgAdmin 4 web UI                      |
| ollama   | 11434 | LLM + embedding runtime (Mac host)    |

---

## Tech Stack

| Layer         | Technology                                             |
|---------------|--------------------------------------------------------|
| Frontend      | React 18, Vite 5, Tailwind CSS v3, JSX + TypeScript    |
| Backend       | FastAPI, Python 3.12+, LangGraph, LangChain            |
| LLM           | Ollama — `gpt-oss:120b-cloud`                          |
| Embeddings    | Ollama — `nomic-embed-text`                            |
| Vector DB     | ChromaDB                                               |
| Relational DB | PostgreSQL 16                                          |
| ORM           | SQLAlchemy 2.0 (async + sync)                          |
| Package mgr   | `uv` (backend), `npm` (frontend)                       |
| Containers    | Docker + Docker Compose                                |

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- [Ollama](https://ollama.com) installed on Mac: `brew install ollama`
- Models pulled (run once):
  ```bash
  ollama pull nomic-embed-text
  ollama pull gpt-oss:120b-cloud
  ```

---

## How to Run

### Docker (recommended)

```bash
# Tab 1 — start Ollama on your Mac
ollama serve

# Tab 2 — build and start all services
docker compose up --build

open http://localhost:5173
```

**Full reset** (wipe DB, vector store, and all images):
```bash
docker compose down -v --rmi all --remove-orphans && docker compose up --build
```

| Flag | Effect |
|------|--------|
| `-v` | delete `postgres_data` and `chroma_data` volumes |
| `--rmi all` | remove all built images (forces full rebuild) |
| `--remove-orphans` | clean up leftover containers |

**Rebuild code, keep data:**
```bash
docker compose up --build
```

### Locally (no Docker)

> Requires Python 3.12+, Node 20+, and `uv` (`pip install uv`).

```bash
# Tab 1 — Ollama
ollama serve

# Tab 2 — PostgreSQL + ChromaDB only
docker compose up postgres chroma -d

# Tab 3 — Backend
cd backend
cp ../.env.example .env
uv sync
uv run uvicorn app.main:app --reload --port 8000

# Tab 4 — Frontend
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

---

## Project Structure

```
Retirement-Assistant/
├── backend/           FastAPI app, LangGraph agent, PostgreSQL, ChromaDB
├── frontend/          React 18 + Vite + Tailwind SPA
├── docker-compose.yml
├── .env.example
└── README.md
```

See [backend/README.md](backend/README.md) and [frontend/README.md](frontend/README.md) for folder-level details.

---

## API Reference

Full request/response docs in [backend/README.md](backend/README.md#api-reference).

| Method | Path                          | Description                          |
|--------|-------------------------------|--------------------------------------|
| GET    | `/health`                     | Health check + active model          |
| POST   | `/auth/login`                 | Sign in by username                  |
| POST   | `/auth/register`              | Create account                       |
| GET    | `/auth/me`                    | Get current user                     |
| GET    | `/users/{id}/profile`         | Fetch financial profile              |
| PUT    | `/users/{id}/profile`         | Update financial profile             |
| POST   | `/chat`                       | Send message or resume clarification |
| GET    | `/sessions`                   | List sessions for a user             |
| GET    | `/sessions/{id}/tool-calls`   | Tool call history for a session      |
| DELETE | `/sessions/{id}`              | Delete session and messages          |
| POST   | `/admin/documents`            | Upload and ingest a PDF              |
| GET    | `/admin/documents`            | List all ingested documents          |
| DELETE | `/admin/documents/{id}`       | Delete a document                    |

---

## Agent Tools

Full schemas in [backend/README.md](backend/README.md#agent-tools).

| Tool                                | Purpose                                         |
|-------------------------------------|-------------------------------------------------|
| `search_pension_documents`          | Semantic search over ingested PDFs              |
| `get_user_profile`                  | Fetch stored user financial profile             |
| `update_user_profile`               | Persist a single profile field                  |
| `calculate_projected_pot`           | Project pension pot at retirement               |
| `calculate_drawdown_income`         | Annual income from pot via drawdown             |
| `calculate_monthly_savings_needed`  | Monthly savings to reach a target pot           |
| `calculate_shortfall`               | Income shortfall or surplus vs goal             |
| `calculate_readiness_score`         | 0–100 readiness score with label                |
| `calculate_inflation_adjusted_goal` | Inflate today's income goal to future money     |
| `get_uk_state_pension_info`         | UK state pension eligibility and amount         |
| `ask_human`                         | Pause to ask user a clarifying question         |

---

## Database Schema

| Table           | Purpose                                                 |
|-----------------|---------------------------------------------------------|
| `users`         | Accounts — username, login count, last login            |
| `login_events`  | Full auth audit log                                     |
| `user_profiles` | Financial profile per user                              |
| `sessions`      | Conversation threads                                    |
| `messages`      | Every chat turn with sources and tool call metadata     |
| `tool_calls`    | Every agent tool invocation — name, args, result        |
| `calculations`  | Financial calculator audit — inputs and outputs         |
| `documents`     | Ingested PDFs — filename, chunk count, ingestion date   |

Schema is auto-migrated on every backend startup (idempotent `create_all` + column-level `ALTER TABLE IF NOT EXISTS`).

---

## Service Credentials (local dev)

### PostgreSQL

| Field    | Value                                                               |
|----------|---------------------------------------------------------------------|
| Host     | `localhost:5432`                                                    |
| Database | `retirement_db`                                                     |
| Username | `retirement`                                                        |
| Password | `retirement`                                                        |
| String   | `postgresql://retirement:retirement@localhost:5432/retirement_db`   |

### pgAdmin

| Field    | Value                 |
|----------|-----------------------|
| URL      | http://localhost:5050 |
| Email    | `admin@example.com`   |
| Password | `admin`               |

Click **Retirement DB** in the left tree. If prompted for a password, enter `retirement`.

### ChromaDB

| Field | Value                 |
|-------|-----------------------|
| URL   | http://localhost:8001 |

---

## Environment Variables

Copy `.env.example` to `backend/.env` for local development:

| Variable             | Default                                                                    | Description          |
|----------------------|----------------------------------------------------------------------------|----------------------|
| `DATABASE_URL`       | `postgresql+asyncpg://retirement:retirement@localhost:5432/retirement_db`  | PostgreSQL connection |
| `CHROMA_HOST`        | `localhost`                                                                | ChromaDB host        |
| `CHROMA_PORT`        | `8001`                                                                     | ChromaDB port        |
| `OLLAMA_BASE_URL`    | `http://localhost:11434`                                                   | Ollama server URL    |
| `OLLAMA_MODEL`       | `gpt-oss:120b-cloud`                                                       | LLM model name       |
| `OLLAMA_EMBED_MODEL` | `nomic-embed-text`                                                         | Embedding model name |

In Docker these are set automatically via `docker-compose.yml`.

---

## Ingesting Pension PDFs

Place `.pdf` files in `backend/app/data/docs/` before starting — they are ingested into ChromaDB automatically on startup. The docs directory is gitignored.

Upload PDFs at any time via the **Admin / Documents** page in the sidebar.
