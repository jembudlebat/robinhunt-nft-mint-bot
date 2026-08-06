import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export interface AppEnvConfig {
  telegramBotToken: string;
  telegramAdminId: number;
  encryptionKey: string;
  defaultRpcUrls: string[];
  defaultChainId: number;
  dbPath: string;
  logLevel: string;
}

export function loadEnvConfig(): AppEnvConfig {
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN || '';
  const telegramAdminIdStr = process.env.TELEGRAM_ADMIN_ID || '0';
  const encryptionKey = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const defaultRpcUrls = (process.env.DEFAULT_RPC_URLS || 'https://rpc.robinhoodchain.com').split(',').map(u => u.trim());
  const defaultChainId = parseInt(process.env.DEFAULT_CHAIN_ID || '123456', 10);
  const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'data', 'robinhunt.db');
  const logLevel = process.env.LOG_LEVEL || 'info';

  if (!telegramBotToken && process.env.NODE_ENV === 'production') {
    throw new Error('TELEGRAM_BOT_TOKEN is required in environment variables!');
  }

  return {
    telegramBotToken,
    telegramAdminId: parseInt(telegramAdminIdStr, 10),
    encryptionKey,
    defaultRpcUrls,
    defaultChainId,
    dbPath,
    logLevel,
  };
}

export const env = loadEnvConfig();
