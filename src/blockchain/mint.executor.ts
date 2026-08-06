import { ethers } from 'ethers';
import { ContractRecord, MintResult } from '../types/index.js';
import { WalletManager } from './wallet.manager.js';
import { RpcManager } from './rpc.manager.js';
import { logger } from '../services/logger.service.js';

export class MintExecutor {
  /**
   * Resolve function data payload for minting
   */
  public static buildCalldata(contract: ContractRecord): string {
    const fnSig = contract.mint_function.trim();
    const qty = contract.quantity;

    // Check if it's already a 4-byte selector (e.g. 0xa0712d68)
    if (fnSig.startsWith('0x') && fnSig.length === 10) {
      // Hex selector: append uint256 encoded quantity if quantity > 0
      const encodedQty = ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [qty]).substring(2);
      return `${fnSig}${encodedQty}`;
    }

    // Standard function signature parsing
    try {
      if (fnSig.includes('(') && fnSig.includes(')')) {
        const iface = new ethers.Interface([`function ${fnSig}`]);
        const fnName = fnSig.split('(')[0];

        // Check param types
        const match = fnSig.match(/\(([^)]*)\)/);
        const paramTypes = match && match[1] ? match[1].split(',').map(s => s.trim()) : [];

        if (paramTypes.length === 0) {
          return iface.encodeFunctionData(fnName, []);
        } else if (paramTypes.length === 1 && paramTypes[0].includes('uint')) {
          return iface.encodeFunctionData(fnName, [qty]);
        } else if (paramTypes.length === 2 && paramTypes[0] === 'address' && paramTypes[1].includes('uint')) {
          // e.g. mint(address to, uint256 quantity) - placeholder receiver address
          return iface.encodeFunctionData(fnName, [ethers.ZeroAddress, qty]);
        }
      }
    } catch (err) {
      logger.warn(`Could not parse custom interface for '${fnSig}', generating generic calldata: ${err}`);
    }

    // Fallback: Default to standard `mint(uint256)` encoding
    const defaultIface = new ethers.Interface(['function mint(uint256)']);
    return defaultIface.encodeFunctionData('mint', [qty]);
  }

  /**
   * Execute immediate mint transactions from all active wallets
   */
  public static async executeMint(
    contract: ContractRecord,
    onProgress?: (result: MintResult) => void
  ): Promise<MintResult[]> {
    logger.info(`Initiating NFT Mint Execution for Contract: ${contract.name} (${contract.address})`);

    const signersWithRecords = await WalletManager.getActiveSigners();
    const provider = await RpcManager.getInstance().getProvider();

    const priceWei = ethers.parseEther(contract.mint_price || '0.0');
    const totalPriceWei = priceWei * BigInt(contract.quantity);
    const gasLimit = BigInt(contract.gas_limit || '300000');
    const maxFeePerGas = ethers.parseUnits(contract.max_fee_per_gas || '5.0', 'gwei');
    const maxPriorityFeePerGas = ethers.parseUnits(contract.max_priority_fee_per_gas || '1.5', 'gwei');

    const calldata = this.buildCalldata(contract);
    const results: MintResult[] = [];

    // Execute parallel non-blocking mint transactions across all wallets
    const mintPromises = signersWithRecords.map(async ({ record, signer }) => {
      const initialResult: MintResult = {
        walletAddress: signer.address,
        walletName: record.name,
        status: 'PENDING',
      };

      try {
        // Fetch current nonce for exact execution
        const nonce = await provider.getTransactionCount(signer.address, 'pending');

        // Verify balance
        const balance = await provider.getBalance(signer.address);
        if (balance < totalPriceWei) {
          throw new Error(`Insufficient funds: Balance (${ethers.formatEther(balance)} ETH) < Required (${ethers.formatEther(totalPriceWei)} ETH)`);
        }

        const txRequest: ethers.TransactionRequest = {
          to: contract.address,
          data: calldata,
          value: totalPriceWei,
          nonce: nonce,
          gasLimit: gasLimit,
          maxFeePerGas: maxFeePerGas,
          maxPriorityFeePerGas: maxPriorityFeePerGas,
          type: 2, // EIP-1559
        };

        logger.info(`Sending Tx from Wallet [${record.name}] (${signer.address})...`);
        const txResponse = await signer.sendTransaction(txRequest);
        
        initialResult.txHash = txResponse.hash;
        logger.info(`Tx Submitted! Hash: ${txResponse.hash} (Wallet: ${record.name})`);
        if (onProgress) onProgress(initialResult);

        // Wait for block confirmation
        const receipt = await txResponse.wait(1);
        if (receipt && receipt.status === 1) {
          initialResult.status = 'CONFIRMED';
          initialResult.blockNumber = receipt.blockNumber;
          initialResult.gasUsed = receipt.gasUsed.toString();
          logger.info(`Tx Confirmed! Block: ${receipt.blockNumber} (Wallet: ${record.name})`);
        } else {
          initialResult.status = 'FAILED';
          initialResult.error = 'Transaction reverted on-chain.';
          logger.error(`Tx Reverted! Hash: ${txResponse.hash} (Wallet: ${record.name})`);
        }
      } catch (err: any) {
        initialResult.status = 'FAILED';
        initialResult.error = err instanceof Error ? err.message : String(err);
        logger.error(`Mint transaction failed for Wallet [${record.name}]: ${initialResult.error}`);
      }

      if (onProgress) onProgress(initialResult);
      return initialResult;
    });

    const settledResults = await Promise.all(mintPromises);
    return settledResults;
  }
}
