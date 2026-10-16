import { JSX } from 'react';
import { MoreVertical, Trash2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface ChatMessage {
  text: string;
  isAuthor: boolean;
  timestamp: string;
  nickname: string;
  avatar: string | null;
  messageId: string;
  onDelete?: (messageId: string) => void;
}

export function ChatMessage({ avatar, text, isAuthor, timestamp, nickname, messageId, onDelete }: ChatMessage): JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDelete = () => {
    if (onDelete) onDelete(messageId);
    setMenuOpen(false);
  };

  return (
    <div className={`flex gap-3 ${isAuthor ? 'flex-row-reverse' : 'flex-row'} mb-4 items-end`}>
      {!isAuthor &&
        (avatar ? (
          <img className={'w-9 h-9 rounded-full'} src={avatar} alt={nickname} />
        ) : (
          <div className="w-9 h-9 rounded-full bg-linear-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold uppercase">
            {nickname.substring(0, 2)}
          </div>
        ))}
      <div className="flex flex-col max-w-[75%] gap-1 relative group">
        <div ref={menuRef} className={`absolute ${isAuthor ? '-left-8' : '-right-8'} -top-2 opacity-0 group-hover:opacity-100 transition-opacity z-50`}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10 text-gray-400 hover:text-gray-200 transition-colors"
          >
            <MoreVertical size={14} />
          </button>

          {menuOpen && (
            <div
              className={`absolute ${isAuthor ? '-left-12' : '-right-10'} top-8 bg-gray-900 border border-white/10 rounded-lg shadow-lg py-1 z-50 min-w-[140px] mr-2`}
            >
              <button
                onClick={handleDelete}
                className="w-full flex items-center gap-2 px-4 py-2 text-xs text-red-400 hover:bg-white/5 transition-colors"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center">
          <div
            className={`px-4 py-2.5 text-sm font-medium rounded-2xl shadow-sm ${
              isAuthor
                ? 'bg-linear-to-br from-violet-600 to-indigo-600 text-white rounded-br-none'
                : 'bg-white/10 text-gray-100 border border-white/5 rounded-bl-none'
            }`}
          >
            {text}
          </div>
        </div>

        <div className={`text-[10px] flex flex-row items-center gap-1 font-medium px-1 text-gray-500 ${isAuthor ? 'justify-end' : 'justify-start'}`}>
          <span>{timestamp}</span>
        </div>
      </div>
    </div>
  );
}
