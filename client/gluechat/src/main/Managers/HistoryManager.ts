import { app } from 'electron';
import path from 'path';
import Database from 'better-sqlite3';
import keytar from 'keytar';
import { randomBytes } from '@noble/post-quantum/utils.js';
import { CryptoCore, EncryptedData } from '../Services/CryptoCore';
import { ChatInfo, messageData } from '../Services/StorageService';
import log from 'electron-log';

export abstract class HistoryManager {
  private static dbs: Map<string, any> = new Map();

  static async getStorageKey(): Promise<Uint8Array> {
    let key = await keytar.getPassword('Gluechat', 'local_storage_key');

    if (!key) {
      const newKey = randomBytes(32);
      key = Buffer.from(newKey).toString('base64');
      await keytar.setPassword('Gluechat', 'local_storage_key', key);
    }

    return Buffer.from(key, 'base64');
  }

  static getDb(accountName: string): any {
    if (this.dbs.has(accountName)) {
      return this.dbs.get(accountName);
    }

    const userDataPath: string = app.getPath('userData');
    const dbPath: string = path.join(userDataPath, `${accountName}_history.db`);

    const db = new Database(dbPath);

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
    `);

    return db;
  }

  static async saveMessage(
    roomID: string,
    senderID: string,
    messageData: messageData,
    nonce: string,
    chatName: string,
    accountName: string
  ): Promise<void> {
    const key: Uint8Array<ArrayBufferLike> = await this.getStorageKey();
    const db = this.getDb(accountName);

    const encrypted: EncryptedData = CryptoCore.encryptData(messageData.content, key);

    const stmt = db.prepare(
      `INSERT OR IGNORE INTO chat_history (roomID, senderID, senderName, encryptedContent, messageID, isAuthor, isSeen, nonce)  VALUES (?, ?, ?, ?, ?, ?, ?, ?)  `
    );

    stmt.run(
      roomID,
      senderID,
      chatName,
      Buffer.from(encrypted.cipherText).toString('base64'),
      nonce,
      +messageData.isAuthor,
      +messageData.isSeen,
      Buffer.from(encrypted.nonce).toString('base64')
    );
  }

  static async getHistory(roomID: string, accountName: string): Promise<any> {
    const db = this.getDb(accountName);
    const rows = db.prepare('SELECT * FROM chat_history WHERE roomID = ? ORDER BY timestamp ASC').all(roomID);
    const key: Uint8Array<ArrayBufferLike> = await this.getStorageKey();

    return rows.map((row: any) => {
      const decrypted: string = CryptoCore.decryptData(Buffer.from(row.encryptedContent, 'base64'), Buffer.from(row.nonce, 'base64'), key);

      return {
        id: row.messageID,
        sender: row.senderName,
        content: decrypted,
        timestamp: new Date(row.timestamp + ' UTC').toLocaleTimeString(),
        isAuthor: Boolean(row.isAuthor),
        isSeen: Boolean(row.isSeen)
      };
    });
  }

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  static async getLastMessage(data: ChatInfo, accountName: string): any {
    const db = this.getDb(accountName);
    const row: any = db.prepare('SELECT * FROM chat_history WHERE roomID = ? ORDER BY timestamp DESC LIMIT 1').get(data.id);

    if (!row) {
      return null;
    }
    const key: Uint8Array<ArrayBufferLike> = await this.getStorageKey();

    const decrypted: string = CryptoCore.decryptData(Buffer.from(row.encryptedContent, 'base64'), Buffer.from(row.nonce, 'base64'), key);

    return {
      senderName: row.senderName,
      isAuthor: Boolean(row.isAuthor),
      content: decrypted
    };
  }

  static async resetAllHistory(accountName: string): Promise<void> {
    const db = this.getDb(accountName);
    db.prepare('DELETE FROM chat_history').run();
  }
}
