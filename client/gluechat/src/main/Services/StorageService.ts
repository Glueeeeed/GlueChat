import keytar from 'keytar'
import { randomBytes } from '@noble/post-quantum/utils.js'
import { SecretManager } from '../Managers/SecretManager'
import { HistoryManager } from '../Managers/HistoryManager'

export interface SessionState {
  rootKey: Uint8Array
  messageKey?: Uint8Array
  salt?: Uint8Array
  opkId?: string
  capsule?: string
  alicePrivateKey?: Uint8Array
  bobPublicKey?: Uint8Array
  sendCounter?: number
  lastSenderID?: string
}

export interface messageData {
  id: string,
  sender: string,
  content: string,
  timestamp: string,
  isAuthor: boolean,
  isSeen: boolean
}

export interface ChatInfo {
  id: string
  name: string
  status: 'online' | 'offline'
  unread: boolean
  unreadCount: number
  senderID: string
  receiverID: string
}


export abstract class StorageService {


  static async saveMessage(roomID: string, senderID: string, messageData: messageData, nonce: string, chatName: string, accountName: string): Promise<void> {
   return HistoryManager.saveMessage(roomID,senderID,messageData,nonce,chatName,accountName);
  }

  static async getHistory(roomID: string, accountName: string) : Promise<any> {
    return HistoryManager.getHistory(roomID, accountName);
  }

  static async getLastMessage(data: ChatInfo, accountName: string) : any  {
    return HistoryManager.getLastMessage(data, accountName);
  }

  static async saveSession(roomID: string, data: string, accountID: string, accountName: string): Promise<void> {
    const combinedName: string = accountID + '-' + roomID;
    await SecretManager.setSecret(accountName, 'gluechat', combinedName, data);
  }
  static async deleteSession(roomID: string, accountID: string, accountName: string): Promise<void> {
    const combinedName: string = accountID + '-' + roomID;
    await SecretManager.deleteSecret(accountName,'gluechat', combinedName);
  }
  static async getSession(roomID: string, accountID: string, accountName: string): Promise<string | null> {
    const combinedName: string = accountID + '-' + roomID;
    return await SecretManager.getSecret(accountName, 'gluechat', combinedName);
  }

  static async getSigningKey(account: string, accountName: string): Promise<string | null> {
    const deviceId: string = await StorageService.generateDeviceId();
    const prefix = `device-${deviceId}`;
    return await SecretManager.getSecret(accountName, 'gluechat_' + account, `${prefix}-signingPrivateKey`);
  }

  static async getIdentityKey(account: string, accountName: string): Promise<string | null> {
    const deviceId: string = await StorageService.generateDeviceId();
    const prefix = `device-${deviceId}`;
    return await SecretManager.getSecret(accountName, 'gluechat_' + account, `${prefix}-identityKey`);
  }

  static async getPubIdentityKey(account: string, accountName: string): Promise<string | null> {
    const deviceId: string = await StorageService.generateDeviceId();
    const prefix = `device-${deviceId}`;
    return await SecretManager.getSecret(accountName, 'gluechat_' + account, `${prefix}-identityPubKey`);
  }

  static async getOneTimeKey(account: string, keyID: string, accountName: string): Promise<string | null> {
    const deviceId: string = await StorageService.generateDeviceId();
    const prefix = `device-${deviceId}`;
    return await SecretManager.getSecret(accountName, 'gluechat_' + account, `${prefix}-otk-${keyID}`);
  }

  static async removeOneTimeKey(account: string, keyID: string, accountName: string): Promise<void> {
    const deviceId: string = await StorageService.generateDeviceId();
    const prefix = `device-${deviceId}`;
    await SecretManager.deleteSecret(accountName, 'gluechat_' + account, `${prefix}-otk-${keyID}`)
  }

  static async generateDeviceId(): Promise<string> {
    const deviceId : string | null = await this.checkIfDeviceExists();
    if (!deviceId) {
      const deviceId: string = Buffer.from(randomBytes(8)).toString('base64');
      await keytar.setPassword('gluechat_device', 'id', deviceId);
      return deviceId;
    }
    return deviceId;
  }

  private static async checkIfDeviceExists() : Promise<string | null> {
    return await keytar.getPassword('gluechat_device', 'id');
  }



}
