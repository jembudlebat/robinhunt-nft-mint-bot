import { Context, MiddlewareFn } from 'telegraf';
import { env } from '../../config/env.js';
import { logger } from '../../services/logger.service.js';

export const authMiddleware: MiddlewareFn<Context> = async (ctx, next) => {
  const userId = ctx.from?.id;

  // If admin ID is specified, enforce strict authentication
  if (env.telegramAdminId && env.telegramAdminId !== 0) {
    if (userId !== env.telegramAdminId) {
      logger.warn(`Unauthorized access attempt by Telegram User ID: ${userId} (@${ctx.from?.username || 'unknown'})`);
      await ctx.reply('⛔ Unauthorized! You do not have permission to use this bot.');
      return;
    }
  }

  return next();
};
