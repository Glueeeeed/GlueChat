import { JSX } from 'react';
import { MoreVertical, Trash2, File, Download } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface ChatMessage {
  text: string;
  isImage: boolean;
  isVideo: boolean;
  isFile: boolean;
  isAuthor: boolean;
  timestamp: string;
  nickname: string;
  avatar: string | null;
  messageId: string;
  fileName?: string;
  fileSize?: number;
  onDelete?: (messageId: string) => void;
}

export function ChatMessage({ avatar, text, isImage, isVideo, isFile, isAuthor, timestamp, nickname, messageId, fileName, fileSize, onDelete }: ChatMessage): JSX.Element {
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

  const handleDownload = async () => {
    const displayName = fileName || 'file';
    await window.e2ee.downloadFile(text, displayName);
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
        <div
          ref={menuRef}
          className={`absolute ${isAuthor ? '-left-8' : '-right-8'} -top-2 opacity-0 group-hover:opacity-100 transition-opacity z-50`}
        >
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
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs text-red-400 hover:bg-white/5 transition-colors"
              >
                <Trash2 size={14} />
                Delete
              </button>

              {(isVideo || isFile || isImage) && (
                  <button
                    onClick={handleDownload}
                    className=" w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg  hover:bg-white/5 text-xs font-medium transition-colors"
                  >
                    <Download size={14} />
                    Download
                  </button>
                )}
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
            {isImage ? (
              <div className="flex flex-col gap-2">
                <img src={`glue-image://${text}`} alt="Chat image" style={{ maxWidth: '300px', borderRadius: '2px' }} />
              </div>
            ) : isVideo ? (
              <div className="flex flex-col gap-2">
                <video src={`glue-image://${text}`} controls style={{ maxWidth: '300px', borderRadius: '2px' }} />
                <button
                  onClick={handleDownload}
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium transition-colors self-center"
                >
                  <Download size={14} />
                  Download
                </button>
              </div>
            ) : isFile ? (
              <div className="flex flex-col gap-2 min-w-[250px]">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                    <File size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{fileName || 'file'}</p>
                    <p className="text-xs text-white/50">
                      {fileSize ? (fileSize < 1024 * 1024 ? `${(fileSize / 1024).toFixed(1)} KB` : `${(fileSize / (1024 * 1024)).toFixed(1)} MB`) : ''}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              text
            )}
          </div>
        </div>

        <div className={`text-[10px] flex flex-row items-center gap-1 font-medium px-1 text-gray-500 ${isAuthor ? 'justify-end' : 'justify-start'}`}>
          <span>{timestamp}</span>
        </div>
      </div>
    </div>
  );
}
