import { ChatInput } from "./ChatInput";
import { Info, MoreVertical } from "lucide-react";
import {ChatMessage} from "@renderer/components/app/ChatMessage";
import {useEffect, useRef, useState} from "react";

interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  isAuthor: boolean;
}

interface ChatViewProps {
  chatID: string;
  chatName: string;
  authKey: string;
  chatPublicKey: string;
}

export function ChatView({  chatPublicKey, authKey, chatID, chatName }: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:3000/api/ws");
    socketRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'join-chat',
        chatID: chatID,
        payload: {}
      }));
    };

    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'receive-message') {
        const currentNickname = localStorage.getItem('nickname') || 'User';
        const decryptedText = await window.e2ee.decryptMessage(data.payload, currentNickname);

        if (decryptedText) {
          setMessages(prev => [...prev, {
            id: Math.random().toString(),
            sender: "Other",
            content: decryptedText,
            timestamp: new Date().toLocaleTimeString(),
            isAuthor: false
          }]);
        }
      }
    };

    return () => ws.close();
  }, [chatID]);




  const handleSendMessage = async (message: string) => {
    const result = await window.e2ee.initializeEncryptMessage(chatPublicKey, message, chatID);

    if (result && socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'send-message',
        chatID: chatID,
        payload: result
      }));

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender: localStorage.getItem('nickname') || 'Me',
        content: message,
        timestamp: new Date().toLocaleTimeString(),
        isAuthor: true
      }]);
    }
  };

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      <header className="px-6 py-4 border-b border-white/5 bg-gray-950/40 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-linear-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold">
            {chatName.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-100">{chatName}</h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-px h-4 bg-white/10 mx-1" />
          <button className="p-2 text-gray-400 hover:text-gray-100 hover:bg-white/5 rounded-lg transition-all">
            <MoreVertical size={18} />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
            <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center mb-4">
               <Info size={32} />
            </div>
            <p className="text-sm font-medium uppercase tracking-widest">No messages yet</p>
            <p className="text-xs mt-2 max-w-50">Send a message to start the conversation with {chatName}</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {messages.map((m) => (
               <ChatMessage key={m.id} text={m.content} isAuthor={m.isAuthor} timestamp={m.timestamp} nickname={m.sender} />
            ))}
          </div>
        )}
      </div>

      <ChatInput onSendMessage={handleSendMessage} />
    </div>
  );
}
