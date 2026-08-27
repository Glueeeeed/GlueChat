import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../../.env') });
import { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage,  } from 'electron';
import path, { join } from 'path';
import { is, optimizer } from '@electron-toolkit/utils';
import icon from '../../build/icon.png?asset';
import keytar from 'keytar';
import ProtocolService from './Services/ProtocolService';
import { CryptoCore, KeyPair, oneTimeKey } from './Services/CryptoCore';
import { ChatInfo, messageData, StorageService } from './Services/StorageService';
import { SecretManager } from './Managers/SecretManager';
import { NetworkService } from './Services/NetworkService';
import log from 'electron-log/main';
import { NotificationService } from './Services/NotificationService';
import { WebsocketManager } from './Managers/WebsocketManager';

if (process.platform === 'win32') {
  app.setAppUserModelId('com.gluechat.app');
}
app.name = 'GlueChat';

let websocket: any = null;
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    title: 'GlueChat',
    icon: path.join(__dirname, '../../resources/icon.ico'),
    width: 1000,
    height: 670,
    minWidth: 850,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      webSecurity: true,
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.webContents.on('will-navigate', (event) => {
    event.preventDefault();
  });

  mainWindow.webContents.on('dom-ready', () => {
    mainWindow?.webContents.executeJavaScript(`
      document.addEventListener('mouseup', (e) => {
        if (e.button === 3 || e.button === 4) {
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      }, true);
    `);
  });

  mainWindow.on('app-command', (e, cmd) => {
    if (cmd === 'browser-backward' || cmd === 'browser-forward') {
      e.preventDefault();
    }
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      if (process.platform === 'win32') {
        NotificationService.showHideAppToTrayNotification();
        mainWindow?.hide();
      } else if (process.platform === 'darwin') {
        app.hide();
      } else {
        mainWindow?.minimize();
      }
    }
  });

  websocket = new WebsocketManager(mainWindow);

  if (process.platform === 'win32') {
    initWindowsTray();
  }

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

function initWindowsTray(): void {
  try {
    const iconPath = path.join(__dirname, '../../resources/tray-icon.png');
    const rawIcon = nativeImage.createFromPath(iconPath);
    tray = new Tray(rawIcon);

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open GlueChat',
        click: () => restoreWindow()
      },
      {
        label: 'Close',
        click: () => {
          isQuitting = true;
          app.quit();
        }
      }
    ]);

    tray.setToolTip('GlueChat');
    tray.setContextMenu(contextMenu);

    tray.on('click', () => restoreWindow());
    tray.on('double-click', () => restoreWindow());
  } catch (error) {
    log.error('Cannot create tray:', error);
  }
}

export function restoreWindow(): void {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
}

app.whenReady().then(() => {
  log.initialize();


  if (process.env.VITE_APP_DEBUG_MODE) {
    log.transports.file.level = 'debug';
    log.transports.console.level = 'debug';
  } else {
    log.transports.console.level = 'info';
    log.transports.console.level = 'info';
  }

  log.errorHandler.startCatching();
  log.eventLogger.startLogging();

  if (process.platform === 'linux') {
    app.setDesktopName('gluechat.desktop');
  }

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  ipcMain.on('ping', () => console.log('pong'));

  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      restoreWindow();
    }
  });

  log.info('GlueChat started');
  log.debug('Debug mode enabled');
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
});

// IPC Handlers
ipcMain.handle('closeApp', async () => {
  isQuitting = true;
  app.quit();
});

ipcMain.handle('get-refresh-token', async (_, accountName: string) => {
  return await keytar.getPassword('gluechat', accountName);
});

ipcMain.handle('set-refresh-token', async (_, accountName: string, token: string) => {
  return await keytar.setPassword('gluechat', accountName, token);
});

ipcMain.handle('new-message-notification', async (_, accountName: string) => {
  NotificationService.showNewMessageNotification(accountName);
});

ipcMain.handle('delete-refresh-token', async (_, accountName: string) => {
  return await keytar.deletePassword('gluechat', accountName);
});

ipcMain.handle('generate-opk', async (_, qty: number, accountName: string, deviceId: string) => {
  const prefix = `device-${deviceId}`;
  const opk: oneTimeKey[] = await CryptoCore.generateOneTimeKeys(qty, accountName, prefix);
  return JSON.stringify(opk);
});

ipcMain.handle('generate-xwing-pair-keys', async (_, accountName: string, tempToken: string, forceReset: boolean): Promise<void> => {
  try {
    const deviceId: string = await StorageService.generateDeviceId();
    const prefix = `device-${deviceId}`;
    const exists: string | null = await SecretManager.getSecret(accountName, 'gluechat_' + accountName, `${prefix}-identityKey`);

    if (exists && !forceReset) {
      return;
    } else {
      await SecretManager.resetAllSecrets(accountName);
    }

    // Generates Keys

    const identityKP: KeyPair = CryptoCore.generateSignKeyPair(); // Identity Key Pair
    const identityPubKey: string = Buffer.from(identityKP.publicKey).toString('base64');
    const identityKey: string = Buffer.from(identityKP.secretKey).toString('base64');

    const spkKP: KeyPair = CryptoCore.generateNewKeyPair(); // Signed PreKey Pair
    const spkPubKey: string = Buffer.from(spkKP.publicKey).toString('base64');
    const spkKey: string = Buffer.from(spkKP.secretKey).toString('base64');

    await SecretManager.setSecret(accountName, 'gluechat_' + accountName, `${prefix}-identityKey`, identityKey);
    await SecretManager.setSecret(accountName, 'gluechat_' + accountName, `${prefix}-identityPubKey`, identityPubKey);
    await SecretManager.setSecret(accountName, 'gluechat_' + accountName, `${prefix}-signingPrivateKey`, spkKey);
    await SecretManager.setSecret(accountName, 'gluechat_' + accountName, `${prefix}-signingPubKey`, spkPubKey);

    const signature: string = Buffer.from(CryptoCore.sign(spkKP.publicKey, identityKP.secretKey)).toString('base64');

    const oneTimeKeys: oneTimeKey[] = await CryptoCore.generateOneTimeKeys(25, accountName, prefix);

    const data = {
      identityPubKey: identityPubKey,
      spkPubKey: spkPubKey,
      signature: signature,
      oneTimeKeys: oneTimeKeys
    };

    const keys: string = JSON.stringify(data);
    await NetworkService.registerDevice(accountName, deviceId, keys, tempToken);
  } catch (e) {
    log.error('Failed to register this deviceID. Clearing keys...', e);
    await SecretManager.resetAllSecrets(accountName);
    throw e;
  }
});

ipcMain.handle(
  'initializeEncryptMessage',
  async (_, authKey: string, content: string, roomID: string, senderID: string, receiverID: string, accountName: string) => {
    const data = await ProtocolService.initializeEncrypt(authKey, content, roomID, senderID, receiverID, accountName);
    return data;
  }
);

ipcMain.handle('getDevice', async () => {
  return await StorageService.generateDeviceId();
});

ipcMain.handle('decryptMessage', async (_, encryptedPackage: any, accountName: string, accountID) => {
  return await ProtocolService.initializeDecrypt(encryptedPackage, encryptedPackage.roomID, accountName, accountID);
});

ipcMain.handle(
  'saveMessage',
  async (_, roomID: string, senderID: string, messageData: messageData, nonce: string, chatName: string, accountName: string) => {
    return await StorageService.saveMessage(roomID, senderID, messageData, nonce, chatName, accountName);
  }
);

ipcMain.handle('getMessages', async (_, roomID: string, accountName: string) => {
  return await StorageService.getHistory(roomID, accountName);
});

ipcMain.handle('getLastMessage', async (_, roomID: ChatInfo, accountName: string) => {
  return await StorageService.getLastMessage(roomID, accountName);
});

ipcMain.handle('removeLocalKeys', async (_, accountName: string) => {
  return await StorageService.removeLocalKeys(accountName);
});
