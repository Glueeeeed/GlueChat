import {FaSearch} from "react-icons/fa";
import {useEffect, useState} from "react";
import {loadChats} from "@renderer/assets/main";

interface ChatInfo {
  id: string;
  name: string;
  status: "online" | "offline";
  unread: boolean;
  unreadCount: number;
  senderID: string;
  receiverID: string;
}



interface ChatProps {
  authToken: string | null
  selectedChat: string
  setSelectedChat: (selectedChat: string) => void
  setSelectedChatName: (name: string) => void
  setReceiverID: (receiverID: string) => void
  setSenderID: (senderID: string) => void
}

export function ChatList({setSenderID ,setReceiverID,authToken, selectedChat, setSelectedChat, setSelectedChatName}: ChatProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [chats, setChats] = useState<ChatInfo[]>([])


  useEffect(() => {
    const fetchChats = async () => {
      if (authToken) {
        try {
          const data = await loadChats(authToken);
          console.log(data);
          setChats(data as ChatInfo[]);
        } catch (error) {
          console.error("Failed to load chats", error);
        }
      }
    };
    fetchChats();
  }, [authToken]);

  const setSelectedChatData = (selectedChat: string , selectedChatName: string , senderID: string, receiverID) => {
    setSelectedChat(selectedChat);
    setSelectedChatName(selectedChatName);
    setSenderID(senderID);
    setReceiverID(receiverID);
  }

  const filteredChats = chats.filter((chat) => {
    return chat.name.toLowerCase().includes(searchTerm.toLowerCase())
  })


  return (
    <div className="flex flex-col h-full w-full">
      <div className="p-4 space-y-4">
        <h2 className="text-xl font-bold tracking-tight text-white uppercase">Chats</h2>

        <div className="relative group">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-violet-900 transition-colors" size={14} />
          <input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-950/50 border border-white/5 text-sm text-white pl-10 pr-4 py-2 rounded-xl focus:ring-2 focus:ring-violet-500/30 outline-none transition-all placeholder-gray-600 shadow-inner"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-gray-900/50 [&::-webkit-scrollbar-thumb]:bg-violet-950 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-violet-900">


        {filteredChats.length > 0 ? (
          filteredChats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => setSelectedChatData(chat.id, chat.name, chat.senderID, chat.receiverID) }
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group mb-1 ${
                selectedChat === chat.id
                  ? 'bg-violet-500/10 border border-violet-500/20 shadow-[0_0_15px_-5px_rgba(59,130,246,0.3)]'
                  : 'hover:bg-white/5 border border-transparent hover:border-white/5'
              }`}
            >
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-linear-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold uppercase">
                  {chat.name.substring(0, 2)}
                </div>
                {chat.status === "online" && (
                  <div
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-900 bg-violet-500`}
                  />
                )}
              </div>

              <div className="flex flex-col items-start">
                <span className={`font-semibold text-sm transition-colors ${
                  selectedChat === chat.id ? 'text-white' : 'text-gray-300 group-hover:text-white'
                }`}>
                  {chat.name}
                </span>
                <p className="text-gray-600 text-xs">Send the first message to {chat.name}</p>
              </div>
            </button>
          ))
        ) : (
            <div className="flex flex-col items-center justify-center h-40 opacity-30">
              <p className="text-xs uppercase font-bold">No Chats found</p>
            </div>
        )}
      </div>
    </div>
  )
}
