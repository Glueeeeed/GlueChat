import { Check, CheckCheck } from 'lucide-react'

interface ChatMessage {
  text: string
  isAuthor: boolean
  timestamp: string
  nickname: string
  isSeen?: boolean
}

export function ChatMessage({ isSeen, text, isAuthor, timestamp, nickname }: ChatMessage) {
  return (
    <div className={`flex gap-3 ${isAuthor ? 'flex-row-reverse' : 'flex-row'} mb-4 items-end`}>
      {!isAuthor && (
        <div className="w-8 h-8 shrink-0 rounded-full bg-linear-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold uppercase shadow-lg shadow-violet-900/20">
          {nickname.substring(0, 2)}
        </div>
      )}
      <div className="flex flex-col max-w-[75%] gap-1">
        <div
          className={`px-4 py-2.5 text-sm font-medium rounded-2xl shadow-sm ${
            isAuthor
              ? 'bg-linear-to-br from-violet-600 to-indigo-600 text-white rounded-br-none'
              : 'bg-white/10 text-gray-100 border border-white/5 rounded-bl-none'
          }`}
        >
          {text}
        </div>

        <div
          className={`text-[10px] flex flex-row items-center gap-1 font-medium px-1 text-gray-500 ${
            isAuthor ? 'justify-end' : 'justify-start'
          }`}
        >
          <span>{timestamp}</span>

          {isAuthor && (
            <span className="flex items-center">
              {isSeen ? (
                <CheckCheck size={14} className="text-indigo-400" />
              ) : (
                <Check size={14} className="text-gray-500" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
