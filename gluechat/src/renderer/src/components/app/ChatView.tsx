import { ChatInput } from './ChatInput';
import { Info, X } from 'lucide-react';
import { ChatMessage } from '@renderer/components/app/ChatMessage';
import React, { useEffect, useRef, useState } from 'react';
import { validateOrRefreshToken } from '@renderer/assets/main';
import { makeAsRead, syncMessages } from '@renderer/assets/e2ee';
import { checkIfAssetExists } from '@renderer/assets/profile';
import log from 'electron-log';
import { useQueryClient } from '@tanstack/react-query';
import { ChatErrorMessage } from '@renderer/components/app/ChatErrorMessage';
import { bytesToMB } from '@renderer/assets/utils';

interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  isAuthor: boolean;
  isSeen: boolean;
  isImage?: boolean;
  isVideo?: boolean;
  isFile?: boolean;
  fileName?: string;
  fileSize?: number;
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

const formatTime = (rawDate?: any): string => {
  if (!rawDate) return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (typeof rawDate === 'string' && /^\d{1,2}:\d{2}(:\d{2})?(\s?[AP]M)?$/i.test(rawDate.trim())) {
    return rawDate.trim();
  }
  const date = new Date(rawDate);
  if (!isNaN(date.getTime())) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return typeof rawDate === 'string' ? rawDate : '';
};

const toIsoString = (rawDate?: any): string => {
  if (!rawDate) return new Date().toISOString();
  const date = new Date(rawDate);
  return !isNaN(date.getTime()) ? date.toISOString() : new Date().toISOString();
};

export function ChatView({ senderID, authKey, chatID, chatName, receiverID, deviceId }: ChatViewProps): React.JSX.Element {
  const [messages, setMessages] = useState<Message[]>([]);
  const [errorMessages, setErrorMessages] = useState<ErrorMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [avatarURL, setAvatarURL] = useState<string | null>(null);
  const [showFileSizeModal, setShowFileSizeModal] = useState(false);
  const [fileSizeErrorMsg, setFileSizeErrorMsg] = useState('');

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
            isSeen: msg.isSeen,
            isImage: msg.isImage,
            isVideo: msg.isVideo,
            isFile: msg.isFile,
            fileName: msg.fileName,
            fileSize: msg.fileSize
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
            try {
              const decryptedText = await window.e2ee.decryptMessage(pkg, currentNickname);
              if (decryptedText) {
                await makeAsRead(authKey, pkg.messageId);
                const timeStr = formatTime(pkg.createdAt);

                setMessages((prev) => {
                  if (prev.some((m) => m.id === (pkg.messageId || pkg.id))) return prev;

                  return [
                    ...prev,
                    {
                      id: pkg.messageId || pkg.id || Date.now().toString(),
                      sender: chatName,
                      content: decryptedText,
                      timestamp: timeStr,
                      isAuthor: false,
                      isSeen: true
                    }
                  ];
                });

                const messageData = {
                  id: pkg.messageId || pkg.id || Date.now().toString(),
                  sender: chatName,
                  content: decryptedText,
                  timestamp: timeStr,
                  isAuthor: false,
                  isSeen: false
                };

                await window.e2ee.saveMessage(toIsoString(pkg.createdAt), chatID, pkg.senderId, messageData, pkg.messageId || pkg.id, chatName, currentNickname);
              }
            } catch (err) {
              log.error('Failed to decrypt offline message', err);
              setErrorMessages((prev: ErrorMessage[]): ErrorMessage[] => {
                return [
                  ...prev,
                  {
                    id: pkg.messageId || pkg.id || Date.now().toString(),
                    sender: chatName,
                    content: '',
                    timestamp: formatTime(pkg.createdAt),
                    isDecryptionError: true,
                    errorMessage: 'We were unable to decrypt this message. Please try again or ask the sender to resend it.'
                  }
                ];
              });
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
      if (data?.type !== 'receive-message' || !Array.isArray(data.payload)) {
        return;
      }

      for (const message of data.payload) {
        try {
          if (message.deviceId !== deviceId) continue;
          const currentNickname: string = localStorage.getItem('nickname') || 'User';
          const decryptedText: string | null = await window.e2ee.decryptMessage(message, currentNickname);
          if (decryptedText) {
            await makeAsRead(authKey, message.messageId);
            const timeStr = formatTime(message.createdAt);
            const msgId = message.messageId || message.id || message.nonce || Date.now().toString();

            setMessages((prev: Message[]): Message[] => {
              if (prev.some((m: Message): boolean => m.id === msgId)) return prev;
              return [
                ...prev,
                {
                  id: msgId,
                  sender: chatName,
                  content: decryptedText,
                  timestamp: timeStr,
                  isAuthor: false,
                  isSeen: false
                }
              ];
            });

            const messageData = {
              id: msgId,
              sender: chatName,
              content: decryptedText,
              timestamp: timeStr,
              isAuthor: false,
              isSeen: false
            };

            await window.e2ee.saveMessage(toIsoString(message.createdAt), chatID, message.senderId || message.senderID || senderID, messageData, msgId, chatName, currentNickname);
          }
        } catch (e) {
          setErrorMessages((prev: ErrorMessage[]): ErrorMessage[] => {
            return [
              ...prev,
              {
                id: Date.now().toString(),
                sender: chatName,
                content: '',
                timestamp: formatTime(message.createdAt),
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
  }, [authKey, chatID, chatName, deviceId, senderID]);


  const handleSendFile = async (file: File): Promise<void> => {
    const MAX_FILE_SIZE_MB = 50;
    const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
    const fileSizeMB: string = bytesToMB(file.size);
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFileSizeErrorMsg(`File "${file.name}" is too large (${fileSizeMB} MB). Max size is ${MAX_FILE_SIZE_MB} MB.`);
      setShowFileSizeModal(true);
      return;
    }

    const mimeType = file.type;
    let isImage = false;
    let isVideo = false;
    let isFile = false;

    if (mimeType.startsWith('image/')) {
      isImage = true;
    } else if (mimeType.startsWith('video/')) {
      isVideo = true;
    } else {
      isFile = true;
    }

    const bytes = await file.arrayBuffer();
    const fileData = new Uint8Array(bytes);
    const filePath: string = await window.e2ee.saveImage(fileData, file.name);

    const currentNickname: string = localStorage.getItem('nickname') || 'User';
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isoString = now.toISOString();
    const msgId = Date.now().toString();

    const messageData = {
      id: msgId,
      sender: currentNickname,
      content: filePath,
      timestamp: timeStr,
      isAuthor: true,
      isSeen: false,
      isImage,
      isVideo,
      isFile,
      fileName: file.name,
      fileSize: file.size
    };

    setMessages((prev) => [...prev, messageData]);

    const historyMessageData = {
      id: msgId,
      sender: currentNickname,
      content: filePath,
      timestamp: timeStr,
      isAuthor: true,
      isSeen: false,
      isImage,
      isVideo,
      isFile,
      fileName: file.name,
      fileSize: file.size
    };
    await window.e2ee.saveMessage(isoString, chatID, senderID, historyMessageData, msgId, currentNickname, currentNickname);
  }


  const handleSendMessage = async (message: string): Promise<void> => {
    const currentNickname: string = localStorage.getItem('nickname') || 'User';
    try {
      const authToken: string = await validateOrRefreshToken(authKey);
      const result: any = await window.e2ee.initializeEncryptMessage(
        authToken,
        message,
        chatID,
        senderID,
        receiverID as string,
        currentNickname
      );

      if (result) {
        window.network.ws.sendMessage(result);

        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const isoString = now.toISOString();

        const firstPkg = Array.isArray(result) && result.length > 0 ? result[0] : (typeof result === 'object' && result !== null ? result : null);
        const msgId = firstPkg?.messageId || Date.now().toString();

        const messageData = {
          id: msgId,
          sender: currentNickname,
          content: message,

          timestamp: timeStr,
          isAuthor: true,
          isSeen: false
        };

        setMessages((prev) => [...prev, messageData]);

        await window.e2ee.saveMessage(isoString, chatID, senderID, messageData, msgId, currentNickname, currentNickname);
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
            sender: currentNickname,
            content: message,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isDecryptionError: false,
            errorMessage: 'Failed to send'
          }
        ];
      });
    }
  };

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      {showFileSizeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowFileSizeModal(false)}>
          <div
            className="bg-gray-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-100">File is too large</h3>
              <button
                onClick={() => setShowFileSizeModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-gray-400 mb-6">{fileSizeErrorMsg}</p>
            <button
              onClick={() => setShowFileSizeModal(false)}
              className="w-full py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-all"
            >
              OK
            </button>
          </div>
        </div>
      )}

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
              <ChatMessage
                messageId={m.id}
                avatar={avatarURL}
                key={m.id}
                text={m.content}
                isAuthor={m.isAuthor}
                timestamp={m.timestamp}
                nickname={m.sender}
                isImage={m.isImage || false}
                isVideo={m.isVideo || false}
                isFile={m.isFile || false}
                fileName={m.fileName}
                fileSize={m.fileSize}
              />
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

      <ChatInput onSendMessage={handleSendMessage} onSendFile={handleSendFile} />
    </div>
  );
}
