import { SecretManager } from './SecretManager';
import { CryptoCore } from '../Services/CryptoCore';

export abstract class SessionKeyManager {

  static async saveRootKeyForSession(accountName: string, combineName: string, appSessionId: string, rootKey: Uint8Array, sendCounter: number): Promise<void> {
    const db = SecretManager.getDb(accountName);
    const storageKey : Uint8Array<ArrayBufferLike> = await SecretManager.getStorageKey();
    const encryptedKey : Uint8Array<ArrayBufferLike> = CryptoCore.encryptData(rootKey, storageKey);
    const keyBase64 : string = Buffer.from(encryptedKey).toString('base64');

    const stmt = db.prepare(`
      INSERT INTO session_root_keys (combine_name, app_session_id, root_key, send_counter, is_active, updated_at)
      VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
      ON CONFLICT(combine_name, app_session_id) DO UPDATE SET
        root_key = excluded.root_key,
        send_counter = excluded.send_counter,
        updated_at = CURRENT_TIMESTAMP
    `);

    stmt.run(combineName, appSessionId, keyBase64, sendCounter);
  }


  static async handleSessionRotation(accountName: string, previousSessionId: string, newSessionId: string): Promise<void> {
    const db = SecretManager.getDb(accountName);

    db.prepare(
      `
      UPDATE session_root_keys
      SET is_active = 0
      WHERE app_session_id = ?
    `
    ).run(previousSessionId);

    const deleteOlderStmt = db.prepare(`
      DELETE FROM session_root_keys
      WHERE app_session_id NOT IN (?, ?)
    `);
    deleteOlderStmt.run(newSessionId, previousSessionId);
  }


  static async getRootKeyForSession(accountName : string, combineName : string, appSessionId? : string): Promise<{ rootKey: Uint8Array; sendCounter: number } | null> {
    const db = SecretManager.getDb(accountName);
    const storageKey: Uint8Array<ArrayBufferLike> = await SecretManager.getStorageKey();

    let query : string = 'SELECT root_key, send_counter FROM session_root_keys WHERE combine_name = ?';
    const params: any[] = [combineName];

    if (appSessionId) {
      query += ' AND app_session_id = ?';
      params.push(appSessionId);
    } else {
      query += ' AND is_active = 1 ORDER BY updated_at DESC LIMIT 1';
    }

    const row = db.prepare(query).get(...params);
    if (!row) return null;

    const decrypted : Uint8Array<ArrayBufferLike> = CryptoCore.decrypt(Buffer.from(row.root_key, 'base64'), storageKey);
    return {
      rootKey: decrypted,
      sendCounter: row.send_counter
    };
  }
}
