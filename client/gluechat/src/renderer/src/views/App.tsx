import {useEffect, useState} from "react";
import { useNavigate } from "react-router-dom";
import {initAuthToken} from "@renderer/assets/utils";
import {ChatBar} from "@renderer/components/app/ChatBar";
import {FriendsList} from "@renderer/components/friends/FriendsList";
import {AddFriend} from "@renderer/components/friends/AddFriend";
import {FriendsRequests} from "@renderer/components/friends/FriendsRequests";
import {SentRequests} from "@renderer/components/friends/SentRequests";

export type Tab = 'chats' | 'friends';

interface Friend {
  id: string;
  nickname: string;
  status: 'online' | 'offline';
  avatar?: string;
}

export function App() {
  const [authToken , setAuthToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('chats');
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [addFriendOption, setAddFriendOption] = useState<boolean>(false)
  const navigate = useNavigate();


  useEffect(() => {
    let isMounted = true;
    const checkAuth = async () => {
      try {
        const token = await initAuthToken();
        if (isMounted) setAuthToken(token);
      } catch (e) {
        if (isMounted) navigate("/login");
      }
    };

    checkAuth();
    return () => { isMounted = false; };
  }, []);

  return (
    <div className="flex h-screen w-full bg-gray-950 text-gray-100 overflow-hidden">
      <ChatBar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex flex-col">
        {activeTab === 'chats' ? (
          <div className="w-80 bg-gray-900/40 border-r border-white/5 backdrop-blur-sm h-full flex items-center justify-center">
            <p className="text-gray-500 uppercase tracking-widest text-xs">Chat List coming soon</p>
          </div>
        ) : (
          <FriendsList
            addFriendOption={addFriendOption}
            setAddFriendOption={setAddFriendOption}
            onSelectFriend={setSelectedFriend}
            selectedFriendId={selectedFriend?.id}
          />
        )}
      </div>

      <div className="flex-1 flex flex-col bg-gray-950/50">
        {activeTab === 'chats' ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-600 uppercase tracking-[0.3em] text-sm">Select a chat to start messaging</p>
          </div>
        ) : (
          <div className={`flex-1 flex ${addFriendOption ? "items-start" : "items-center justify-center"} `}>
            {addFriendOption ? (
              <div className="flex h-screen justify-between">
                <div className="flex h-full flex-col max-w-[65%] ">
                  <AddFriend />
                  <SentRequests />
                </div>
                <div className={"mt-5 h-full max-w-[35%]"}>
                  <FriendsRequests/>
                </div>

              </div>
            ) : selectedFriend ? (
              <div className="flex justify-center text-center opacity-40">
                <p className="text-gray-500 uppercase tracking-[0.3em] text-sm font-medium">Select a friend</p>
              </div>
            ) : (
              <div className="text-center opacity-40">
                <p className="text-gray-500 uppercase tracking-[0.3em] text-sm font-medium">Select a friend</p>
              </div>
            )}
          </div>
        )}
      </div>


      </div>

  )
}
