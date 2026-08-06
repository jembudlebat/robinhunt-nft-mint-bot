export interface WalletRecord {
  id: number;
  name: string;
  address: string;
  encrypted_private_key: string;
  is_active: number; // 1 = active, 0 = inactive
  created_at: string;
}

export interface RpcRecord {
  id: number;
  name: string;
  url: string;
  priority: number;
  is_active: number;
  latency_ms: number;
  last_checked: string | null;
}

export interface ContractRecord {
  id: number;
  name: string;
  address: string;
  mint_function: string; // e.g. "mint(uint256)" or "publicMint()" or selector "0xa0712d68"
  mint_price: string; // Ether amount as string, e.g. "0.05"
  quantity: number; // quantity per transaction
  gas_limit: string; // e.g. "250000"
  max_fee_per_gas: string; // Gwei as string, e.g. "10.5"
  max_priority_fee_per_gas: string; // Gwei as string, e.g. "1.5"
  is_monitored: number; // 1 = monitoring on, 0 = off
  custom_abi?: string; // Optional ABI JSON array if contract has non-standard ABI
  created_at: string;
}

export interface MintResult {
  walletAddress: string;
  walletName: string;
  txHash?: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  blockNumber?: number;
  gasUsed?: string;
  error?: string;
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
}
