# Retirement Assistant — Frontend

React 18 + Vite 5 + Tailwind CSS single-page application for the Retirement Assistant chatbot.

---

## What it Does

- Username-based login and account registration
- Multi-turn chat with the LangGraph retirement agent
- Activity panel showing every tool call (inputs + result) and cited document sources
- Financial profile editor (pot size, contributions, retirement age, income goal)
- Admin page for PDF knowledge base management
- Session history sidebar grouped by date
- Dark / light mode persisted across sessions

---

## Tech Stack

| Concern         | Choice              |
|-----------------|---------------------|
| Framework       | React 18            |
| Build tool      | Vite 5              |
| Styling         | Tailwind CSS v3     |
| Components      | JSX (`.jsx`)        |
| Types & API     | TypeScript (`.ts`)  |
| Package manager | npm                 |

---

## Prerequisites

- Node.js 20+
- npm
- Backend running at `http://localhost:8000` (see [backend/README.md](../backend/README.md))

---

## Running Locally

```bash
cd frontend
npm install
npm run dev
```

App available at http://localhost:5173. Hot-reload enabled.

---

## Running with Docker

```bash
# From the repo root
docker compose up frontend
```

Source files are volume-mounted (`./frontend/src:/app/src`) — edits hot-reload inside the container.

---

## Build

```bash
npm run build    # outputs to dist/
npm run preview  # serves the dist/ build locally
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
    ├── main.jsx               React root — mounts App with providers
    ├── App.jsx                Auth gate: renders LoginPage or ChatPage
    ├── index.css              Tailwind directives only
    ├── api/
    │   ├── auth.ts            login(), register(), getMe()
    │   ├── chat.ts            sendMessage(), getSessions(), getToolCalls(), deleteSession()
    │   ├── documents.ts       uploadDocument(), listDocuments(), deleteDocument()
    │   └── profile.ts         getProfile(), updateProfile()
    ├── types/
    │   ├── auth.ts            User
    │   ├── chat.ts            ChatRequest, ChatResponse, SessionInfo, ToolCallInfo, SourceReference
    │   ├── document.ts        DocumentInfo
    │   └── profile.ts         UserProfile
    ├── context/
    │   ├── AuthContext.jsx    User session — login(), logout(), register()
    │   └── ThemeContext.jsx   Dark/light toggle, persists to localStorage
    ├── layouts/
    │   └── AppLayout.jsx      Sidebar + header + error banner wrapper
    ├── pages/
    │   ├── LoginPage.jsx      Username login + register form
    │   ├── ChatPage.jsx       Session management, message state, and all chat handlers
    │   ├── ProfilePage.jsx    Financial profile form
    │   └── AdminPage.jsx      Document upload and list
    └── components/
        ├── chat/
        │   ├── ChatWindow.jsx        Message list with scroll and loading indicator
        │   ├── ChatInput.jsx         Textarea + send button
        │   ├── MessageBubble.jsx     User/assistant bubble with tool badges
        │   ├── FormattedMessage.jsx  Markdown rendering + readiness score cards
        │   ├── ToolCallMessage.jsx   Collapsible tool call display (name, args, result)
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
- Username-only login — no password required
- First-time username → registration; subsequent → login
- Auth state in `AuthContext`, persisted to `localStorage` under `ra-user`

### Chat Sessions
- Each conversation is a unique UUID generated client-side on "New Chat"
- Sessions stored in `localStorage` and synced to PostgreSQL
- Sidebar groups sessions: **Today / Yesterday / Earlier**

### Agent Interrupt Handling
When the agent needs clarification, `status` returns `awaiting_clarification`:
- `ClarificationCard` renders inline with a text input
- User's answer is sent back via `resume_input` in the next request

### Activity Panel
Right-side panel (toggled per message) shows:
- Every tool call: name, arguments, result (collapsible JSON)
- Document sources: filename, page number, and excerpt

### Document Administration
Admin page (accessible from the sidebar) provides:
- Drag-and-drop or file-picker PDF upload
- Live list of ingested documents with chunk counts
- Delete removes document from ChromaDB, PostgreSQL, and disk

### Message Formatting
`FormattedMessage` renders a limited markdown subset:
- `**bold**`, `*italic*`, `` `code` ``, `#`/`##`/`###` headings, bullet and numbered lists
- JSON blocks containing a `readiness_score` field → styled readiness score card

### Dark / Light Mode
- Toggled via header button; saved to `localStorage` under `ra-theme`
- Defaults to dark mode

---

## API Integration

All functions in `src/api/` throw descriptive errors including the HTTP status and response body `detail`. The base URL defaults to `http://localhost:8000` — update the `BASE` constant in each API file for other deployment targets.
