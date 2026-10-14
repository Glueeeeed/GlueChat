import { JSX } from 'react';

interface ChatMessage {
  isDecryptionError: boolean;
  text?: string;
  errorMessage: string;
  timestamp: string;
  nickname: string;
  avatar: string | null;
}

export function ChatErrorMessage({ avatar, text, isDecryptionError, errorMessage, timestamp, nickname }: ChatMessage): JSX.Element {
  return (
    <div className={`flex gap-3 ${!isDecryptionError ? 'flex-row-reverse' : 'flex-row'} mb-4 items-end`}>
      {isDecryptionError &&
        (avatar ? (
          <img className={'w-9 h-9 rounded-full'} src={avatar} alt={nickname} />
        ) : (
          <div className="w-9 h-9 rounded-full bg-linear-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold uppercase">
            {nickname.substring(0, 2)}
          </div>
        ))}
      <div className="flex flex-col max-w-[75%] gap-1">
        <div
          className={`px-4 py-2.5 text-sm font-medium rounded-2xl shadow-sm ${
            !isDecryptionError
              ? 'bg-violet-950/40  text-gray-300 rounded-br-none opacity-75'
              : 'bg-white/10 text-gray-400 border text-xs border-white/5 rounded-bl-none'
          }`}
        >

          {isDecryptionError ? errorMessage : text}

        </div>

        <div
          className={`text-[10px] flex flex-row items-center gap-1 font-medium px-1 text-gray-500 ${!isDecryptionError ? 'justify-end' : 'justify-start'}`}
        >
          <span>{timestamp}</span>
          {!isDecryptionError && (
            <span className="text-red-400 flex items-center gap-1 font-semibold">
              {errorMessage}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
