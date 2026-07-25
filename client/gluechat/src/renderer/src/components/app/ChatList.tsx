import { FaSearch } from 'react-icons/fa'
import React, { useState } from 'react'
import { loadChats } from '@renderer/assets/main'
import { checkIfAssetExists } from '@renderer/assets/profile'
import { useQuery } from '@tanstack/react-query'


interface ChatInfo {
  id: string;
  name: string;
  status: "online" | "offline";
  unread: boolean;
  unreadCount: number;
  senderID: string;
  receiverID: string;
}

interface FetchChatsResponse {
  chats: ChatInfo[]
  userAvatar: Record<string, string | null>
  lastMessages: Record<string, string>
}



interface ChatProps {
  authToken: string | null
  selectedChat: string
  setSelectedChat: (selectedChat: string) => void
  setSelectedChatName: (name: string) => void
  setReceiverID: (receiverID: string) => void
  setSenderID: (senderID: string) => void
}

export function ChatList({setSenderID ,setReceiverID,authToken, selectedChat, setSelectedChat, setSelectedChatName}: ChatProps) : React.JSX.Element {
  const [searchTerm, setSearchTerm] = useState('');

  const { data } = useQuery<FetchChatsResponse | null>({
    queryKey: ['chats', authToken],
    queryFn: () : Promise<FetchChatsResponse | null>   => fetchChats(),
    enabled: !!authToken,
    staleTime: 1000 * 60 * 5
  })


  const fetchChats = async () : Promise<FetchChatsResponse | null> => {
    if (!authToken) return null;

    const rawData = await loadChats(authToken);
    const chatsData = rawData as ChatInfo[];

    const messagesMap: Record<string, string> = {};
    const userAvatarMap: Record<string, string | null> = {};

    await Promise.all(
      chatsData.map(async (chat) => {
        userAvatarMap[chat.receiverID] = await checkIfAssetExists('avatar', chat.receiverID);
        const currentNickname : string = localStorage.getItem('nickname') || 'User';

        const lastMsg = await window.e2ee.getLastMessage(chat, currentNickname);
        if (lastMsg) {
          const formattedLastMessage = lastMsg.content.length > 20 ? lastMsg.content.slice(0, 20) + '...' : lastMsg.content;

          messagesMap[chat.id] = lastMsg.isAuthor ? `You: ${formattedLastMessage}` : `${lastMsg.senderName}: ${formattedLastMessage}`;
        }
      })
    )

    return {
      chats: chatsData,
      userAvatar: userAvatarMap,
      lastMessages: messagesMap
    }
  }

  const setSelectedChatData = (selectedChat: string , selectedChatName: string , senderID: string, receiverID) : void => {
    setSelectedChat(selectedChat);
    setSelectedChatName(selectedChatName);
    setSenderID(senderID);
    setReceiverID(receiverID);
  }
  const filteredChats : ChatInfo[] = (data?.chats || []).filter((chat) : boolean => {
    return chat.name.toLowerCase().includes(searchTerm.toLowerCase());
  })


  return (
    <div className="flex flex-col h-full w-full">
      <div className="p-4 space-y-4">
        <h2 className="text-xl font-bold tracking-tight text-white uppercase">Chats</h2>

        <div className="relative group">
          <FaSearch
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-violet-900 transition-colors"
            size={14}
          />
          <input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-950/50 border border-white/5 text-sm text-white pl-10 pr-4 py-2 rounded-xl focus:ring-2 focus:ring-violet-500/30 outline-none transition-all placeholder-gray-600 shadow-inner"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4 ">
        {filteredChats.length > 0 ? (
          filteredChats.map((chat) => (
            <button
              key={chat.id}
              onClick={() =>
                setSelectedChatData(chat.id, chat.name, chat.senderID, chat.receiverID)
              }
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group mb-1 ${
                selectedChat === chat.id
                  ? 'bg-violet-500/10 border border-violet-500/20 shadow-[0_0_15px_-5px_rgba(59,130,246,0.3)]'
                  : 'hover:bg-white/5 border border-transparent hover:border-white/5'
              }`}
            >
              <div className="relative">
                {data?.userAvatar[chat.receiverID] ? (
                  <img
                    className={'w-9 h-9 rounded-full object-cover'}
                    src={`${data.userAvatar[chat.receiverID]}?t=${Date.now()}`}
                    alt={chat.name}
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-linear-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold uppercase">
                    {chat.name.substring(0, 2)}
                  </div>
                )}
                {chat.status === 'online' && (
                  <div
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-900 bg-violet-500`}
                  />
                )}
              </div>

              <div className="flex flex-col items-start">
                <span
                  className={`font-semibold text-sm transition-colors ${
                    selectedChat === chat.id ? 'text-white' : 'text-gray-300 group-hover:text-white'
                  }`}
                >
                  {chat.name}
                </span>
                <p className="text-gray-400 text-xs">
                  {data?.lastMessages[chat.id]
                    ? data.lastMessages[chat.id]
                    : `Send first message to ${chat.name}`}
                </p>
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
