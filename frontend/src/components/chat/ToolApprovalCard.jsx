import { useState } from 'react'

function formatArgs(args) {
  return Object.entries(args)
    .map(([k, v]) => {
      const key = k.replace(/_/g, ' ')
      const val = typeof v === 'number' && v > 100 ? `£${Number(v).toLocaleString('en-GB')}` : String(v)
      return `${key}: ${val}`
    })
    .join('\n')
}

export default function ToolApprovalCard({ pendingInterrupt, onApprove, onReject, loading }) {
  const [expanded, setExpanded] = useState(null)
  const count = pendingInterrupt.tool_calls?.length ?? 0

  return (
    <div className="mx-1 mb-4 rounded-2xl border border-amber-400/30 dark:border-amber-500/20 bg-amber-50 dark:bg-slate-800/70 backdrop-blur overflow-hidden shadow-lg dark:shadow-xl dark:shadow-black/30">
      <div className="px-4 py-3 border-b border-amber-300/30 dark:border-amber-500/10 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-500/10 border border-amber-300/50 dark:border-amber-500/20 flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400">
            <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Calculation approval required</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{count} tool{count !== 1 ? 's' : ''} ready to run</p>
        </div>
      </div>

      <div className="px-4 py-3 space-y-2">
        {pendingInterrupt.tool_calls?.map((tc, i) => (
          <div key={i} className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/50 overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              onClick={() => setExpanded(expanded === i ? null : i)}
            >
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-amber-500 shrink-0">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{tc.name.replace(/_/g, ' ')}</span>
              </div>
              <span className="text-xs text-slate-400 dark:text-slate-500">{expanded === i ? '▲' : '▼ view args'}</span>
            </button>
            {expanded === i && (
              <pre className="px-3 pb-3 pt-1 text-xs text-slate-500 dark:text-slate-400 font-mono whitespace-pre-wrap bg-slate-50 dark:bg-slate-950/40 border-t border-slate-200 dark:border-slate-700/40 leading-relaxed">
                {formatArgs(tc.args)}
              </pre>
            )}
          </div>
        ))}
      </div>

      <div className="px-4 pb-4 flex gap-2.5">
        <button
          onClick={onApprove}
          disabled={loading}
          className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-all duration-150 shadow-lg shadow-emerald-500/20"
        >
          ✓ Approve &amp; Run
        </button>
        <button
          onClick={onReject}
          disabled={loading}
          className="flex-1 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-40 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-sm font-semibold rounded-xl transition-all duration-150"
        >
          ✕ Reject
        </button>
      </div>
    </div>
  )
}
