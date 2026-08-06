import { getDb, closeDb } from './db/connection.js';
import { RpcManager } from './blockchain/rpc.manager.js';
import { ContractMonitorService } from './blockchain/contract.monitor.js';
import { createBot } from './bot/index.js';
import { logger } from './services/logger.service.js';
import { env } from './config/env.js';

async function main() {
  logger.info('====================================================');
  logger.info('   Robinhood Chain NFT Minting Telegram Bot v1.0   ');
  logger.info('====================================================');

  try {
    // 1. Initialize SQLite Database
    getDb();

    // 2. Initialize RPC Provider Manager
    const rpcManager = RpcManager.getInstance();
    await rpcManager.getProvider();
    logger.info('RPC Provider Manager initialized successfully.');

    // 3. Initialize Telegram Bot
    const bot = createBot();

    if (env.telegramBotToken) {
      logger.info('Launching Telegram Bot long-polling...');
      bot.launch({
        dropPendingUpdates: true,
      }).then(() => {
        logger.info('Telegram Bot active and listening for commands.');
      }).catch(err => {
        logger.error('Failed to launch Telegram bot polling:', err);
      });
    } else {
      logger.warn('TELEGRAM_BOT_TOKEN not provided. Bot long-polling skipped.');
    }

    // 4. Graceful Shutdown Handlers
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Gracefully shutting down...`);
      try {
        ContractMonitorService.getInstance().stop();
        if (env.telegramBotToken) {
          bot.stop(signal);
        }
        closeDb();
        logger.info('Shutdown complete.');
        process.exit(0);
      } catch (err) {
        logger.error('Error during shutdown:', err);
        process.exit(1);
      }
    };

    process.once('SIGINT', () => shutdown('SIGINT'));
    process.once('SIGTERM', () => shutdown('SIGTERM'));

  } catch (err) {
    logger.error('Fatal initialization error:', err);
    process.exit(1);
  }
}

main();
