# Retirement Assistant — Frontend

React 18 + Vite 5 + Tailwind CSS single-page application for the Retirement Assistant chatbot.

---

## What it Does

- **Username authentication** — login or register with a username; no password required
- **Multi-turn chat** — converses with the LangGraph agent across multiple sessions
- **Activity panel** — per-message right-side panel showing every tool call (with args and results) and document sources
- **Financial profile editor** — form to save age, pot size, income goal, and growth rate assumptions
- **Admin document management** — upload and delete pension PDFs; live list of ingested documents
- **Session history sidebar** — list of past sessions grouped Today / Yesterday / Earlier
- **Dark / light mode** — toggleable via header button, persisted to localStorage

---

## Tech Stack

| Concern | Choice |
|---|---|
| Framework | React 18 |
| Build tool | Vite 5 |
| Styling | Tailwind CSS v3 |
| Component files | JSX |
| Types + API clients | TypeScript |
| Package manager | npm |

---

## Prerequisites

- Node.js 20+
- npm
- Backend running at [http://localhost:8000](http://localhost:8000)

---

## Running Locally

```bash
cd frontend
npm install
npm run dev
```

App available at [http://localhost:5173](http://localhost:5173).

---

## Running with Docker

```bash
# From the repo root
docker compose up frontend
```

Source files are volume-mounted into the container (`./frontend/src:/app/src`) so hot-reload works.

---

## Build

```bash
npm run build      # outputs to dist/
npm run preview    # serves the dist/ build locally
```

---

## Project Structure

```
frontend/
├── Dockerfile
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
└── src/
    ├── main.jsx                     React root
    ├── App.jsx                      Auth gate: LoginPage or ChatPage
    ├── index.css                    Tailwind directives only
    ├── api/
    │   ├── auth.ts                  login(), register(), getMe()
    │   ├── chat.ts                  sendMessage(), getSessions(), getToolCalls(), deleteSession()
    │   ├── documents.ts             uploadDocument(), listDocuments(), deleteDocument()
    │   └── profile.ts               getProfile(), updateProfile()
    ├── types/
    │   ├── auth.ts                  User interface
    │   ├── chat.ts                  ChatRequest, ChatResponse, SessionInfo, ToolCallInfo, SourceReference
    │   ├── document.ts              DocumentInfo
    │   └── profile.ts               UserProfile
    ├── context/
    │   ├── AuthContext.jsx           User session, login(), logout(), register()
    │   └── ThemeContext.jsx          Dark/light toggle, persists to localStorage
    ├── layouts/
    │   └── AppLayout.jsx             Sidebar + header + error banner wrapper
    ├── pages/
    │   ├── LoginPage.jsx             Username login + register form
    │   ├── ChatPage.jsx              Session management + message state + handlers
    │   ├── ProfilePage.jsx           Financial profile form
    │   └── AdminPage.jsx             Document upload + list
    └── components/
        ├── chat/
        │   ├── ChatWindow.jsx        Message list with scroll and loading
        │   ├── ChatInput.jsx         Textarea + send button
        │   ├── MessageBubble.jsx     User/assistant bubble with tool badges
        │   ├── FormattedMessage.jsx  Markdown rendering + readiness score cards
        │   ├── ToolCallMessage.jsx   Collapsible tool call display
        │   ├── ClarificationCard.jsx Inline input for agent clarifying questions
        │   ├── ToolApprovalCard.jsx  Tool approval UI (reserved)
        │   ├── ActivityPanel.jsx     Right panel: tool calls + document sources
        │   ├── SourceCard.jsx        Document citation card (filename, page, excerpt)
        │   └── WelcomeScreen.jsx     Landing screen with example prompts
        ├── navigation/
        │   └── Sidebar.jsx           Session list grouped Today / Yesterday / Earlier
        ├── admin/
        │   ├── DocumentUploader.jsx  Drag-and-drop PDF upload
        │   └── DocumentList.jsx      Ingested document list with delete
        └── shared/
            ├── LoadingSpinner.jsx
            └── ToolCallBadge.jsx     Inline pill showing tool name
```

---

## Key Features

### Authentication

Username-only auth — no password. On the Login page the user either signs in (username must exist) or registers (creates an account). The current user object is stored in localStorage under `ra-user` and loaded on page refresh via `AuthContext`.

### Chat Sessions

Each session is a UUID generated client-side when the user clicks **New Chat**. Sessions are listed in the sidebar grouped by creation date (Today / Yesterday / Earlier). Switching sessions reloads the message history from the backend.

### Agent Interrupt Handling

When the LangGraph agent calls `ask_human`, the backend returns `status: "awaiting_clarification"` and a `pending_interrupt` question. The UI renders a `ClarificationCard` inline below the last assistant message. When the user submits an answer, it is sent back via `POST /chat` with `resume_input` set, resuming the interrupted graph.

### Activity Panel

Each assistant message has an activity toggle button. Clicking it opens the `ActivityPanel` on the right, which shows:
- Every tool call made for that response (tool name, args as JSON, result as JSON)
- Every document source cited (filename, page number, excerpt)

### Document Administration

The Admin page contains a drag-and-drop `DocumentUploader` and a `DocumentList`. Uploading a PDF sends it to `POST /admin/documents`; deletion calls `DELETE /admin/documents/{id}` which removes the document from ChromaDB, the database, and disk.

### Message Formatting

`FormattedMessage` parses assistant replies and renders:
- Bold (`**text**`), italic (`*text*`), inline code (`` `code` ``)
- Headings (`##`, `###`)
- Bulleted and numbered lists
- Readiness score cards — when the assistant returns a JSON block with `score` and `label`, it is rendered as a styled card with a colour-coded label (green / amber / red)

### Dark / Light Mode

Toggled via the sun/moon button in the header. The preference is saved to localStorage under `ra-theme` and applied as a CSS class on `<html>`. Defaults to dark mode on first visit.

---

## API Integration

All functions in `src/api/` throw descriptive errors that include the HTTP status code and the `detail` field from the backend JSON response. Example:

```ts
throw new Error(`Login failed (${res.status}): ${data.detail}`);
```

The `BASE` URL constant in each `api/` file defaults to `http://localhost:8000`. Update it there if the backend is deployed elsewhere.
