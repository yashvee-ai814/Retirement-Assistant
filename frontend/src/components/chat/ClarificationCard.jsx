import { useState } from 'react'

export default function ClarificationCard({ pendingInterrupt, onAnswer, loading }) {
  const [answer, setAnswer] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!answer.trim()) return
    onAnswer(answer.trim())
    setAnswer('')
  }

  return (
    <div className="mx-1 mb-4 rounded-2xl border border-blue-500/20 bg-slate-800/70 backdrop-blur overflow-hidden shadow-xl shadow-black/30">
      <div className="px-4 py-3 border-b border-blue-500/10 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-blue-400">
            <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01" strokeLinecap="round"/>
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-blue-300">One more detail needed</p>
          <p className="text-xs text-slate-400">The advisor needs your input to continue</p>
        </div>
      </div>

      <div className="px-4 py-3">
        <p className="text-sm text-slate-200 leading-relaxed mb-3">{pendingInterrupt.question}</p>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Your answer…"
            disabled={loading}
            autoFocus
            className="flex-1 px-3.5 py-2.5 text-sm bg-slate-900/80 border border-slate-700 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none disabled:opacity-40 transition-colors"
          />
          <button
            type="submit"
            disabled={loading || !answer.trim()}
            className="px-4 py-2.5 bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-600 hover:to-blue-500 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-all duration-150 shadow-lg shadow-blue-900/40"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  )
}
