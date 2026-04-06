import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: unknown
    auth: {
      getRefreshToken: () => Promise<string | null>;
      setRefreshToken: (token: string) => Promise<void>;
      deleteRefreshToken: () => Promise<void>;
    };
  }
}
