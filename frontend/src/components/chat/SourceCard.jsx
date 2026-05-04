import { useState } from 'react'

export default function SourceCard({ source }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 overflow-hidden transition-all duration-150"
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
          className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0 mt-0.5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-[200px]">
              {source.filename}
            </span>
            <span className="shrink-0 text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700/50">
              Page {source.page + 1}
            </span>
          </div>
          {!expanded && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
              {source.excerpt}
            </p>
          )}
        </div>
        <span className="text-xs text-slate-400 shrink-0">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-slate-200 dark:border-slate-700/50">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
            {source.excerpt}
          </p>
        </div>
      )}
    </div>
  )
}
