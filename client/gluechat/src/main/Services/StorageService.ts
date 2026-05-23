import keytar from 'keytar'

export interface SessionState {
  rootKey: Uint8Array
  messageKey?: Uint8Array
  salt?: Uint8Array
  opkId?: string
  capsule?: string
  alicePrivateKey?: Uint8Array
  bobPublicKey?: Uint8Array
  sendCounter: number
  lastSenderID: string
}
export abstract class StorageService {
  static async saveSession(roomID : string, data : string, accountID : string): Promise<void> {
    const combinedName : string = accountID + '-' + roomID;
    await keytar.setPassword('gluechat', combinedName, data);
  }
  static async deleteSession(roomID : string, accountID: string): Promise<void> {
    const combinedName : string = accountID + '-' + roomID
    await keytar.deletePassword('gluechat', combinedName);
  }
  static async getSession(roomID : string, accountID: string): Promise<string | null> {
    const combinedName : string = accountID + '-' + roomID
    return await keytar.getPassword('gluechat',  combinedName);
  }

  static async getSigningKey(account : string): Promise<string | null> {
    return await keytar.getPassword('gluechat_' + account, 'signingPrivateKey');
  }

  static async getIdentityKey(account : string): Promise<string | null> {
    return await keytar.getPassword('gluechat_' + account, 'identityKey');
  }

  static async getPubIdentityKey(account : string): Promise<string | null> {
    return await keytar.getPassword('gluechat_' + account, 'identityPubKey');
  }

  static async getOneTimeKey(account : string, keyID : string): Promise<string | null> {
    return await keytar.getPassword('gluechat_' + account, keyID);
  }
}
