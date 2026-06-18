import { app } from 'electron'
import path from 'path'
import Database from 'better-sqlite3'

export abstract class SecretManager {
  private static dbs: Map<string, any> = new Map()

  private static getDb(accountName: string) : any {
    if (this.dbs.has(accountName)) {
      return this.dbs.get(accountName)
    }

    const userDataPath = app.getPath('userData')
    const dbPath = path.join(userDataPath, `${accountName}_secrets.db`)
    console.log(`dbPath: ${dbPath}`)

    const db = new Database(dbPath)

    db.exec(`
      CREATE TABLE IF NOT EXISTS secrets (
        service TEXT NOT NULL,
        account TEXT NOT NULL,
        value TEXT NOT NULL,
        PRIMARY KEY (service,account)
      )
    `)

    return db
  }

  static async setSecret(accountName: string, service: string, account : string , value : string) : Promise<void> {
    const db = this.getDb(accountName);
    const stmt = db.prepare(`INSERT INTO secrets(service, account, value) VALUES (?,?,?) ON CONFLICT(service,account) DO UPDATE SET value = excluded.value`);
    stmt.run(service, account, value);
  }

  static async getSecret(accountName: string ,service: string ,account: string) : Promise<string | null> {
    const db = this.getDb(accountName);
    const row = db.prepare('SELECT value FROM secrets WHERE service = ? AND account = ?').get(service,account) as { value?: string } | undefined;
    return row && typeof row.value === 'string' ? row.value : null;
  }

  static async deleteSecret(accountName: string ,service: string, account: string ) : Promise<void> {
    const db = this.getDb(accountName);
    const stmt = db.prepare('DELETE FROM secrets WHERE service = ? AND account = ?');
    stmt.run(service,account);
  }

}
