import keytar from 'keytar';
import Database from 'better-sqlite3';
import {CryptoCore} from './CryptoCore'
import path from 'path'
import { randomBytes } from '@noble/post-quantum/utils.js'

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

const db = new Database(path.join(process.cwd(), `${process.argv[2] || 'DefaultUser'}_history.db`))

db.exec(`
  CREATE TABLE IF NOT EXISTS chat_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    roomID TEXT,
    senderID TEXT,
    senderName TEXT,
    encryptedContent TEXT,
    messageID TEXT UNIQUE,
    isAuthor BOOLEAN DEFAULT NULL,
    isSeen BOOLEAN DEFAULT NULL,
    nonce TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`)


export abstract class StorageService {
  private static async getStorageKey(): Promise<Uint8Array> {
    let key = await keytar.getPassword('Gluechat', 'local_storage_key')

    if (!key) {
      const newKey = randomBytes(32)
      key = Buffer.from(newKey).toString('base64')
      await keytar.setPassword('Gluechat', 'local_storage_key', key)
    }

    return Buffer.from(key, 'base64')
  }

  static async saveMessage(
    roomID: string,
    senderID: string,
    messageData: messageData,
    nonce: string,
    chatName: string
  ): Promise<void> {
    const key = await this.getStorageKey()

    const encrypted = (CryptoCore as any).encryptData(messageData.content, key)

    const stmt = db.prepare(`
      INSERT OR IGNORE INTO chat_history (roomID, senderID, senderName, encryptedContent, messageID, isAuthor, isSeen, nonce)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      roomID,
      senderID,
      chatName,
      Buffer.from(encrypted.cipherText).toString('base64'),
      nonce,
      +messageData.isAuthor,
      +messageData.isSeen,
      Buffer.from(encrypted.nonce).toString('base64')
    )
  }

  static async getHistory(roomID: string) {
    const rows = db
      .prepare('SELECT * FROM chat_history WHERE roomID = ? ORDER BY timestamp ASC')
      .all(roomID)
    const key = await this.getStorageKey()

    return rows.map((row: any) => {
      const decrypted = (CryptoCore as any).decryptData(
        Buffer.from(row.encryptedContent, 'base64'),
        Buffer.from(row.nonce, 'base64'),
        key
      )

      return {
        id: row.messageID,
        sender: row.senderName,
        content: decrypted,
        timestamp: new Date(row.timestamp + ' UTC').toLocaleTimeString(),
        isAuthor: Boolean(row.isAuthor),
        isSeen: Boolean(row.isSeen)
      }
    })
  }

  static async getLastMessage(data: ChatInfo) {

    const row: any = db
      .prepare('SELECT * FROM chat_history WHERE roomID = ? ORDER BY timestamp DESC LIMIT 1')
      .get(data.id);

    if (!row) return null;
    const key = await this.getStorageKey()

    const decrypted = (CryptoCore as any).decryptData(
      Buffer.from(row.encryptedContent, 'base64'),
      Buffer.from(row.nonce, 'base64'),
      key
    )

    return {
      senderName: row.senderName,
      isAuthor: Boolean(row.isAuthor),
      content: decrypted
    }
  }

  static async saveSession(roomID: string, data: string, accountID: string): Promise<void> {
    const combinedName: string = accountID + '-' + roomID
    await keytar.setPassword('gluechat', combinedName, data)
  }
  static async deleteSession(roomID: string, accountID: string): Promise<void> {
    const combinedName: string = accountID + '-' + roomID
    await keytar.deletePassword('gluechat', combinedName)
  }
  static async getSession(roomID: string, accountID: string): Promise<string | null> {
    const combinedName: string = accountID + '-' + roomID
    return await keytar.getPassword('gluechat', combinedName)
  }

  static async getSigningKey(account: string): Promise<string | null> {
    return await keytar.getPassword('gluechat_' + account, 'signingPrivateKey')
  }

  static async getIdentityKey(account: string): Promise<string | null> {
    return await keytar.getPassword('gluechat_' + account, 'identityKey')
  }

  static async getPubIdentityKey(account: string): Promise<string | null> {
    return await keytar.getPassword('gluechat_' + account, 'identityPubKey')
  }

  static async getOneTimeKey(account: string, keyID: string): Promise<string | null> {
    return await keytar.getPassword('gluechat_' + account, keyID)
  }
}
