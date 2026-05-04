import FormattedMessage from './FormattedMessage.jsx'
import ToolCallBadge from '../shared/ToolCallBadge.jsx'

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user'
  const isQuestion = message.isQuestion === true

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-5`}>
      {!isUser && (
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0 mr-2.5 mt-0.5 shadow-lg ${
          isQuestion
            ? 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/20'
            : 'bg-gradient-to-br from-amber-500 to-yellow-600 shadow-amber-500/20'
        }`}>
          {isQuestion ? '?' : 'RA'}
        </div>
      )}

      <div className={`max-w-[78%] flex flex-col gap-1.5 ${isUser ? 'items-end' : 'items-start'}`}>
        {isQuestion && (
          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 px-1">Clarification needed</span>
        )}
        <div
          className={`px-4 py-3 rounded-2xl ${
            isUser
              ? 'bg-gradient-to-br from-indigo-600 to-violet-700 text-white rounded-tr-sm shadow-lg shadow-indigo-900/20'
              : isQuestion
                ? 'bg-blue-50 border border-blue-200 text-slate-800 rounded-tl-sm shadow-sm dark:bg-blue-950/40 dark:border-blue-800/40 dark:text-slate-200'
                : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm dark:bg-slate-800/80 dark:border-slate-700/50 dark:text-slate-200'
          }`}
        >
          <FormattedMessage content={message.content} isUser={isUser} />
        </div>

        {!isUser && message.toolCallsUsed?.length > 0 && !isQuestion && (
          <div className="flex flex-wrap gap-1.5 px-1">
            {message.toolCallsUsed.map((tc, i) => (
              <ToolCallBadge key={i} name={tc.name} />
            ))}
          </div>
        )}
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 dark:bg-slate-700 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 text-xs font-bold shrink-0 ml-2.5 mt-0.5">
          Y
        </div>
      )}
    </div>
  )
}
