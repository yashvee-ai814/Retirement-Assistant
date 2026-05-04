import { useState, useCallback, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import Sidebar from '../components/navigation/Sidebar.jsx'
import ChatWindow from '../components/chat/ChatWindow.jsx'
import ChatInput from '../components/chat/ChatInput.jsx'
import ActivityPanel from '../components/chat/ActivityPanel.jsx'
import ProfilePage from './ProfilePage.jsx'
import AdminPage from './AdminPage.jsx'
import { sendMessage, resumeInterrupt, getSessions, clearSession, getSessionToolCalls, getSessionMessages } from '../api/chat.ts'
import { getProfile } from '../api/profile.ts'

function newSessionId() {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme()
  return (
    <button
      onClick={toggleTheme}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all duration-150"
    >
      {isDark ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>
  )
}

export default function ChatPage() {
  const { user, logout } = useAuth()
  const { isDark } = useTheme()

  const [currentPage, setCurrentPage] = useState('chat')
  const [sessions, setSessions] = useState([])
  const [currentSessionId, setCurrentSessionId] = useState(() => newSessionId())
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [pendingInterrupt, setPendingInterrupt] = useState(null)
  const [error, setError] = useState(null)
  const [profile, setProfile] = useState({})

  // Activity panel state: tool calls and sources for the current session
  const [sessionToolCalls, setSessionToolCalls] = useState([])
  const [sessionSources, setSessionSources] = useState([])

  const currentSessionIdRef = useRef(currentSessionId)

  const refreshSessions = useCallback(async () => {
    if (!user) return
    try {
      const data = await getSessions(user.user_id)
      setSessions(data)
    } catch {
      /* silently ignore */
    }
  }, [user])

  const refreshProfile = useCallback(async () => {
    if (!user) return
    try {
      const p = await getProfile(user.user_id)
      setProfile(p)
    } catch (err) {
      if (err instanceof Error && err.message.includes('404')) logout()
    }
  }, [user, logout])

  const fetchSessionActivity = useCallback(async (sessionId) => {
    try {
      const tcs = await getSessionToolCalls(sessionId)
      setSessionToolCalls(tcs)
    } catch {
      setSessionToolCalls([])
    }
  }, [])

  useEffect(() => {
    refreshSessions()
    refreshProfile()
  }, [refreshSessions, refreshProfile])

  const handleResponse = useCallback((response) => {
    const newMsgs = []
    const toolsWithResults = (response.tool_calls_used ?? []).filter((tc) => tc.result)
    if (toolsWithResults.length > 0) {
      newMsgs.push({ role: 'tool_calls', tools: toolsWithResults, timestamp: Date.now() })
    }
    if (response.reply) {
      newMsgs.push({
        role: 'assistant',
        content: response.reply,
        toolCallsUsed: response.tool_calls_used ?? [],
        sources: response.sources ?? [],
        timestamp: Date.now(),
      })
    }
    if (response.status === 'awaiting_clarification' && response.pending_interrupt?.question) {
      newMsgs.push({
        role: 'assistant',
        content: response.pending_interrupt.question,
        isQuestion: true,
        timestamp: Date.now(),
      })
    }
    if (newMsgs.length > 0) setMessages((prev) => [...prev, ...newMsgs])
    setPendingInterrupt(response.status === 'complete' ? null : response.pending_interrupt ?? null)

    // Update activity panel with new tool calls and sources from this response
    if (response.tool_calls_used?.length > 0) {
      fetchSessionActivity(currentSessionIdRef.current)
    }
    if (response.sources?.length > 0) {
      setSessionSources((prev) => {
        const existing = new Set(prev.map((s) => `${s.filename}:${s.page}`))
        const fresh = (response.sources ?? []).filter((s) => !existing.has(`${s.filename}:${s.page}`))
        return [...prev, ...fresh]
      })
    }

    refreshSessions()
    refreshProfile()
  }, [refreshSessions, refreshProfile, fetchSessionActivity])

  const handleSend = useCallback(async (text) => {
    setError(null)
    setMessages((prev) => [...prev, { role: 'user', content: text, timestamp: Date.now() }])
    setLoading(true)
    setPendingInterrupt(null)
    try {
      handleResponse(await sendMessage(currentSessionIdRef.current, user.user_id, text))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [handleResponse, user])

  const handleAnswer = useCallback(async (answer) => {
    setError(null)
    setMessages((prev) => [...prev, { role: 'user', content: answer, timestamp: Date.now() }])
    setLoading(true)
    setPendingInterrupt(null)
    try {
      handleResponse(await resumeInterrupt(currentSessionIdRef.current, user.user_id, { answer }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [handleResponse, user])

  const handleNewChat = useCallback(() => {
    const id = newSessionId()
    currentSessionIdRef.current = id
    setCurrentSessionId(id)
    setMessages([])
    setPendingInterrupt(null)
    setError(null)
    setSessionToolCalls([])
    setSessionSources([])
    setCurrentPage('chat')
  }, [])

  const handleSelectSession = useCallback(async (id) => {
    currentSessionIdRef.current = id
    setCurrentSessionId(id)
    setMessages([])
    setPendingInterrupt(null)
    setError(null)
    setSessionSources([])
    setCurrentPage('chat')

    const [rawMsgs] = await Promise.all([
      getSessionMessages(id).catch(() => []),
      fetchSessionActivity(id),
    ])

    const converted = []
    const sources = []
    const seenSources = new Set()

    for (const m of rawMsgs) {
      const ts = new Date(m.created_at).getTime()
      if (m.role === 'user') {
        converted.push({ role: 'user', content: m.content, timestamp: ts })
      } else if (m.role === 'assistant') {
        const toolCallsUsed = m.meta?.tool_calls_used ?? []
        const msgSources = m.meta?.sources ?? []
        const toolsWithResults = toolCallsUsed.filter((tc) => tc.result)
        if (toolsWithResults.length > 0) {
          converted.push({ role: 'tool_calls', tools: toolsWithResults, timestamp: ts - 1 })
        }
        converted.push({ role: 'assistant', content: m.content, toolCallsUsed, sources: msgSources, timestamp: ts })
        for (const s of msgSources) {
          const key = `${s.filename}:${s.page}`
          if (!seenSources.has(key)) { seenSources.add(key); sources.push(s) }
        }
      }
    }

    if (currentSessionIdRef.current === id) {
      setMessages(converted)
      setSessionSources(sources)
    }
  }, [fetchSessionActivity])

  const handleDeleteSession = useCallback(async (id) => {
    try { await clearSession(id) } catch { /* ignore */ }
    setSessions((prev) => prev.filter((s) => s.id !== id))
    if (id === currentSessionIdRef.current) handleNewChat()
  }, [handleNewChat])

  const currentSession = sessions.find((s) => s.id === currentSessionId)
  const inputDisabled = loading
  const onSend = pendingInterrupt?.type === 'clarification' ? handleAnswer : handleSend

  return (
    <div
      className="flex h-screen overflow-hidden bg-slate-50 dark:bg-transparent"
      style={isDark ? { background: 'linear-gradient(160deg, #060B18 0%, #0D1F3C 45%, #0A1628 100%)' } : undefined}
    >
      <Sidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        user={user}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
        onNavigate={setCurrentPage}
        currentPage={currentPage}
      />

      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <header className="shrink-0 h-14 flex items-center justify-between px-5 border-b border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate max-w-xs capitalize">
              {currentPage === 'chat' ? (currentSession?.title ?? 'New Chat') : currentPage}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ThemeToggle />
            <button
              onClick={logout}
              className="text-xs text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 px-2 py-1 rounded transition-colors"
            >
              Logout
            </button>
          </div>
        </header>

        {error && (
          <div className="shrink-0 bg-red-50 dark:bg-red-950/80 border-b border-red-200 dark:border-red-800/50 px-5 py-2.5 flex items-center justify-between text-sm text-red-700 dark:text-red-300">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 dark:hover:text-red-300 ml-4 text-lg leading-none">✕</button>
          </div>
        )}

        <div className="flex-1 overflow-hidden flex">
          {currentPage === 'chat' && (
            <>
              <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                <ChatWindow
                  messages={messages}
                  pendingInterrupt={pendingInterrupt}
                  loading={loading}
                  onSend={onSend}
                />
                <ChatInput onSend={onSend} disabled={inputDisabled} />
              </div>
              <ActivityPanel
                toolCalls={sessionToolCalls}
                sources={sessionSources}
              />
            </>
          )}
          {currentPage === 'profile' && (
            <div className="flex-1 overflow-y-auto">
              <ProfilePage />
            </div>
          )}
          {currentPage === 'admin' && (
            <div className="flex-1 overflow-y-auto">
              <AdminPage />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
