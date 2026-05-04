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

export default function ToolCallMessage({ tools }) {
  const [expanded, setExpanded] = useState(null)

  return (
    <div className="flex justify-start mb-3">
      <div className="w-8 shrink-0 mr-2.5" />
      <div className="max-w-[78%] w-full">
        <div className="rounded-xl border overflow-hidden bg-slate-50 border-slate-200 dark:bg-slate-900/60 dark:border-slate-700/50">
          <div className="px-3 py-2 flex items-center gap-2 border-b border-slate-200 dark:border-slate-700/50">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-amber-500 shrink-0">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {tools.length} tool{tools.length !== 1 ? 's' : ''} executed
            </span>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-slate-700/30">
            {tools.map((tc, i) => (
              <div key={i}>
                <button
                  className="w-full flex items-center justify-between px-3 py-2 text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/50"
                  onClick={() => setExpanded(expanded === i ? null : i)}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      {tc.name.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {expanded === i ? '▲ hide' : '▼ expand'}
                  </span>
                </button>

                {expanded === i && (
                  <div className="px-3 pb-3 pt-1 space-y-2.5 bg-slate-100/50 dark:bg-slate-950/30 border-t border-slate-200 dark:border-slate-700/40">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider mb-1 text-slate-400 dark:text-slate-500">Inputs</p>
                      <pre className="text-xs font-mono whitespace-pre-wrap leading-relaxed text-slate-600 dark:text-slate-400">
                        {formatArgs(tc.args)}
                      </pre>
                    </div>
                    {tc.result && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider mb-1 text-slate-400 dark:text-slate-500">Result</p>
                        <pre className="text-xs font-mono whitespace-pre-wrap leading-relaxed text-amber-700 dark:text-amber-300/80">
                          {tc.result}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
