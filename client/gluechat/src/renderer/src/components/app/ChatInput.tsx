import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (message: string) => void;

}

export function ChatInput({onSendMessage }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage("");
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [message]);

  return (
    <div className="p-4 bg-gray-950/20 border-t border-white/5 backdrop-blur-sm">
      <div className="max-w-4xl mx-auto flex items-end gap-3">

        <div className="flex-1 relative group">
          <textarea
            ref={textareaRef}
            rows={1}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="w-full bg-white/5 text-gray-100 placeholder:text-gray-500 rounded-2xl px-3 py-2.5 pr-12 focus:outline-hidden focus:ring-1 focus:ring-violet-500/50 resize-none transition-all"
          />
        </div>

        <button
          onClick={handleSend}
          disabled={!message.trim()}
          className="p-3 mb-2 rounded-2xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:hover:bg-violet-600 text-white transition-all shadow-lg shadow-violet-600/20"
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}
