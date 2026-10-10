import {ElectronAPI} from '@electron-toolkit/preload'

export interface messageData {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  isAuthor: boolean;
  isSeen: boolean;
}

export interface ChatInfo {
  id: string;
  name: string;
  status: 'online' | 'offline';
  unread: boolean;
  unreadCount: number;
  senderID: string;
  receiverID: string;
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: unknown
    network: {
      ws: {
        sendMessage: (data: any) => void;
        joinRoom: (roomId: string) => void;
        authenticate: (userId: string, deviceId: string) => void;
        onMessage: (callback: (data: any) => void) => () => void;
        onStatusChange: (callback: (data: any) => void) => () => void;
        onProfileUpdated: (callback: (data: any) => void) => () => void;
      }
    };
    notify: {
      newMessage: (accountName: string) => void;
    }
    auth: {
      getRefreshToken: (accountName: string) => Promise<string | null>;
      setRefreshToken: (accountName: string, token: string) => Promise<void>;
      deleteRefreshToken: (accountName: string) => Promise<void>;
    };
    e2ee: {
      generateOpk: (qty: number, accountName: string, deviceId: string) => Promise<string>;
      generatePairKeys: (accountName: string, tempToken: string, forceReset: boolean) => Promise<void>;
      initializeEncryptMessage: (publicKey: string, content: string, roomID: string, senderID: string, receiverID: string, accountName: string) => Promise<string | null>;
      decryptMessage: (encryptedPackage: any, accountName: string, accountID: string) => Promise<string | null>;
      getMessages: (roomID: string,  accountName: string) => Promise<string | null>;
      saveMessage: (timestamp: string , roomID: string, senderID: string, content: messageData, messageId: string, chatName: string,  accountName: string) => Promise<string | null>;
      getLastMessage: (roomID: ChatInfo,  accountName: string) => Promise<any | null>;
    },
    app: {
      getDeviceID: () => Promise<string>;
      removeLocalKeys: (accountName: string) => Promise<void>;
      closeApp: () => Promise<void>;
    }
  }
}
