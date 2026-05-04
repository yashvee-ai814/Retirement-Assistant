# Retirement Assistant

A RAG-powered agentic chatbot that helps UK users understand their retirement options through educational, factual pension guidance.

---

## What it Does

- **User authentication** — sign in or create an account by username; login events recorded in PostgreSQL
- **RAG document search** — pension PDFs ingested into ChromaDB; results cited with filename, page, and excerpt
- **Agentic tool selection** — LangGraph agent picks from 11 tools (search, profile, 7 calculators, state pension, clarification)
- **Deterministic math** — all financial projections use hardcoded formulas, never LLM guessing
- **Full persistence** — conversations, tool calls, calculations, and user profiles stored in PostgreSQL
- **Activity panel** — every tool call (inputs + result) and cited document source shown in real time
- **Admin UI** — upload pension PDFs via drag-and-drop; view chunk counts and ingestion status

---

## Problem Statement

Many pension members struggle to understand their withdrawal options. Pension documentation is detailed and technical by nature, and for members who are not financially literate, navigating it can feel overwhelming — making it difficult to reach a confident decision independently.

This leads to a high volume of inbound calls to pension providers. Call handlers routinely spend **10–15 minutes per call** walking members through basic concepts such as drawdown vs. annuity, tax implications of lump-sum withdrawals, and which allowances a given choice would trigger. Despite the time invested, these calls frequently end without a concrete outcome: members leave uncertain, and call handlers move on without having generated a measurable result for the business.

The core issue is a gap between the complexity of pension information and the accessibility of guidance available to members before they pick up the phone.

---

## Solution

This project addresses that gap with an **agentic AI chatbot powered by Retrieval-Augmented Generation (RAG)**. Members can ask plain-English questions about their pension options and receive clear, accurate, document-grounded responses — without needing to interpret dense policy documents themselves.

The chatbot is designed specifically for the pension domain:

- Answers are drawn from ingested pension PDFs, with cited sources so members can verify information
- An LangGraph agent selects from specialised tools — including seven deterministic financial calculators — to give members personalised projections rather than generic guidance
- Conversation history and user profiles are persisted, so the assistant can provide continuity across sessions
- The system is fully educational and factual, signposting professional advice where appropriate, rather than making recommendations

Members can arrive at an informed view of their options — and, if they do call, the conversation is far more productive.

---

## Benefits

**For call handlers and the business:**
- Routine explanatory calls are reduced, freeing handler capacity for higher-value interactions that actually result in outcomes
- Handlers no longer need to spend the first 10–15 minutes of each call establishing foundational understanding — members arrive better informed
- Estimated time saving of at least **30 minutes per call handler per day**, which compounds across a team and translates directly to increased throughput and reduced operational cost

**For members:**
- Members can explore their options at their own pace, in plain language, without time pressure
- Interactive calculators provide personalised projections (projected pot, drawdown income, shortfall analysis, readiness score) to support decision-making
- Members who need further guidance are better equipped to have a focused, productive conversation with a professional

---

## Future Scope

- **AI platform integration (ChatGPT / external assistants)**  

  Many users already rely on AI tools such as ChatGPT for information and decision-making. This assistant could be exposed via APIs or Model Context Protocol (MCP) integrations, enabling it to be consumed within existing AI ecosystems rather than requiring a standalone interface.

- **Voice and telephony integration**  

  The solution can be extended to voice-based channels using speech-to-text and text-to-speech pipelines. This would allow users to interact with the assistant before reaching a live call handler, creating a natural triage layer where:

  - Simple queries are resolved instantly  

  - More complex cases reach handlers with context already established 

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
