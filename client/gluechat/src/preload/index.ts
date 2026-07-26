import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { ChatInfo, messageData } from '../main/Services/StorageService'

// Custom APIs for renderer
const api = {}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}

contextBridge.exposeInMainWorld('app', {
  getDeviceID: () => ipcRenderer.invoke('getDevice'),
  removeLocalKeys: (accountName: string) => ipcRenderer.invoke('removeLocalKeys', accountName),
  closeApp: () => ipcRenderer.invoke('closeApp'),
})

contextBridge.exposeInMainWorld("auth", {
  getRefreshToken: (accountName: string) => ipcRenderer.invoke("get-refresh-token", accountName),
  setRefreshToken: (accountName: string, token: string) => ipcRenderer.invoke("set-refresh-token", accountName, token),
  deleteRefreshToken: (accountName: string) => ipcRenderer.invoke("delete-refresh-token", accountName),
});

contextBridge.exposeInMainWorld('e2ee', {
  generateOpk: (qty: number, accountName: string, deviceId: string) => {
    return ipcRenderer.invoke('generate-opk', qty, accountName, deviceId);
  },
  generatePairKeys: (accountName: string, tempToken: string, forceReset: boolean) =>
    ipcRenderer.invoke('generate-xwing-pair-keys', accountName, tempToken, forceReset),
  initializeEncryptMessage: (publicKey: string, content: string, roomID: string, senderID: string, receiverID: string, accountName: string) =>
    ipcRenderer.invoke('initializeEncryptMessage', publicKey, content, roomID, senderID, receiverID, accountName),
  decryptMessage: (encryptedPackage: any, accountName: string, accountID: string) =>
    ipcRenderer.invoke('decryptMessage', encryptedPackage, accountName, accountID),
  getMessages: (roomID: string, accountName: string) => ipcRenderer.invoke('getMessages', roomID,accountName),
  saveMessage: (roomID: string, senderID: string, content: messageData, nonce: string, chatName: string, accountName: string) => ipcRenderer.invoke('saveMessage', roomID, senderID, content, nonce, chatName,accountName),
  getLastMessage: (roomID: ChatInfo, accountName: string) => ipcRenderer.invoke('getLastMessage', roomID, accountName),
})


