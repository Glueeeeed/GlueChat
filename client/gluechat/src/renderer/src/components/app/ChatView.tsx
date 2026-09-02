import { ChatInput } from './ChatInput';
import { Info } from 'lucide-react';
import { ChatMessage } from '@renderer/components/app/ChatMessage';
import React, { useEffect, useRef, useState } from 'react';
import { validateOrRefreshToken } from '@renderer/assets/main';
import { makeAsRead, syncMessages } from '@renderer/assets/e2ee';
import { checkIfAssetExists } from '@renderer/assets/profile';
import log from 'electron-log';
import { useQueryClient } from '@tanstack/react-query';
import { ChatErrorMessage } from '@renderer/components/app/ChatErrorMessage';

interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  isAuthor: boolean;
  isSeen: boolean;
}

interface ErrorMessage {
  id: string;
  sender: string;
  content: string;
  isDecryptionError: boolean;
  errorMessage: string;
  timestamp: string;
}

interface ChatViewProps {
  chatID: string;
  chatName: string;
  authKey: string;
  senderID: string;
  receiverID: string | null;
  deviceId: string;
}

export function ChatView({ senderID, authKey, chatID, chatName, receiverID, deviceId }: ChatViewProps): React.JSX.Element {
  const [messages, setMessages] = useState<Message[]>([]);
  const [errorMessages, setErrorMessages] = useState<ErrorMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [avatarURL, setAvatarURL] = useState<string | null>(null);

  const scrollToBottom = (): void => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
  };

  const queryClient = useQueryClient();

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['chats'] });
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const loadAvatar = async (): Promise<void> => {
      const avatarUrl = await checkIfAssetExists('avatar', receiverID as string);
      setAvatarURL(avatarUrl);
    };

    const loadLocalHistory = async (): Promise<void> => {
      try {
        setMessages([]);
        const currentNickname = localStorage.getItem('nickname') || 'User';
        const history = await window.e2ee.getMessages(chatID, currentNickname);
        if (history && history.length > 0) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          const formattedMessages = history.map((msg: any) => ({
            id: msg.id,
            sender: msg.sender,
            content: msg.content,
            timestamp: msg.timestamp,
            isAuthor: msg.isAuthor,
            isSeen: msg.isSeen
          }));
          setMessages(formattedMessages);
        }
      } catch (error) {
        console.error('Failed to load history', error);
      }
    };

    loadAvatar();
    loadLocalHistory();

    const syncOfflineMessages = async (): Promise<void> => {
      try {
        const authToken: string = await validateOrRefreshToken(authKey);
        const newPackages = await syncMessages(authToken, chatID, deviceId);

        if (newPackages && newPackages.length > 0) {
          for (const pkg of newPackages) {
            if (pkg.deviceId !== deviceId) continue;

            const currentNickname = localStorage.getItem('nickname') || 'User';
            const decryptedText = await window.e2ee.decryptMessage(pkg, currentNickname, receiverID as string);
            if (decryptedText) {
              await makeAsRead(authKey, pkg.nonce);
              setMessages((prev) => {
                if (prev.some((m) => m.id === pkg.id)) return prev;

                return [
                  ...prev,
                  {
                    id: pkg.id,
                    sender: chatName,
                    content: decryptedText,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    isAuthor: false,
                    isSeen: true
                  }
                ];
              });

              const messageData = {
                id: Date.now().toString(),
                sender: chatName,
                content: decryptedText,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isAuthor: false,
                isSeen: false
              };

              await window.e2ee.saveMessage(chatID, pkg.senderId, messageData, pkg.nonce, chatName, currentNickname);
            }
          }
        }
      } catch (e) {
        console.error('Failed to sync message', e);
      }
    };

    syncOfflineMessages();

    window.network.ws.joinRoom(chatID);
  }, [chatID, chatName, authKey, senderID, receiverID, deviceId]);

  useEffect(() => {
    const removeListener = window.network.ws.onMessage(async (data) => {
      for (const message of data.payload) {
        try {
          if (data?.type !== 'receive-message' || !Array.isArray(data.payload)) {
            return;
          }

          if (message.deviceId !== deviceId) continue;
          const currentNickname: string = localStorage.getItem('nickname') || 'User';
          const decryptedText: string | null = await window.e2ee.decryptMessage(message, currentNickname, senderID);
          if (decryptedText) {
            await makeAsRead(authKey, message.nonce);
            setMessages((prev: Message[]): Message[] => {
              if (prev.some((m: Message): boolean => m.id === message.id)) return prev;
              return [
                ...prev,
                {
                  id: Date.now().toString(),
                  sender: chatName,
                  content: decryptedText,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  isAuthor: false,
                  isSeen: false
                }
              ];
            });

            const messageData = {
              id: Date.now().toString(),
              sender: localStorage.getItem('nickname') || 'Me',
              content: decryptedText,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              isAuthor: false,
              isSeen: false
            };

            await window.e2ee.saveMessage(chatID, message.senderID, messageData, message.nonce, chatName, currentNickname);
          }
        } catch (e) {
          setErrorMessages((prev: ErrorMessage[]): ErrorMessage[] => {
            return [
              ...prev,
              {
                id: Date.now().toString(),
                sender: chatName,
                content: '',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isDecryptionError: true,
                errorMessage: 'We were unable to decrypt this message. Please try again or ask the sender to resend it.'
              }
            ];
          });

          log.error('Failed to decrypt message', e);
        }
      }
    });

    return () => removeListener();
  }, []);

  const handleSendMessage = async (message: string): Promise<void> => {
    try {
      const authToken: string = await validateOrRefreshToken(authKey);
      const currentNickname: string = localStorage.getItem('nickname') || 'User';
      const result: string | null = await window.e2ee.initializeEncryptMessage(
        authToken,
        message,
        chatID,
        senderID,
        receiverID as string,
        currentNickname
      );

      if (result) {
        const currentNickname: string = localStorage.getItem('nickname') || 'User';

        window.network.ws.sendMessage(result);

        const messageData = {
          id: Date.now().toString(),
          sender: localStorage.getItem('nickname') || 'Me',
          content: message,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isAuthor: true,
          isSeen: false
        };

        setMessages((prev) => [...prev, messageData]);

        const resultObj = JSON.parse(JSON.stringify(result));
        await window.e2ee.saveMessage(chatID, senderID, messageData, resultObj.nonce, currentNickname, currentNickname);
      } else {
        throw new Error('Failed to encrypt or send message');
      }
    } catch (error) {
      log.error(error);

      setErrorMessages((prev: ErrorMessage[]): ErrorMessage[] => {
        return [
          ...prev,
          {
            id: Date.now().toString(),
            sender: chatName,
            content: message,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isDecryptionError: true,
            errorMessage: 'We were unable to decrypt this message. Please try again or ask the sender to resend it.'
          }
        ];
      });
    }
  };

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      <header className="px-6 py-4 border-b border-white/5 bg-gray-950/40 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-4">
          {avatarURL ? (
            <img className={'w-10 h-10 rounded-full'} src={avatarURL}></img>
          ) : (
            <div className="w-10 h-10 rounded-full bg-linear-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold uppercase">
              {chatName.substring(0, 2)}
            </div>
          )}
          <div>
            <h2 className="text-sm font-bold text-gray-100">{chatName}</h2>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {messages.length === 0 && errorMessages.length === 0 ? (
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
              <ChatMessage avatar={avatarURL} key={m.id} text={m.content} isAuthor={m.isAuthor} timestamp={m.timestamp} nickname={m.sender} />
            ))}

            {errorMessages.map((m) => (
              <ChatErrorMessage
                avatar={avatarURL}
                key={m.id}
                text={m.content}
                errorMessage={m.errorMessage}
                isDecryptionError={m.isDecryptionError}
                timestamp={m.timestamp}
                nickname={m.sender}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <ChatInput onSendMessage={handleSendMessage} />
    </div>
  );
}
