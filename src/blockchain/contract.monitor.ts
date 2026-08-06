import { ethers } from 'ethers';
import { ContractRepo } from '../db/contract.repo.js';
import { ContractRecord, MintResult } from '../types/index.js';
import { RpcManager } from './rpc.manager.js';
import { MintExecutor } from './mint.executor.js';
import { logger } from '../services/logger.service.js';

export type StatusCallback = (message: string, results?: MintResult[]) => void;

export class ContractMonitorService {
  private static instance: ContractMonitorService;
  private isRunning = false;
  private intervalTimer: NodeJS.Timeout | null = null;
  private checkIntervalMs = 3000; // 3 seconds interval
  private statusCallbacks: Set<StatusCallback> = new Set();
  private activeTriggers: Set<number> = new Set(); // Prevent duplicate triggers for contract IDs

  private constructor() {}

  public static getInstance(): ContractMonitorService {
    if (!ContractMonitorService.instance) {
      ContractMonitorService.instance = new ContractMonitorService();
    }
    return ContractMonitorService.instance;
  }

  public registerStatusCallback(callback: StatusCallback): () => void {
    this.statusCallbacks.add(callback);
    return () => this.statusCallbacks.delete(callback);
  }

  private notify(message: string, results?: MintResult[]): void {
    this.statusCallbacks.forEach(cb => {
      try {
        cb(message, results);
      } catch (err) {
        logger.error('Error executing status callback:', err);
      }
    });
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info('Contract Monitoring Engine STARTED.');
    this.notify('🔄 Contract Monitoring Engine Started.');

    this.intervalTimer = setInterval(() => {
      this.pollMonitoredContracts().catch(err => {
        logger.error('Error during monitoring poll loop:', err);
      });
    }, this.checkIntervalMs);
  }

  public stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    logger.info('Contract Monitoring Engine STOPPED.');
    this.notify('🛑 Contract Monitoring Engine Stopped.');
  }

  public getStatus(): { isRunning: boolean; monitoredContractsCount: number } {
    const contracts = ContractRepo.getMonitoredContracts();
    return {
      isRunning: this.isRunning,
      monitoredContractsCount: contracts.length,
    };
  }

  /**
   * Main polling cycle checking state of all monitored contracts
   */
  private async pollMonitoredContracts(): Promise<void> {
    const contracts = ContractRepo.getMonitoredContracts();
    if (contracts.length === 0) return;

    const provider = await RpcManager.getInstance().getProvider();

    for (const contract of contracts) {
      if (this.activeTriggers.has(contract.id)) continue;

      try {
        const isReady = await this.checkContractMintReadiness(contract, provider);
        if (isReady) {
          this.activeTriggers.add(contract.id);
          logger.info(`🚨 PUBLIC MINT DETECTED ACTIVE for Contract: ${contract.name} (${contract.address})!`);
          this.notify(`🚨 **PUBLIC MINT IS NOW ACTIVE!**\nContract: *${contract.name}*\nAddress: \`${contract.address}\`\nSubmitting transactions now...`);

          // Execute Mint immediately!
          const results = await MintExecutor.executeMint(contract, (partialResult) => {
            if (partialResult.txHash) {
              this.notify(`🚀 Tx Submitted for *${partialResult.walletName}*\nHash: \`${partialResult.txHash}\``);
            }
          });

          // Disable monitoring for this contract to prevent re-triggering
          ContractRepo.setMonitoringStatus(contract.id, false);
          this.activeTriggers.delete(contract.id);

          this.notify(`🎉 **Mint Execution Completed for ${contract.name}!**`, results);
        }
      } catch (err) {
        logger.debug(`Contract check for ${contract.name} (${contract.address}): Mint not active yet (${err instanceof Error ? err.message : String(err)})`);
      }
    }
  }

  /**
   * Simulates/checks if mint is active via eth_call static simulation or common state getters
   */
  private async checkContractMintReadiness(
    contract: ContractRecord,
    provider: ethers.JsonRpcProvider
  ): Promise<boolean> {
    // 1. First, check boolean state getters if available (e.g. isMintActive(), saleIsActive(), paused())
    try {
      const stateChecks = [
        { abi: 'function isMintActive() view returns (bool)', fn: 'isMintActive' },
        { abi: 'function saleIsActive() view returns (bool)', fn: 'saleIsActive' },
        { abi: 'function publicSaleActive() view returns (bool)', fn: 'publicSaleActive' },
        { abi: 'function paused() view returns (bool)', fn: 'paused', invert: true },
      ];

      for (const check of stateChecks) {
        try {
          const c = new ethers.Contract(contract.address, [check.abi], provider);
          const val: boolean = await c[check.fn]();
          if (check.invert ? !val : val) {
            return true;
          }
        } catch {
          // Ignore missing method errors
        }
      }
    } catch {
      // Continue to simulation fallback
    }

    // 2. Direct simulation via eth_call for the target mint function & calldata
    try {
      const calldata = MintExecutor.buildCalldata(contract);
      const priceWei = ethers.parseEther(contract.mint_price || '0.0');
      const totalPriceWei = priceWei * BigInt(contract.quantity);

      // Perform static call simulation from random dummy sender address
      const dummySender = '0x0000000000000000000000000000000000000001';
      await provider.call({
        to: contract.address,
        from: dummySender,
        data: calldata,
        value: totalPriceWei,
      });

      // If eth_call doesn't revert, public mint is open!
      return true;
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      // If error indicates insufficient balance or custom revert related to sender, but NOT "mint not active" or "sale paused", it might still be open.
      if (errMsg.includes('insufficient funds') || errMsg.includes('exceeds max per wallet')) {
        return true;
      }
      return false;
    }
  }
}
