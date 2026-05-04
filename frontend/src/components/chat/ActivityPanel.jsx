import { useState } from 'react'

function ToolIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-amber-500 shrink-0">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function SourceIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-indigo-500 shrink-0">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  )
}

function formatArgs(args) {
  return Object.entries(args)
    .map(([k, v]) => {
      const key = k.replace(/_/g, ' ')
      const val = typeof v === 'number' && v > 100 ? `£${Number(v).toLocaleString('en-GB')}` : String(v)
      return `${key}: ${val}`
    })
    .join('\n')
}

function formatResult(result) {
  if (!result) return null
  try {
    const parsed = JSON.parse(result)
    if (typeof parsed === 'object') {
      return Object.entries(parsed)
        .map(([k, v]) => {
          const key = k.replace(/_/g, ' ')
          const val = typeof v === 'number' && v > 100 ? `£${Number(v).toLocaleString('en-GB')}` : String(v)
          return `${key}: ${val}`
        })
        .join('\n')
    }
  } catch {}
  return result
}

function ToolCallRow({ tc, index }) {
  const [open, setOpen] = useState(false)
  const hasResult = Boolean(tc.result)

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors bg-white dark:bg-slate-900/40"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <ToolIcon />
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
            {tc.name.replace(/_/g, ' ')}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {hasResult && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Has result" />}
          <span className="text-xs text-slate-400 dark:text-slate-500">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-200 dark:border-slate-700/40 divide-y divide-slate-100 dark:divide-slate-700/30">
          <div className="px-3 py-2 bg-slate-50 dark:bg-slate-950/30">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">Inputs</p>
            <pre className="text-xs font-mono whitespace-pre-wrap leading-relaxed text-slate-600 dark:text-slate-400">
              {formatArgs(tc.args)}
            </pre>
          </div>
          {hasResult && (
            <div className="px-3 py-2 bg-slate-50/50 dark:bg-slate-950/20">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">Result</p>
              <pre className="text-xs font-mono whitespace-pre-wrap leading-relaxed text-amber-700 dark:text-amber-300/80">
                {formatResult(tc.result)}
              </pre>
            </div>
          )}
          {tc.created_at && (
            <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950/30">
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {new Date(tc.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SourceRow({ src }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors bg-white dark:bg-slate-900/40"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <SourceIcon />
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{src.filename}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">Page {src.page}</p>
          </div>
        </div>
        <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0 ml-2">{open ? '▲' : '▼'}</span>
      </button>

      {open && src.excerpt && (
        <div className="border-t border-slate-200 dark:border-slate-700/40 px-3 py-2 bg-slate-50 dark:bg-slate-950/30">
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic">"{src.excerpt}…"</p>
        </div>
      )}
    </div>
  )
}

export default function ActivityPanel({ toolCalls, sources }) {
  const [tab, setTab] = useState('tools')
  const hasTools = toolCalls.length > 0
  const hasSources = sources.length > 0
  const isEmpty = !hasTools && !hasSources

  return (
    <div className="w-72 shrink-0 flex flex-col h-full border-l border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
      <div className="px-4 py-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Session Activity</h2>
      </div>

      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setTab('tools')}
          className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
            tab === 'tools'
              ? 'text-amber-600 dark:text-amber-400 border-b-2 border-amber-500'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          Tools {hasTools && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs">{toolCalls.length}</span>}
        </button>
        <button
          onClick={() => setTab('sources')}
          className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
            tab === 'sources'
              ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-500'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          Sources {hasSources && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs">{sources.length}</span>}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full text-center pb-8">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5 text-slate-400">
                <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
              </svg>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500">No activity yet</p>
            <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">Tool calls and sources will appear here</p>
          </div>
        )}

        {tab === 'tools' && toolCalls.map((tc, i) => (
          <ToolCallRow key={tc.id ?? i} tc={tc} index={i} />
        ))}

        {tab === 'sources' && sources.map((src, i) => (
          <SourceRow key={i} src={src} />
        ))}

        {tab === 'tools' && !hasTools && !isEmpty && (
          <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-6">No tool calls in this session</p>
        )}
        {tab === 'sources' && !hasSources && !isEmpty && (
          <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-6">No document sources cited</p>
        )}
      </div>
    </div>
  )
}
