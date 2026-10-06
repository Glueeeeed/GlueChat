import { app } from 'electron';
import path from 'path';
import Database from 'better-sqlite3';
import keytar from 'keytar';
import { CryptoCore } from '../Services/CryptoCore';

export abstract class SecretManager {
  private static dbs: Map<string, any> = new Map();

  static async getStorageKey(): Promise<Uint8Array> {
    let key = await keytar.getPassword('Gluechat', 'local_secret_key');

    if (!key) {
      const newKey = CryptoCore.generateRandomBytes(32);
      key = Buffer.from(newKey).toString('base64');
      await keytar.setPassword('Gluechat', 'local_secret_key', key);
    }

    return Buffer.from(key, 'base64');
  }

  static async setSecret(accountName: string, service: string, account: string, value: string): Promise<void> {
    const db = this.getDb(accountName);
    const key: Uint8Array<ArrayBufferLike> = await this.getStorageKey();
    const encrypted: Uint8Array = CryptoCore.encryptData(new TextEncoder().encode(value), key);

    const stmt = db.prepare(
      `INSERT INTO secrets(service, account, value) VALUES (?,?,?) ON CONFLICT(service,account) DO UPDATE SET value = excluded.value`
    );
    stmt.run(service, account, Buffer.from(encrypted).toString('base64'));
  }

  static async getSecret(accountName: string, service: string, account: string): Promise<string | null> {
    const db = this.getDb(accountName);
    const key: Uint8Array<ArrayBufferLike> = await this.getStorageKey();
    const row = db.prepare('SELECT value FROM secrets WHERE service = ? AND account = ?').get(service, account) as { value?: string } | undefined;
    const value = row ? row.value : null;
    if (!value) {
      return null;
    } else {
      const decrypted: Uint8Array = CryptoCore.decrypt(Buffer.from(value, 'base64'), key);
      return new TextDecoder().decode(decrypted);
    }
  }

  static async deleteSecret(accountName: string, service: string, account: string): Promise<void> {
    const db = this.getDb(accountName);
    const stmt = db.prepare('DELETE FROM secrets WHERE service = ? AND account = ?');
    stmt.run(service, account);
  }

  static async resetAllSecrets(accountName: string): Promise<void> {
    const db = this.getDb(accountName);
    db.prepare('DELETE FROM secrets').run();
  }

  private static getDb(accountName: string): any {
    if (this.dbs.has(accountName)) {
      return this.dbs.get(accountName);
    }

    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, `${accountName}_secrets.db`);

    const db = new Database(dbPath);

    db.exec(`
      CREATE TABLE IF NOT EXISTS secrets (
        service TEXT NOT NULL,
        account TEXT NOT NULL,
        value TEXT NOT NULL,
        PRIMARY KEY (service,account)
      )
    `);

    return db;
  }
}
