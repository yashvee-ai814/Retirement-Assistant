import { useTheme } from '../context/ThemeContext.jsx'
import Sidebar from '../components/navigation/Sidebar.jsx'

export default function AppLayout({
  sessions,
  currentSessionId,
  sessionTitle,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  headerRight,
  error,
  onDismissError,
  children,
}) {
  const { isDark } = useTheme()

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={isDark ? { background: 'linear-gradient(160deg, #060B18 0%, #0D1F3C 45%, #0A1628 100%)' } : undefined}
    >
      <Sidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={onSelectSession}
        onNewChat={onNewChat}
        onDeleteSession={onDeleteSession}
        onNavigate={() => {}}
        currentPage="chat"
      />

      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="shrink-0 h-14 flex items-center justify-between px-5 border-b border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate max-w-xs">
              {sessionTitle ?? 'New Chat'}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {headerRight}
          </div>
        </header>

        {error && (
          <div className="shrink-0 bg-red-50 dark:bg-red-950/80 border-b border-red-200 dark:border-red-800/50 px-5 py-2.5 flex items-center justify-between text-sm text-red-700 dark:text-red-300">
            <span>{error}</span>
            <button
              onClick={onDismissError}
              className="text-red-400 hover:text-red-600 dark:hover:text-red-300 ml-4 text-lg leading-none"
            >
              ✕
            </button>
          </div>
        )}

        {children}
      </div>
    </div>
  )
}
