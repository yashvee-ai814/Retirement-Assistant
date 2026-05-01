# Claude Code — Project Configuration

Copy this file into the root of any new repo. Claude reads it automatically
and follows every rule below without being asked.

---

## Git Identity & Commit Rules

- Commit author is always **Yashvee** `<yashvee814@gmail.com>`
- Before the very first commit in any repo run:
  ```bash
  git config user.name "Yashvee"
  git config user.email "yashvee814@gmail.com"
  ```
- **NEVER add `Co-Authored-By:` lines** to any commit message — not for Claude, not for anyone
- Use feature branches for all new features: `feature/<short-name>`
- Push feature branches to origin and open a GitHub PR to merge into `main`
- Initial commit on `main` should contain only backend + infra files
- Commit frontend files on a `feature/frontend` branch
- Commit messages: one short subject line, blank line, then a brief body — no trailers

---

## Tech Stack

### Backend
| Concern | Choice |
|---|---|
| Language | Python 3.12+ |
| Framework | FastAPI |
| Validation | Pydantic v2 — `BaseModel`, `Field()` with constraints |
| Settings | pydantic-settings `BaseSettings` loaded from env vars |
| Package manager | **uv** — always `pyproject.toml`, never `requirements.txt` |
| HTTP client | httpx (async) |
| Server | uvicorn |

### Frontend
| Concern | Choice |
|---|---|
| Framework | React 18 + Vite 5 |
| Styling | Tailwind CSS v3 |
| React files | **`.jsx`** — never `.tsx` |
| Non-JSX files | **`.ts`** — types, API clients |
| Package manager | npm |

### LLM
| Concern | Choice |
|---|---|
| Runtime | Ollama — runs on host Mac, outside Docker |
| Model | `gpt-oss:120b-cloud` |
| Docker URL | `http://host.docker.internal:11434` |
| Local URL | `http://localhost:11434` |
| Client | `langchain-ollama` `ChatOllama` (OpenAI-compatible) |

### Infrastructure
| Concern | Choice |
|---|---|
| Containers | Docker + Docker Compose |
| Architecture | Microservices — one Dockerfile per service |
| Backend port | `8000` |
| Frontend port | `5173` |
| Backend env | `OLLAMA_BASE_URL=http://host.docker.internal:11434` |
| Mac host access | `extra_hosts: host.docker.internal:host-gateway` on backend service |

---

## Canonical Folder Structure

```
<project-name>/
├── CLAUDE.md
├── docker-compose.yml
├── .env.example
├── README.md
│
├── backend/
│   ├── Dockerfile
│   ├── pyproject.toml
│   └── app/
│       ├── __init__.py
│       ├── main.py          ← FastAPI app creation + CORS only
│       ├── router.py        ← all route definitions
│       ├── models.py        ← all Pydantic models (request/response)
│       ├── config.py        ← pydantic-settings BaseSettings
│       ├── llm.py           ← LLM client builder (ChatOllama)
│       ├── data/
│       │   └── prompts.json ← system prompts
│       └── agent/
│           ├── __init__.py  ← exports compiled graph
│           ├── state.py     ← LangGraph state definition
│           ├── tools.py     ← all tool definitions + ALL_TOOLS list
│           ├── nodes.py     ← node functions + routing functions
│           └── graph.py     ← StateGraph assembly + compiled graph
│
└── frontend/
    ├── Dockerfile
    ├── .gitignore
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── tsconfig.json
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── index.css              ← @tailwind directives only
        ├── api/
        │   └── chat.ts            ← typed fetch functions
        ├── types/
        │   └── chat.ts            ← TypeScript interfaces mirroring Pydantic models
        ├── context/
        │   └── ThemeContext.jsx
        └── components/
            ├── chat/              ← UI shell components
            │   ├── ChatWindow.jsx
            │   ├── ChatInput.jsx
            │   ├── MessageBubble.jsx
            │   ├── FormattedMessage.jsx
            │   ├── WelcomeScreen.jsx
            │   ├── Sidebar.jsx
            │   └── LoadingSpinner.jsx
            └── tools/             ← agent interaction components
                ├── ToolApprovalCard.jsx
                ├── ToolCallMessage.jsx
                ├── ToolCallBadge.jsx
                └── ClarificationCard.jsx
```

---

## Code Conventions

- React component files: always `.jsx`, never `.tsx`
- Comments: only when the **WHY** is non-obvious — never explain what the code does
- No placeholder code — every file must be complete and immediately runnable
- No extra features, refactors, or abstractions beyond what is asked
- Pydantic models: always use `Field()` with `ge`, `le`, `gt`, `ge` constraints where applicable
- FastAPI routes: always `async def`
- LangGraph agent: keep state, tools, nodes, and graph in separate files under `agent/`
- System prompts: always store in `data/prompts.json`, load at node invocation time
- Frontend API functions: throw descriptive errors that include the HTTP status and body detail

---

## Standard File Templates

### `backend/pyproject.toml`
```toml
[project]
name = "<project>-backend"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
    "fastapi",
    "uvicorn[standard]",
    "pydantic>=2.0",
    "pydantic-settings",
    "httpx",
    "python-dotenv",
]

[build-system]
requires = ["setuptools>=68"]
build-backend = "setuptools.build_meta"

[tool.setuptools.packages.find]
where = ["."]
include = ["app*"]
```

### `backend/Dockerfile`
```dockerfile
FROM python:3.12-slim
WORKDIR /app
RUN pip install uv
COPY pyproject.toml .
COPY app/ ./app/
RUN uv pip install --system .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### `frontend/Dockerfile`
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json .
RUN npm install
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

### `frontend/.gitignore`
```
node_modules/
.vite/
dist/
.env
.env.local
.env.*.local
npm-debug.log*
.DS_Store
```

### `docker-compose.yml`
```yaml
version: '3.9'
services:
  frontend:
    build:
      context: ./frontend
    ports:
      - "5173:5173"
    volumes:
      - ./frontend/src:/app/src
  backend:
    build:
      context: ./backend
    ports:
      - "8000:8000"
    depends_on:
      - frontend
    environment:
      - OLLAMA_BASE_URL=http://host.docker.internal:11434
      - OLLAMA_MODEL=gpt-oss:120b-cloud
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

### `frontend/package.json`
```json
{
  "name": "<project>-frontend",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.41",
    "tailwindcss": "^3.4.10",
    "typescript": "^5.5.3",
    "vite": "^5.4.0"
  }
}
```

### `frontend/vite.config.ts`
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, host: '0.0.0.0' },
})
```

### `frontend/tailwind.config.js`
```js
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
}
```

### `frontend/postcss.config.js`
```js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } }
```

### `frontend/tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "allowJs": true,
    "checkJs": false,
    "strict": false,
    "noEmit": true,
    "skipLibCheck": true,
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "resolveJsonModule": true
  },
  "include": ["src", "vite.config.ts"]
}
```

### `frontend/src/index.css`
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### `frontend/index.html`
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

### `frontend/src/main.jsx`
```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
)
```

---

## Local Dev Commands (no Docker)

```bash
# Tab 1 — LLM (always on Mac host)
ollama serve

# Tab 2 — Backend
cd backend && uv sync && uv run uvicorn app.main:app --reload

# Tab 3 — Frontend
cd frontend && npm install && npm run dev
```

---

## Git Workflow for New Projects

```bash
# 1. Fix identity (always first)
git config user.name "Yashvee"
git config user.email "yashvee814@gmail.com"

# 2. Commit backend + infra to main
git add README.md .env.example CLAUDE.md docker-compose.yml backend/
git commit -m "Add backend API and project infrastructure"
git push -u origin main

# 3. Create and push frontend branch
git checkout -b feature/frontend
git add frontend/
git commit -m "Add React frontend"
git push -u origin feature/frontend
# Then open PR on GitHub
```
