import { getDb } from './connection.js';
import { WalletRecord } from '../types/index.js';

export class WalletRepo {
  public static addWallet(name: string, address: string, encryptedPrivateKey: string): WalletRecord {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO wallets (name, address, encrypted_private_key, is_active)
      VALUES (?, ?, ?, 1)
    `);
    const info = stmt.run(name, address, encryptedPrivateKey);
    const lastId = Number(info.lastInsertRowid);
    return this.getWalletById(lastId)!;
  }

  public static getAllWallets(): WalletRecord[] {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM wallets ORDER BY id ASC');
    return stmt.all() as unknown as WalletRecord[];
  }

  public static getActiveWallets(): WalletRecord[] {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM wallets WHERE is_active = 1 ORDER BY id ASC');
    return stmt.all() as unknown as WalletRecord[];
  }

  public static getWalletById(id: number): WalletRecord | null {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM wallets WHERE id = ?');
    const result = stmt.get(id) as unknown as WalletRecord | undefined;
    return result || null;
  }

  public static getWalletByName(name: string): WalletRecord | null {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM wallets WHERE name = ?');
    const result = stmt.get(name) as unknown as WalletRecord | undefined;
    return result || null;
  }

  public static removeWallet(idOrName: string | number): boolean {
    const db = getDb();
    const stmt = typeof idOrName === 'number'
      ? db.prepare('DELETE FROM wallets WHERE id = ?')
      : db.prepare('DELETE FROM wallets WHERE name = ? OR address = ?');
    const result = stmt.run(idOrName);
    return Number(result.changes) > 0;
  }

  public static toggleWalletActive(id: number, isActive: boolean): boolean {
    const db = getDb();
    const stmt = db.prepare('UPDATE wallets SET is_active = ? WHERE id = ?');
    const result = stmt.run(isActive ? 1 : 0, id);
    return Number(result.changes) > 0;
  }
}
