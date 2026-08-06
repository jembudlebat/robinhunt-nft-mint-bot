import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs';
import { getDb, closeDb } from '../src/db/connection.js';
import { WalletRepo } from '../src/db/wallet.repo.js';
import { ContractRepo } from '../src/db/contract.repo.js';
import { RpcRepo } from '../src/db/rpc.repo.js';

describe('Database Repositories CRUD', () => {
  const testDbPath = path.join(process.cwd(), 'data', 'test_robinhunt.db');

  beforeEach(() => {
    closeDb();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    getDb(testDbPath);
  });

  afterAll(() => {
    closeDb();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  it('should add, retrieve, and remove wallets', () => {
    const w = WalletRepo.addWallet('TestWallet1', '0x1234567890123456789012345678901234567890', 'encrypted_key_data');
    expect(w.id).toBeDefined();
    expect(w.name).toBe('TestWallet1');

    const all = WalletRepo.getAllWallets();
    expect(all.length).toBe(1);

    const active = WalletRepo.getActiveWallets();
    expect(active.length).toBe(1);

    const removed = WalletRepo.removeWallet('TestWallet1');
    expect(removed).toBe(true);
    expect(WalletRepo.getAllWallets().length).toBe(0);
  });

  it('should add, update fields, and delete contracts', () => {
    const c = ContractRepo.addContract('RobinNFT', '0x1111111111111111111111111111111111111111', 'mint(uint256)', '0.05', 2);
    expect(c.name).toBe('RobinNFT');
    expect(c.mint_price).toBe('0.05');

    ContractRepo.updateContractField(c.id, 'mint_price', '0.1');
    const updated = ContractRepo.getContractById(c.id);
    expect(updated?.mint_price).toBe('0.1');

    ContractRepo.setMonitoringStatus(c.id, true);
    expect(ContractRepo.getMonitoredContracts().length).toBe(1);

    ContractRepo.deleteContract(c.id);
    expect(ContractRepo.getAllContracts().length).toBe(0);
  });

  it('should manage RPC nodes', () => {
    const rpc = RpcRepo.addRpc('PrimaryRPC', 'https://rpc.test.com', 1);
    expect(rpc.url).toBe('https://rpc.test.com');

    const rpcs = RpcRepo.getAllRpcs();
    expect(rpcs.length).toBe(1);

    RpcRepo.removeRpc('PrimaryRPC');
    expect(RpcRepo.getAllRpcs().length).toBe(0);
  });
});
