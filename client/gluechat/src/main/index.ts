import { app, BrowserWindow, ipcMain, shell } from 'electron'
import path, { join } from 'path'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import icon from '../../build/icon.png?asset'
import keytar from 'keytar'
import { randomBytes } from '@noble/post-quantum/utils.js'
import ProtocolService from './Services/ProtocolService'
import { CryptoCore, KeyPair, oneTimeKey } from './Services/CryptoCore'
import { ChatInfo, StorageService } from './Services/StorageService'
import {messageData} from './Services/StorageService'
import { SecretManager } from './Managers/SecretManager'
import { NetworkService } from './Services/NetworkService'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    title: "GlueChat",
    icon: path.join(__dirname, '../../resources/icon.ico'),
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

  mainWindow.webContents.on('will-navigate', (event, url) => {
    event.preventDefault()
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
  electronApp.setAppUserModelId('com.gluechat.app');
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
  app.name = 'GlueChat';


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

ipcMain.handle("generate-xwing-pair-keys", async (_, accountName: string, tempToken: string, forceReset: boolean) : Promise<void> => {
  const deviceId: string = await StorageService.generateDeviceId();
  const prefix = `device-${deviceId}`;
  const exists: string | null = await SecretManager.getSecret(accountName, 'gluechat_' + accountName, `${prefix}-identityKey`);

  if (exists && !forceReset) {
    return;
  } else {
    await SecretManager.resetAllSecrets(accountName);
  }

  const oneTimeKeys: oneTimeKey[] = [];

  // Generates Keys

  const identityKP: KeyPair = CryptoCore.generateSignKeyPair(); // Identity Key Pair
  const identityPubKey: string = Buffer.from(identityKP.publicKey).toString('base64');
  const identityKey: string = Buffer.from(identityKP.secretKey).toString('base64');

  const spkKP: KeyPair = CryptoCore.generateNewKeyPair(); // Signed PreKey Pair
  const spkPubKey: string = Buffer.from(spkKP.publicKey).toString('base64');
  const spkKey: string = Buffer.from(spkKP.secretKey).toString('base64') ;


  await SecretManager.setSecret(accountName, 'gluechat_' + accountName, `${prefix}-identityKey`, identityKey)
  await SecretManager.setSecret(accountName, 'gluechat_' + accountName, `${prefix}-identityPubKey`, identityPubKey)
  await SecretManager.setSecret(accountName, 'gluechat_' + accountName, `${prefix}-signingPrivateKey`, spkKey)
  await SecretManager.setSecret(accountName, 'gluechat_' + accountName, `${prefix}-signingPubKey`, spkPubKey)

  const signature: string = Buffer.from(CryptoCore.sign(spkKP.publicKey, identityKP.secretKey)).toString('base64');

  for (let i: number = 1; i <= 20; i++) {
    const oneTimeKeyID: string = Buffer.from(randomBytes(4)).toString('hex');
    const keyPair: KeyPair = CryptoCore.generateNewKeyPair();

    const pubKey: string = Buffer.from(keyPair.publicKey).toString('base64');
    const privateKey: string = Buffer.from(keyPair.secretKey).toString('base64');

    await SecretManager.setSecret(accountName, 'gluechat_' + accountName, `${prefix}-otk-${oneTimeKeyID}`, privateKey);

    const oneTimeKey = {
      id: oneTimeKeyID,
      pubKey: pubKey
    };

    oneTimeKeys.push(oneTimeKey);
  }

  const data = {
    identityPubKey: identityPubKey,
    spkPubKey: spkPubKey,
    signature: signature,
    oneTimeKeys: oneTimeKeys
  }

   const keys : string = JSON.stringify(data);
   await NetworkService.registerDevice(accountName,deviceId,keys, tempToken);
})

ipcMain.handle('initializeEncryptMessage', async (_, authKey: string, content: string, roomID: string, senderID: string, receiverID: string, accountName: string) => {
    const data = await ProtocolService.initializeEncrypt(authKey, content, roomID, senderID, receiverID, accountName)
    return data
  }
)

ipcMain.handle('getDevice', async () => {
  return await StorageService.generateDeviceId();
})


ipcMain.handle('decryptMessage', async (_, encryptedPackage: any, accountName: string, accountID) => {
  return await ProtocolService.initializeDecrypt(encryptedPackage, encryptedPackage.roomID, accountName,accountID)
})

ipcMain.handle('saveMessage', async (_,roomID: string, senderID: string, messageData  : messageData, nonce : string, chatName : string, accountName : string) => {
  return await StorageService.saveMessage(roomID, senderID, messageData, nonce, chatName, accountName);
})

ipcMain.handle('getMessages', async (_, roomID: string, accountName: string) => {
  return await StorageService.getHistory(roomID, accountName);
})

ipcMain.handle('getLastMessage', async (_, roomID: ChatInfo, accountName: string) => {
  return await StorageService.getLastMessage(roomID, accountName);
})

ipcMain.handle('removeLocalKeys', async (_, accountName: string) => {
  return await StorageService.removeLocalKeys(accountName);
})

