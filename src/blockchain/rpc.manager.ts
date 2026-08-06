import { ethers } from 'ethers';
import { RpcRepo } from '../db/rpc.repo.js';
import { env } from '../config/env.js';
import { logger } from '../services/logger.service.js';
import { RpcRecord } from '../types/index.js';

export class RpcManager {
  private static instance: RpcManager;
  private currentProvider: ethers.JsonRpcProvider | null = null;
  private activeRpcIndex = 0;
  private isChecking = false;

  private constructor() {
    this.ensureDefaultRpcs();
  }

  public static getInstance(): RpcManager {
    if (!RpcManager.instance) {
      RpcManager.instance = new RpcManager();
    }
    return RpcManager.instance;
  }

  private ensureDefaultRpcs(): void {
    const existing = RpcRepo.getAllRpcs();
    if (existing.length === 0) {
      env.defaultRpcUrls.forEach((url, idx) => {
        RpcRepo.addRpc(`RPC-${idx + 1}`, url, idx + 1);
      });
      logger.info(`Initialized default RPCs: ${env.defaultRpcUrls.join(', ')}`);
    }
  }

  /**
   * Get an active operational ethers.JsonRpcProvider with automatic failover
   */
  public async getProvider(): Promise<ethers.JsonRpcProvider> {
    if (this.currentProvider) {
      try {
        // Quick health check on current provider
        await this.currentProvider.getBlockNumber();
        return this.currentProvider;
      } catch (err) {
        logger.warn(`Current RPC provider failed health check. Triggering failover...`);
        this.currentProvider = null;
      }
    }

    const rpcs = RpcRepo.getActiveRpcs();
    if (rpcs.length === 0) {
      throw new Error('No active RPC nodes available in database!');
    }

    for (let i = 0; i < rpcs.length; i++) {
      const rpc = rpcs[i];
      try {
        const start = Date.now();
        const provider = new ethers.JsonRpcProvider(rpc.url, env.defaultChainId, {
          staticNetwork: true,
        });
        await provider.getBlockNumber();
        const latency = Date.now() - start;

        RpcRepo.updateLatency(rpc.id, latency);
        this.currentProvider = provider;
        this.activeRpcIndex = i;
        logger.info(`Switched to active RPC provider: ${rpc.name} (${rpc.url}) [Latency: ${latency}ms]`);
        return provider;
      } catch (err) {
        logger.warn(`RPC node ${rpc.name} (${rpc.url}) unresponsive: ${err instanceof Error ? err.message : String(err)}`);
        RpcRepo.updateLatency(rpc.id, 9999);
      }
    }

    // Fallback attempt: create provider anyway on primary URL
    logger.error('All active RPC nodes failed latency check! Falling back to primary URL.');
    const fallbackUrl = rpcs[0]?.url || env.defaultRpcUrls[0];
    this.currentProvider = new ethers.JsonRpcProvider(fallbackUrl);
    return this.currentProvider;
  }

  /**
   * Periodically check latencies of all stored RPCs
   */
  public async benchmarkAllRpcs(): Promise<RpcRecord[]> {
    if (this.isChecking) return RpcRepo.getAllRpcs();
    this.isChecking = true;

    const rpcs = RpcRepo.getAllRpcs();
    for (const rpc of rpcs) {
      try {
        const start = Date.now();
        const tempProvider = new ethers.JsonRpcProvider(rpc.url);
        await Promise.race([
          tempProvider.getBlockNumber(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000)),
        ]);
        const latency = Date.now() - start;
        RpcRepo.updateLatency(rpc.id, latency);
      } catch {
        RpcRepo.updateLatency(rpc.id, 9999);
      }
    }

    this.isChecking = false;
    return RpcRepo.getAllRpcs();
  }
}
