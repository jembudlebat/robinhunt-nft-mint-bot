import { getDb } from './connection.js';
import { RpcRecord } from '../types/index.js';

export class RpcRepo {
  public static addRpc(name: string, url: string, priority = 1): RpcRecord {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO rpc_nodes (name, url, priority, is_active, latency_ms)
      VALUES (?, ?, ?, 1, 0)
    `);
    const info = stmt.run(name, url, priority);
    const lastId = Number(info.lastInsertRowid);
    return this.getRpcById(lastId)!;
  }

  public static getAllRpcs(): RpcRecord[] {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM rpc_nodes ORDER BY priority ASC, id ASC');
    return stmt.all() as unknown as RpcRecord[];
  }

  public static getActiveRpcs(): RpcRecord[] {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM rpc_nodes WHERE is_active = 1 ORDER BY priority ASC, latency_ms ASC');
    return stmt.all() as unknown as RpcRecord[];
  }

  public static getRpcById(id: number): RpcRecord | null {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM rpc_nodes WHERE id = ?');
    const result = stmt.get(id) as unknown as RpcRecord | undefined;
    return result || null;
  }

  public static updateLatency(id: number, latencyMs: number): void {
    const db = getDb();
    const stmt = db.prepare('UPDATE rpc_nodes SET latency_ms = ?, last_checked = CURRENT_TIMESTAMP WHERE id = ?');
    stmt.run(latencyMs, id);
  }

  public static removeRpc(idOrName: string | number): boolean {
    const db = getDb();
    const stmt = typeof idOrName === 'number'
      ? db.prepare('DELETE FROM rpc_nodes WHERE id = ?')
      : db.prepare('DELETE FROM rpc_nodes WHERE name = ? OR url = ?');
    const result = typeof idOrName === 'number'
      ? stmt.run(idOrName)
      : stmt.run(idOrName, idOrName);
    return Number(result.changes) > 0;
  }
}
