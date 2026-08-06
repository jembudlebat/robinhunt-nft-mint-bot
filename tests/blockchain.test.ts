import { describe, it, expect } from 'vitest';
import { MintExecutor } from '../src/blockchain/mint.executor.js';
import { ContractRecord } from '../src/types/index.js';

describe('MintExecutor Calldata Encoder', () => {
  const dummyContract: ContractRecord = {
    id: 1,
    name: 'TestNFT',
    address: '0x1234567890123456789012345678901234567890',
    mint_function: 'mint(uint256)',
    mint_price: '0.05',
    quantity: 2,
    gas_limit: '300000',
    max_fee_per_gas: '5.0',
    max_priority_fee_per_gas: '1.5',
    is_monitored: 0,
    created_at: new Date().toISOString(),
  };

  it('should encode standard mint(uint256) function correctly', () => {
    const calldata = MintExecutor.buildCalldata(dummyContract);
    // mint(uint256) selector is 0xa0712d68
    expect(calldata.startsWith('0xa0712d68')).toBe(true);
    expect(calldata.length).toBe(10 + 64); // 4 bytes selector + 32 bytes uint256
  });

  it('should handle custom function selectors directly', () => {
    const customContract = { ...dummyContract, mint_function: '0x12345678' };
    const calldata = MintExecutor.buildCalldata(customContract);
    expect(calldata.startsWith('0x12345678')).toBe(true);
  });

  it('should encode parameterless mint() function signature', () => {
    const customContract = { ...dummyContract, mint_function: 'publicMint()' };
    const calldata = MintExecutor.buildCalldata(customContract);
    expect(calldata.length).toBe(10); // selector only
  });
});
