import { useEffect, useRef } from 'react'
import MessageBubble from './MessageBubble.jsx'
import ToolCallMessage from './ToolCallMessage.jsx'
import WelcomeScreen from './WelcomeScreen.jsx'
import SourceCard from './SourceCard.jsx'

export default function ChatWindow({ messages, pendingInterrupt, loading, onSend }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, pendingInterrupt, loading])

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-thin">
      {messages.length === 0 && !loading ? (
        <WelcomeScreen onSend={onSend} />
      ) : (
        messages.map((msg, i) =>
          msg.role === 'tool_calls' ? (
            <ToolCallMessage key={i} tools={msg.tools} />
          ) : (
            <div key={i}>
              <MessageBubble message={msg} />
              {msg.role === 'assistant' && msg.sources?.length > 0 && (
                <div className="ml-10 mb-3 space-y-1.5">
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1.5 px-1">
                    Sources
                  </p>
                  {msg.sources.map((src, j) => (
                    <SourceCard key={j} source={src} />
                  ))}
                </div>
              )}
            </div>
          )
        )
      )}

      {loading && (
        <div className="flex justify-start mb-4">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-white text-xs font-bold shrink-0 mr-2.5 mt-0.5 shadow-lg shadow-amber-500/20">
            RA
          </div>
          <div className="px-4 py-3.5 bg-white border border-slate-200 dark:bg-slate-800/80 dark:border-slate-700/50 rounded-2xl rounded-tl-sm shadow-sm">
            <div className="flex gap-1.5 items-center">
              {[0, 150, 300].map((delay) => (
                <span
                  key={delay}
                  className="w-2 h-2 bg-amber-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
