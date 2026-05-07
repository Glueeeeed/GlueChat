import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

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


contextBridge.exposeInMainWorld("auth", {
  getRefreshToken: (accountName: string) => ipcRenderer.invoke("get-refresh-token", accountName),
  setRefreshToken: (accountName: string, token: string) => ipcRenderer.invoke("set-refresh-token", accountName, token),
  deleteRefreshToken: (accountName: string) => ipcRenderer.invoke("delete-refresh-token", accountName),
});

contextBridge.exposeInMainWorld('e2ee', {
  generatePairKeys: (accountName: string) =>
    ipcRenderer.invoke('generate-xwing-pair-keys', accountName),
  initializeEncryptMessage: (publicKey: string, content: string, roomID: string, senderID: string, receiverID: string
  ) =>
    ipcRenderer.invoke(
      'initializeEncryptMessage',
      publicKey,
      content,
      roomID,
      senderID,
      receiverID
    ),
  decryptMessage: (encryptedPackage: any, accountName: string) =>
    ipcRenderer.invoke('decryptMessage', encryptedPackage, accountName)
})
