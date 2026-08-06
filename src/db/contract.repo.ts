import { getDb } from './connection.js';
import { ContractRecord } from '../types/index.js';

export class ContractRepo {
  public static addContract(
    name: string,
    address: string,
    mintFunction = 'mint(uint256)',
    mintPrice = '0.0',
    quantity = 1,
    gasLimit = '300000',
    maxFeePerGas = '5.0',
    maxPriorityFeePerGas = '1.5'
  ): ContractRecord {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO contracts (name, address, mint_function, mint_price, quantity, gas_limit, max_fee_per_gas, max_priority_fee_per_gas, is_monitored)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
    `);
    const info = stmt.run(name, address, mintFunction, mintPrice, quantity, gasLimit, maxFeePerGas, maxPriorityFeePerGas);
    const lastId = Number(info.lastInsertRowid);
    return this.getContractById(lastId)!;
  }

  public static getAllContracts(): ContractRecord[] {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM contracts ORDER BY id ASC');
    return stmt.all() as unknown as ContractRecord[];
  }

  public static getMonitoredContracts(): ContractRecord[] {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM contracts WHERE is_monitored = 1 ORDER BY id ASC');
    return stmt.all() as unknown as ContractRecord[];
  }

  public static getContractById(id: number): ContractRecord | null {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM contracts WHERE id = ?');
    const result = stmt.get(id) as unknown as ContractRecord | undefined;
    return result || null;
  }

  public static getContractByAddressOrName(query: string): ContractRecord | null {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM contracts WHERE address = ? OR name = ?');
    const result = stmt.get(query, query) as unknown as ContractRecord | undefined;
    return result || null;
  }

  public static updateContractField(id: number, field: keyof ContractRecord, value: any): boolean {
    const db = getDb();
    const allowedFields = [
      'name', 'address', 'mint_function', 'mint_price',
      'quantity', 'gas_limit', 'max_fee_per_gas',
      'max_priority_fee_per_gas', 'is_monitored', 'custom_abi'
    ];

    if (!allowedFields.includes(field as string)) {
      throw new Error(`Field '${field}' is not editable.`);
    }

    const stmt = db.prepare(`UPDATE contracts SET ${field} = ? WHERE id = ?`);
    const result = stmt.run(value, id);
    return Number(result.changes) > 0;
  }

  public static deleteContract(idOrAddress: string | number): boolean {
    const db = getDb();
    const stmt = typeof idOrAddress === 'number'
      ? db.prepare('DELETE FROM contracts WHERE id = ?')
      : db.prepare('DELETE FROM contracts WHERE address = ? OR name = ?');
    const result = typeof idOrAddress === 'number'
      ? stmt.run(idOrAddress)
      : stmt.run(idOrAddress, idOrAddress);
    return Number(result.changes) > 0;
  }

  public static setMonitoringStatus(id: number, isMonitored: boolean): boolean {
    const db = getDb();
    const stmt = db.prepare('UPDATE contracts SET is_monitored = ? WHERE id = ?');
    const result = stmt.run(isMonitored ? 1 : 0, id);
    return Number(result.changes) > 0;
  }
}
