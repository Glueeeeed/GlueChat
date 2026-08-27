import { useState, useRef, useEffect, JSX } from 'react';
import { Send, Smile } from 'lucide-react';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
}

export function ChatInput({ onSendMessage }: ChatInputProps): JSX.Element {
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = (): void => {
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
      setShowEmojiPicker(false);
    }
  };

  const handleEmojiClick = (emojiData: EmojiClickData): void => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setMessage((prev) => prev + emojiData.emoji);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const textBefore = message.substring(0, start);
    const textAfter = message.substring(end);

    const newMessage = textBefore + emojiData.emoji + textAfter;
    setMessage(newMessage);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emojiData.emoji.length, start + emojiData.emoji.length);
    }, 0);
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [message]);

  return (
    <div className="p-4 bg-gray-950/20 border-t border-white/5 backdrop-blur-sm relative">
      {showEmojiPicker && (
        <div ref={pickerRef} className="absolute bottom-20 left-4 z-50 shadow-2xl">
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            searchDisabled={true}
            skinTonesDisabled={true}
            theme={Theme.DARK}
            lazyLoadEmojis={true}
            width={320}
            height={400}
            style={
              {
                '--epr-bg-color': '#060b1e',
                '--epr-category-label-bg-color': '#060b1e',
                '--epr-picker-border-color': 'rgba(255, 255, 255, 0.08)',
                '--epr-search-input-bg-color': '#0f172a',
                '--epr-search-input-bg-color-hover': '#1e293b',
                '--epr-search-input-border-color': 'rgba(255, 255, 255, 0.1)',
                '--epr-search-input-text-color': '#f3f4f6',
                '--epr-search-input-placeholder-color': '#6b7280',
                '--epr-hover-bg-color': '#200e47',
                '--epr-focus-bg-color': '#2e1a4b',
                '--epr-highlight-color': '#7c3aed',
                '--epr-scrollbar-track-color': '#0f172a',
                '--epr-scrollbar-color': '#200e47'
              } as React.CSSProperties
            }
          />
        </div>
      )}

      <div className="max-w-4xl mx-auto flex items-end gap-3">
        <div className="flex-1 relative group">
          <textarea
            ref={textareaRef}
            rows={1}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="w-full bg-white/5 text-gray-100 placeholder:text-gray-500 rounded-2xl px-3 py-2.5 focus:outline-hidden focus:ring-1 focus:ring-violet-500/50 resize-none transition-all"
          />
        </div>

        <button
          type="button"
          onClick={() => setShowEmojiPicker((prev) => !prev)}
          className="p-3 mb-1 rounded-2xl text-gray-400 hover:text-white hover:bg-white/5 transition-all flex-shrink-0"
        >
          <Smile size={22} />
        </button>

        <button
          onClick={handleSend}
          disabled={!message.trim()}
          className="p-3 mb-1 rounded-2xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:hover:bg-violet-600 text-white transition-all shadow-lg shadow-violet-600/20 flex-shrink-0"
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}
