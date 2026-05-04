import { useMemo } from 'react'

function groupByDate(sessions) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yesterday = today - 86400000
  const groups = { Today: [], Yesterday: [], Earlier: [] }
  for (const s of [...sessions].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))) {
    const d = new Date(s.updated_at)
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
    if (dayStart >= today) groups.Today.push(s)
    else if (dayStart >= yesterday) groups.Yesterday.push(s)
    else groups.Earlier.push(s)
  }
  return groups
}

function NavLink({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-100 ${
        active
          ? 'bg-amber-50 text-amber-800 border border-amber-200/60 font-medium dark:bg-slate-700 dark:text-white dark:border-transparent'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800'
      }`}
    >
      <span className="w-4 h-4 shrink-0">{icon}</span>
      {label}
    </button>
  )
}

export default function Sidebar({
  sessions,
  currentSessionId,
  user,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onNavigate,
  currentPage,
}) {
  const grouped = useMemo(() => groupByDate(sessions), [sessions])

  return (
    <div className="w-64 shrink-0 flex flex-col h-full border-r bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-800">
      <div className="px-4 py-5 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center shadow-md shadow-amber-500/20">
            <span className="text-xs font-bold text-white font-display">RA</span>
          </div>
          <div>
            <span className="font-display font-bold text-sm text-amber-600 dark:text-amber-400">Retirement Assistant</span>
            <p className="text-xs text-slate-400 dark:text-slate-500 leading-none mt-0.5">UK Pension Guidance</p>
          </div>
        </div>
      </div>

      <div className="px-3 py-3">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 shadow-sm dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 dark:text-slate-300 dark:hover:text-white"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path d="M12 5v14M5 12h14" strokeLinecap="round"/>
          </svg>
          New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {sessions.length === 0 ? (
          <p className="text-xs text-center mt-6 text-slate-400 dark:text-slate-600">No previous chats</p>
        ) : (
          Object.entries(grouped).map(([label, items]) =>
            items.length === 0 ? null : (
              <div key={label} className="mb-3">
                <p className="text-xs font-semibold px-2 py-1.5 uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {label}
                </p>
                {items.map((session) => (
                  <div
                    key={session.id}
                    className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all duration-100 mb-0.5 ${
                      session.id === currentSessionId
                        ? 'bg-amber-50 text-amber-900 border border-amber-200/60 dark:bg-slate-700 dark:text-white dark:border-transparent'
                        : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900 dark:hover:bg-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                    onClick={() => onSelectSession(session.id)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5 shrink-0 opacity-50">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    <span className="text-xs flex-1 truncate">{session.title || 'New conversation'}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id) }}
                      className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400"
                      title="Delete"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14H6L5 6"/>
                        <path d="M10 11v6M14 11v6"/>
                        <path d="M9 6V4h6v2"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )
          )
        )}
      </div>

      <div className="px-3 py-3 border-t border-slate-200 dark:border-slate-800 space-y-1">
        <NavLink
          active={currentPage === 'chat'}
          onClick={() => onNavigate('chat')}
          label="Chat"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          }
        />
        <NavLink
          active={currentPage === 'profile'}
          onClick={() => onNavigate('profile')}
          label="My Profile"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          }
        />
        <NavLink
          active={currentPage === 'admin'}
          onClick={() => onNavigate('admin')}
          label="Documents"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          }
        />
      </div>

      <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800">
        {user && (
          <p className="text-xs text-slate-500 dark:text-slate-500 truncate mb-1 font-medium">{user.username}</p>
        )}
        <p className="text-xs text-slate-400 dark:text-slate-600 leading-relaxed">
          Not financial advice · Local AI
        </p>
      </div>
    </div>
  )
}
