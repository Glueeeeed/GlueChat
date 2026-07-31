import React, {useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import {useQuery} from '@tanstack/react-query'
import {useQueryClient} from '@tanstack/react-query'
import {initAuthToken } from '@renderer/assets/utils'
import {ChatBar} from "@renderer/components/app/ChatBar";
import {FriendsList} from "@renderer/components/friends/FriendsList";
import {AddFriend} from "@renderer/components/friends/AddFriend";
import {FriendsRequests} from "@renderer/components/friends/FriendsRequests";
import {ChatList} from "@renderer/components/app/ChatList";
import {ChatView} from "@renderer/components/app/ChatView";
import {jwtDecode} from 'jwt-decode'
import {Settings} from "@renderer/components/app/Settings";
import {ProfileSettings} from '@renderer/components/app/profile/ProfileSettings'
import {checkIfAssetExists} from "@renderer/assets/profile";
import {UserProfile} from "@renderer/components/app/profile/UserProfile";
import { API_BASE_URL, APP_VERSION} from '@renderer/assets/utils'
import {AccountSecurity} from '@renderer/components/app/accountSecurity/AccountSecurity'
import {AboutApp} from '@renderer/components/app/aboutApp/AboutApp'
import {checkIfDeviceIsRegistered} from '@renderer/assets/account'
import log from 'electron-log'
import { generateOpkKeys } from '@renderer/assets/e2ee'


export type Tab = 'chats' | 'friends' | 'settings';

interface Friend {
  id: string;
  nickname: string;
  status: 'online' | 'offline';
  avatar?: string | null;
}



export function App(): React.JSX.Element {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('chats');
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [addFriendOption, setAddFriendOption] = useState<boolean>(false);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [selectedChatName, setSelectedChatName] = useState<string | null>(null);
  const [senderID, setSenderID] = useState<string | null>(null);
  const [receiverID, setReceiverID] = useState<string | null>(null);
  const [selectedSetting, setSelectedSetting] = useState<string | null>(null);
  const navigate = useNavigate();


  const queryClient = useQueryClient();


  const { data: userData } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        const token : string = await initAuthToken();
        const decodedToken: any = jwtDecode(token);
        const avatarUrl : string | null = await checkIfAssetExists('avatar', decodedToken.id);
        const deviceId : string = await window.app.getDeviceID();
        const finalAvatarUrl : string | null = avatarUrl ? `${avatarUrl}?t=${Date.now()}` : null
        const currentNickname : string | null = localStorage.getItem('nickname')

        return {
          token,
          deviceId,
          id: decodedToken.id,
          avatarUrl: finalAvatarUrl,
          currentNickname,
        }
      } catch (e) {
        const accounts = JSON.parse(localStorage.getItem('accounts') || '[]')
        navigate(accounts.length > 0 ? '/select-account' : '/login')
        throw e
      }
    },
    staleTime: 1000 * 60 * 5
  })

  const authToken : string | null = userData?.token || null
  const avatarURL : string | null = userData?.avatarUrl || null
  const currentNickname : string = userData?.currentNickname || "Unknown";
  const deviceId : string | undefined = userData?.deviceId;


  const checkIfUpdate = async () : Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/app/version`, {
        method: 'GET'
      })

      if (response.ok) {
        const latestVersion = await response.text()

        if (latestVersion && latestVersion !== APP_VERSION) {
          alert(`A new version of GlueChat (${latestVersion}) is available. Download it to enjoy the new features!`)
        }
      }
    } catch (error) {
      log.error('Failed to check new version', error);
    }
  }


  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }
    checkIfUpdate()
  }, [])

  useEffect(() => {
    if (authToken) {
      checkIfDeviceIsRegistered(authToken, deviceId as string, currentNickname as string);
      const decodedToken : any = jwtDecode(authToken);
      const ws = new WebSocket('ws://localhost:3000/api/ws');
      generateOpkKeys(authToken,deviceId as string, currentNickname as string);

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: 'authenticate',
            payload: { userID: decodedToken.id, deviceId: deviceId }
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


        if (data.type === 'receive-message') {
          if (!document.hasFocus()) {
            log.info('Received message');
            window.notify.newMessage(data.message);
          }
          queryClient.invalidateQueries({ queryKey: ['chats'] })
        }

        if (data.type === 'PROFILE_UPDATED') {
          queryClient.invalidateQueries({ queryKey: ['friends'] })
          queryClient.invalidateQueries({ queryKey: ['chats'] })
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
          ) : activeTab === 'friends' ? (
            <FriendsList
              authToken={authToken}
              addFriendOption={addFriendOption}
              setAddFriendOption={setAddFriendOption}
              onSelectFriend={setSelectedFriend}
              selectedFriendId={selectedFriend?.id}
              setFriends={setFriends}
              friends={friends}
            />
          ) : activeTab === 'settings' ? (
            <Settings selectedSetting={selectedSetting} setSelectedSetting={setSelectedSetting} />
          ) : null}
        </div>

        <div className="px-3 py-3 border-t border-white/5 bg-gray-950/20">
          <div className="flex items-center gap-3 px-2">
            <div className="relative">
              {avatarURL ? (
                <img className={'w-9 h-9 rounded-full'} src={avatarURL}></img>
              ) : (
                <div className="w-9 h-9 rounded-full bg-linear-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold uppercase">
                  {currentNickname.substring(0, 2)}
                </div>
              )}
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-violet-500 border-2 border-gray-900" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-gray-100">{currentNickname}</p>
              <p className="text-[11px] text-gray-500 font-medium">Active</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-gray-950/50">
        {activeTab === 'chats' ? (
          selectedChat ? (
            <ChatView deviceId={deviceId as string} receiverID={receiverID} senderID={senderID as string} authKey={authToken as string} chatID={selectedChat} chatName={selectedChatName as string}/>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center opacity-40">
              <p className="text-gray-500 uppercase tracking-[0.3em] text-sm font-medium">
                Select a chat to start messaging
              </p>
            </div>
          )
        ) : activeTab === 'friends' ? (
          <div
            className={`flex-1 flex ${addFriendOption ? 'items-start' : 'items-center justify-center'}`}
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
              <UserProfile
                authToken={authToken}
                userId={selectedFriend.id}
                nickname={selectedFriend.nickname}
              />
            ) : (
              <div className="text-center opacity-40">
                <p className="text-gray-500 uppercase tracking-[0.3em] text-sm font-medium">
                  Select a friend or add new ones
                </p>
              </div>
            )}
          </div>
        ) : activeTab === 'settings' ? (
          <div className="flex-1 overflow-y-auto">
            {selectedSetting === 'EditProfile' ? (
              <ProfileSettings authToken={authToken} />
            ) : selectedSetting === 'Security' ? (
              <AccountSecurity authToken={authToken as string} deviceId={deviceId as string}></AccountSecurity>
            ) : selectedSetting === 'About' ? (
              <AboutApp deviceId={deviceId as string}></AboutApp>
            ) : (
              <div className="flex-1 h-full flex items-center justify-center text-center opacity-40">
                <p className="text-gray-500 uppercase tracking-[0.3em] text-sm font-medium">
                  Select a setting from the list
                </p>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
