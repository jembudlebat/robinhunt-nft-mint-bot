import { ethers } from 'ethers';
import { WalletRepo } from '../db/wallet.repo.js';
import { CryptoService } from '../services/crypto.service.js';
import { env } from '../config/env.js';
import { RpcManager } from './rpc.manager.js';
import { WalletRecord } from '../types/index.js';
import { logger } from '../services/logger.service.js';

export class WalletManager {
  /**
   * Get connected ethers.Wallet instances for all active wallets
   */
  public static async getActiveSigners(): Promise<{ record: WalletRecord; signer: ethers.Wallet }[]> {
    const records = WalletRepo.getActiveWallets();
    if (records.length === 0) {
      throw new Error('No active wallets configured! Add or activate at least one wallet first.');
    }

    const provider = await RpcManager.getInstance().getProvider();
    const signers: { record: WalletRecord; signer: ethers.Wallet }[] = [];

    for (const record of records) {
      try {
        const rawPrivateKey = CryptoService.decryptPrivateKey(record.encrypted_private_key, env.encryptionKey);
        const wallet = new ethers.Wallet(rawPrivateKey, provider);
        signers.push({ record, signer: wallet });
      } catch (err) {
        logger.error(`Failed to decrypt private key for wallet '${record.name}':`, err);
      }
    }

    if (signers.length === 0) {
      throw new Error('Failed to initialize any active wallet signers. Check encryption key.');
    }

    return signers;
  }

  /**
   * Get native ETH/Gas balance for a given wallet address
   */
  public static async getWalletBalance(address: string): Promise<string> {
    const provider = await RpcManager.getInstance().getProvider();
    const balanceWei = await provider.getBalance(address);
    return ethers.formatEther(balanceWei);
  }
}
