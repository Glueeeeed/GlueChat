import { ipcMain, BrowserWindow } from 'electron';
import WebSocket from 'ws';
import log from 'electron-log';
import { NotificationService } from '../Services/NotificationService';
import { NotificationManager } from './NotificationManager';

export class WebsocketManager {
  private ws: WebSocket | null = null;
  private mainWindow: BrowserWindow;
  private url : string | undefined  = process.env.VITE_WEBSOCKET_URL;

  private lastAuth: {userId: string, deviceId: string} | null = null;
  private joinedRooms: Set<string> = new Set<string>();

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
    this.initIpcListeners();
    this.connect();
  }

  private connect(): void {
    if (!this.url) {
      log.error('Server URL is not defined.');
      return;
    }

    log.debug('Connecting to WebSocket server:', this.url);

    this.ws = new WebSocket(this.url as string);

    this.ws.on('open', () : void => {
      log.info('Connected to WebSocket server.');

      if (this.lastAuth) {
        this.ws!.send(JSON.stringify({
          type: 'authenticate',
          payload: this.lastAuth
        }))
      }

      for (const roomId of this.joinedRooms) {
        this.ws!.send(JSON.stringify({
          type: 'join-chat',
          chatID: roomId,
          payload: {}
        }))
      }



      this.mainWindow.webContents.send('ws:status', 'connected');
    });

    this.ws.on('message', (data: string) : void => {
      const parsedData = JSON.parse(data);
      switch (parsedData.type) {
        case 'receive-message':
          log.debug('Received new message:', parsedData);

          if (!this.mainWindow.isFocused()) {
            NotificationService.showNewMessageNotification(parsedData.payload.accountName);
          }
          this.mainWindow.webContents.send('ws:receive-message', parsedData);
          break;

        case 'status-change':
          log.debug('Received status change:', parsedData);
          this.mainWindow.webContents.send('ws:status-change', parsedData);
          break;

        case 'PROFILE_UPDATED':
          log.debug('Received profile update:', parsedData);
          this.mainWindow.webContents.send('ws:profile-updated', parsedData);
          break;
      }
    });

    this.ws.on('close', () => {
      log.info('Disconnected from WebSocket server. Reconnecting in 3 seconds...');
      setTimeout(() => this.connect(), 3000);
    });
  }

  private initIpcListeners() : void {
    ipcMain.on('ws:send-message', (_event, messageData) => {

      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: 'send-message',
          chatID: messageData.roomID,
          payload: messageData
        }));
      }
    });

    ipcMain.on('ws:authenticate', (_event, userId: string, deviceId: string) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.lastAuth = {userId, deviceId};
        this.ws.send(JSON.stringify({
          type: 'authenticate',
          payload: {
            userID: userId,
            deviceId
          }
        }));
      }

      setTimeout(() => {
        NotificationManager.sendNotification('test', 'notification for check runtime process', true);
      }, 20000)
    });

    ipcMain.on('ws:join-room', (_event, roomId) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.joinedRooms.add(roomId);
        this.ws.send(JSON.stringify({
          type: 'join-chat',
          chatID: roomId,
          payload: {}
        }));
      }
    });
  }
}
