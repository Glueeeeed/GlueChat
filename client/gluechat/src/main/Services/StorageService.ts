import keytar from 'keytar'

export interface SessionState {
  rootKey: Uint8Array
  messageKey?: Uint8Array
  salt?: Uint8Array
  opkId?: string
  capsule?: string
  alicePrivateKey: Uint8Array
  bobPublicKey: Uint8Array
  sendCounter: number
  lastSenderID: string
}
export abstract class StorageService {
  static async saveSession(roomID : string, data : string): Promise<void> {
    await keytar.setPassword('gluechat', roomID, data);
  }
  static async deleteSession(roomID : string): Promise<void> {
     await keytar.deletePassword('gluechat', roomID);
  }
  static async getSession(roomID : string): Promise<string | null> {
    return await keytar.getPassword('gluechat', roomID);
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
