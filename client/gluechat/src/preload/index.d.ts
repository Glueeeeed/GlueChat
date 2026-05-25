import {ElectronAPI} from '@electron-toolkit/preload'
import {ChatInfo, messageData} from "../main/Services/StorageService";

declare global {
  interface Window {
    electron: ElectronAPI
    api: unknown
    auth: {
      getRefreshToken: (accountName: string) => Promise<string | null>;
      setRefreshToken: (accountName: string, token: string) => Promise<void>;
      deleteRefreshToken: (accountName: string) => Promise<void>;
    };
    e2ee: {
      generatePairKeys: (accountName: string) => Promise<string>;
      initializeEncryptMessage: (publicKey: string, content: string, roomID: string, senderID: string, receiverID: string) => Promise<string | null>;
      decryptMessage: (encryptedPackage: any, accountName: string, accountID: string) => Promise<string | null>;
      getMessages: (roomID: string) => Promise<string | null>;
      saveMessage: (roomID: string, senderID: string, content: messageData, nonce: string, chatName: string) => Promise<string | null>;
      getLastMessage: (roomID: ChatInfo) => Promise<any | null>;
    }
  }
}
