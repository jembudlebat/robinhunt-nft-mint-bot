import { Telegraf } from 'telegraf';
import { env } from '../config/env.js';
import { authMiddleware } from './middleware/auth.middleware.js';
import { registerWalletHandlers } from './handlers/wallet.handler.js';
import { registerContractHandlers } from './handlers/contract.handler.js';
import { registerRpcHandlers } from './handlers/rpc.handler.js';
import { registerMonitorHandlers } from './handlers/monitor.handler.js';
import { registerSystemHandlers } from './handlers/system.handler.js';
import { logger } from '../services/logger.service.js';

export function createBot(): Telegraf<any> {
  const botToken = env.telegramBotToken;
  if (!botToken) {
    logger.warn('TELEGRAM_BOT_TOKEN is empty! Bot will operate in test mode.');
  }

  const bot = new Telegraf(botToken || '123456789:TEST_BOT_TOKEN');

  // Enforce security auth middleware
  bot.use(authMiddleware);

  // Register command handlers
  registerSystemHandlers(bot);
  registerWalletHandlers(bot);
  registerContractHandlers(bot);
  registerRpcHandlers(bot);
  registerMonitorHandlers(bot);

  // Global error handler for Telegram polling
  bot.catch((err, ctx) => {
    logger.error(`Telegraf error handling update ${ctx.update.update_id}:`, err);
  });

  return bot;
}
