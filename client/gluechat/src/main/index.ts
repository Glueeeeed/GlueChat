import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'path'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import keytar from 'keytar'
import { randomBytes } from '@noble/post-quantum/utils.js'
import ProtocolService from './Services/ProtocolService'
import { CryptoCore, KeyPair, oneTimeKey } from './Services/CryptoCore'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 670,
    minWidth: 850,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      webSecurity: false,
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.


ipcMain.handle("get-refresh-token", async (_, accountName: string) => {
  return await keytar.getPassword("gluechat", accountName);
});

ipcMain.handle("set-refresh-token", async (_, accountName: string, token: string) => {
  return await keytar.setPassword("gluechat", accountName, token);
});

ipcMain.handle("delete-refresh-token", async (_, accountName: string) => {
  return await keytar.deletePassword("gluechat", accountName);
});

ipcMain.handle("generate-xwing-pair-keys", async (_, accountName: string) : Promise<string> => {
  const oneTimeKeys: oneTimeKey[] = []
  const keys: KeyPair = CryptoCore.generateSignKeyPair();
  const identityPubKey: string = Buffer.from(keys.publicKey).toString('base64');
  const identityKey: string = Buffer.from(keys.secretKey).toString('base64');
  const spk: KeyPair = CryptoCore.generateNewKeyPair() // Signed PreKey Pair
  const spkPubKey: string = Buffer.from(spk.publicKey).toString('base64');
  const spkKey: string = Buffer.from(spk.secretKey).toString('base64')

  await keytar.setPassword('gluechat_' + accountName, 'identityKey', identityKey);
  await keytar.setPassword('gluechat_' + accountName, 'identityPubKey', identityPubKey);
  await keytar.setPassword('gluechat_' + accountName, 'signingPrivateKey',  spkKey);
  await keytar.setPassword('gluechat_' + accountName, 'signingPubKey', spkPubKey);

  const signature: string = Buffer.from(CryptoCore.sign(spk.publicKey, keys.secretKey)).toString(
    'base64');
  for (let i: number = 1; i <= 50; i++) {
    const oneTimeKeyID: string = Buffer.from(randomBytes(4)).toString('hex');
    const keyPair: KeyPair = CryptoCore.generateNewKeyPair();
    const pubKey: string = Buffer.from(keyPair.publicKey).toString('base64');
    const privateKey: string = Buffer.from(keyPair.secretKey).toString('base64');
    await keytar.setPassword('gluechat_' + accountName, oneTimeKeyID, privateKey);
    const oneTimeKey = {
      id: oneTimeKeyID,
      pubKey: pubKey
    }
    oneTimeKeys.push(oneTimeKey);
  }


  const data = {
    identityPubKey: identityPubKey,
    spkPubKey: spkPubKey,
    signature: signature,
    oneTimeKeys: oneTimeKeys
  }

  return JSON.stringify(data);

})

ipcMain.handle('initializeEncryptMessage', async (_, authKey: string, content: string, roomID: string, senderID: string, receiverID: string) => {
    const data = await ProtocolService.initializeEncrypt(authKey, content, roomID, senderID, receiverID)
    return data
  }
)

ipcMain.handle('decryptMessage', async (_, encryptedPackage: any, accountName: string) => {
  return await ProtocolService.initializeDecrypt(encryptedPackage, encryptedPackage.roomID, accountName)
})
