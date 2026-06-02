import keytar from 'keytar';
import Database from 'better-sqlite3';
import {CryptoCore} from './CryptoCore'
import path from 'path'
import { randomBytes } from '@noble/post-quantum/utils.js'
import { app } from 'electron'
import { SecretManager } from './SecretManager'

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


export abstract class StorageService {
  private static dbs: Map<string, any> = new Map()

  private static getDb(accountName: string) {
    if (this.dbs.has(accountName)) {
      return this.dbs.get(accountName)
    }

    const userDataPath = app.getPath('userData')
    const dbPath = path.join(userDataPath, `${accountName}_history.db`)
    console.log(`dbPath: ${dbPath}`)

    const db = new Database(dbPath)

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

    return db
  }
  private static async getStorageKey(): Promise<Uint8Array> {
    let key = await keytar.getPassword('Gluechat', 'local_storage_key')

    if (!key) {
      const newKey = randomBytes(32)
      key = Buffer.from(newKey).toString('base64')
      await keytar.setPassword('Gluechat', 'local_storage_key', key)
    }

    return Buffer.from(key, 'base64')
  }

  static async saveMessage(roomID: string, senderID: string, messageData: messageData, nonce: string, chatName: string, accountName: string): Promise<void> {
    const key = await this.getStorageKey()
    const db = this.getDb(accountName)

    const encrypted = (CryptoCore as any).encryptData(messageData.content, key)

    const stmt = db.prepare(`INSERT OR IGNORE INTO chat_history (roomID, senderID, senderName, encryptedContent, messageID, isAuthor, isSeen, nonce)  VALUES (?, ?, ?, ?, ?, ?, ?, ?)  `)

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

  static async getHistory(roomID: string, accountName: string) {
    const db = this.getDb(accountName);
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

  static async getLastMessage(data: ChatInfo, accountName: string) {
    const db = this.getDb(accountName);
    const row: any = db
      .prepare('SELECT * FROM chat_history WHERE roomID = ? ORDER BY timestamp DESC LIMIT 1')
      .get(data.id)

    if (!row) return null
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

  static async saveSession(roomID: string, data: string, accountID: string, accountName: string): Promise<void> {
    const combinedName: string = accountID + '-' + roomID
    await SecretManager.setSecret(accountName, 'gluechat', combinedName, data)
  }
  static async deleteSession(roomID: string, accountID: string, accountName: string): Promise<void> {
    const combinedName: string = accountID + '-' + roomID
    await SecretManager.deleteSecret(accountName,'gluechat', combinedName);
  }
  static async getSession(roomID: string, accountID: string, accountName: string): Promise<string | null> {
    const combinedName: string = accountID + '-' + roomID
    return await SecretManager.getSecret(accountName, 'gluechat', combinedName)
  }

  static async getSigningKey(account: string, accountName: string): Promise<string | null> {
    return await SecretManager.getSecret(accountName, 'gluechat_' + account, 'signingPrivateKey')
  }

  static async getIdentityKey(account: string, accountName: string): Promise<string | null> {
    return await SecretManager.getSecret(accountName, 'gluechat_' + account, 'identityKey')
  }

  static async getPubIdentityKey(account: string, accountName: string): Promise<string | null> {
    return await SecretManager.getSecret(accountName, 'gluechat_' + account, 'identityPubKey')
  }

  static async getOneTimeKey(account: string, keyID: string, accountName: string): Promise<string | null> {
    return await SecretManager.getSecret(accountName, 'gluechat_' + account, keyID)
  }
}
