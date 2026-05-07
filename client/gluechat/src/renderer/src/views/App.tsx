import {useEffect, useState} from "react";
import { useNavigate } from "react-router-dom";
import {initAuthToken} from "@renderer/assets/utils";
import {ChatBar} from "@renderer/components/app/ChatBar";
import {FriendsList} from "@renderer/components/friends/FriendsList";
import {AddFriend} from "@renderer/components/friends/AddFriend";
import {FriendsRequests} from "@renderer/components/friends/FriendsRequests";
import {ChatList} from "@renderer/components/app/ChatList";
import {ChatView} from "@renderer/components/app/ChatView";
import { jwtDecode } from 'jwt-decode'

export type Tab = 'chats' | 'friends';

interface Friend {
  id: string;
  nickname: string;
  status: 'online' | 'offline';
  avatar?: string;
}



export function App() {
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [friends, setFriends] = useState<Friend[]>([])
  const [activeTab, setActiveTab] = useState<Tab>('chats')
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null)
  const [addFriendOption, setAddFriendOption] = useState<boolean>(false)
  const [selectedChat, setSelectedChat] = useState<string | null>(null)
  const [selectedChatName, setSelectedChatName] = useState<string | null>(null)
  const [nickname, setNickname] = useState<string>('User')
  const [senderID, setSenderID] = useState<string | null>(null)
  const [receiverID, setReceiverID] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    let isMounted = true
    const currentNickname = localStorage.getItem('nickname')
    if (currentNickname && isMounted) {
      setNickname(currentNickname)
    }

    const checkAuth = async () => {
      try {
        const token = await initAuthToken()
        if (isMounted) {
          setAuthToken(token)
        }
      } catch (e) {
        if (isMounted) {
          const accounts = JSON.parse(localStorage.getItem('accounts') || '[]')
          if (accounts.length > 0) {
            navigate('/select-account')
          } else {
            navigate('/login')
          }
        }
      }
    }

    checkAuth()
    return () => {
      isMounted = false
    }
  }, [])


  useEffect(() => {
    if (authToken) {
      const decodedToken : any = jwtDecode(authToken)
      const ws = new WebSocket('ws://localhost:3000/api/ws')

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: 'authenticate',
            payload: { userID: decodedToken.id }
          })
        )
      }

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        if (data.type === 'status-change') {
          setFriends((prev) =>
            prev.map((f) =>
              f.id === data.payload.userID ? { ...f, status: data.payload.status } : f
            )
          )
        }
      }
    }
  }, [authToken])

  return (
    <div className="flex h-screen w-full bg-gray-950 text-gray-100 overflow-hidden">
      <ChatBar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex flex-col w-80 bg-gray-900/40 border-r border-white/5 backdrop-blur-sm h-full">
        <div className="flex-1 overflow-hidden">
          {activeTab === 'chats' ? (
            <ChatList
              setReceiverID={setReceiverID}
              setSenderID={setSenderID}
              selectedChat={selectedChat as string}
              setSelectedChatName={setSelectedChatName}
              setSelectedChat={setSelectedChat}
              authToken={authToken}
            />
          ) : (
            <FriendsList
              authToken={authToken}
              addFriendOption={addFriendOption}
              setAddFriendOption={setAddFriendOption}
              onSelectFriend={setSelectedFriend}
              selectedFriendId={selectedFriend?.id}
              setFriends={setFriends}
              friends={friends}
            />
          )}
        </div>

        <div className="px-3 py-3 border-t border-white/5 bg-gray-950/20">
          <div className="flex items-center gap-3 px-2">
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-linear-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold uppercase">
                {nickname.substring(0, 2)}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-gray-900" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-gray-100">{nickname}</p>
              <p className="text-[11px] text-gray-500 font-medium">Active</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-gray-950/50">
        {activeTab === 'chats' ? (
          selectedChat ? (
            <ChatView
              receiverID={receiverID}
              senderID={senderID as string}
              authKey={authToken as string}
              chatID={selectedChat}
              chatName={selectedChatName as string}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-center opacity-40">
              <p className="text-gray-500 uppercase tracking-[0.3em] text-sm font-medium">
                Select a chat to start messaging
              </p>
            </div>
          )
        ) : (
          <div
            className={`flex-1 flex ${addFriendOption ? 'items-start' : 'items-center justify-center'} `}
          >
            {addFriendOption ? (
              <div className="flex h-screen w-full justify-between">
                <div className="flex h-full flex-col w-full max-w-[35%]">
                  <AddFriend authToken={authToken} />
                </div>
                <div className={'mt-5 h-full w-full max-lg:w-[75%]'}>
                  <FriendsRequests authToken={authToken} />
                </div>
              </div>
            ) : selectedFriend ? (
              <div className="flex justify-center text-center opacity-40">
                <p className="text-gray-500 uppercase tracking-[0.3em] text-sm font-medium">
                  Select a friend
                </p>
              </div>
            ) : (
              <div className="text-center opacity-40">
                <p className="text-gray-500 uppercase tracking-[0.3em] text-sm font-medium">
                  Select a friend
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
