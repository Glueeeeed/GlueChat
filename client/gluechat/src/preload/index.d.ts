import { ElectronAPI } from '@electron-toolkit/preload'

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
      initializeEncryptMessage: (publicKey: string, content: string, roomID: string) => Promise<string | null>;
      decryptMessage: (encryptedPackage: any, accountName: string) => Promise<string | null>;
    }
  }
}
