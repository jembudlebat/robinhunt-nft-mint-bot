import { Telegraf, Markup } from 'telegraf';
import { RpcRepo } from '../../db/rpc.repo.js';
import { RpcManager } from '../../blockchain/rpc.manager.js';
import { logger } from '../../services/logger.service.js';

export function registerRpcHandlers(bot: Telegraf<any>): void {
  // /setrpc <name> <url> [priority]
  bot.command('setrpc', async (ctx) => {
    try {
      const text = ctx.message.text.trim();
      const parts = text.split(/\s+/);

      if (parts.length < 3) {
        await ctx.reply(
          '⚠️ Usage: `/setrpc <name> <rpc_url> [priority]`\nExample: `/setrpc RobinRPC1 https://rpc.robinhoodchain.com 1`',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const name = parts[1];
      const url = parts[2];
      const priority = parts[3] ? parseInt(parts[3], 10) : 1;

      const rpc = RpcRepo.addRpc(name, url, priority);
      logger.info(`Added RPC: ${name} -> ${url}`);

      await ctx.reply(
        `✅ *RPC Node Added!*\n\n*Name:* \`${rpc.name}\`\n*URL:* \`${rpc.url}\`\n*Priority:* \`${rpc.priority}\``,
        { parse_mode: 'Markdown' }
      );
    } catch (err: any) {
      await ctx.reply(`❌ Error adding RPC: ${err.message}`);
    }
  });

  // /listrpc
  bot.command('listrpc', async (ctx) => {
    try {
      const rpcs = await RpcManager.getInstance().benchmarkAllRpcs();
      if (rpcs.length === 0) {
        await ctx.reply('📭 No RPC nodes configured.');
        return;
      }

      let msg = '🌐 *Configured Robinhood Chain RPC Nodes:*\n\n';
      const buttons: any[] = [];

      for (const r of rpcs) {
        const latency = r.latency_ms === 9999 ? '🔴 Unreachable' : `⚡ ${r.latency_ms}ms`;
        msg += `*${r.name}* (Priority ${r.priority})\n`;
        msg += ` URL: \`${r.url}\`\n`;
        msg += ` Latency: ${latency}\n\n`;

        buttons.push([Markup.button.callback(`Delete ${r.name}`, `delete_rpc_${r.id}`)]);
      }

      await ctx.reply(msg, { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) });
    } catch (err: any) {
      await ctx.reply(`❌ Error fetching RPC list: ${err.message}`);
    }
  });

  // Delete RPC callback action
  bot.action(/^delete_rpc_(\d+)$/, async (ctx) => {
    const rpcId = parseInt(ctx.match[1], 10);
    const rpc = RpcRepo.getRpcById(rpcId);
    if (rpc) {
      RpcRepo.removeRpc(rpcId);
      await ctx.answerCbQuery(`RPC '${rpc.name}' removed.`);
      await ctx.reply(`🗑️ RPC *${rpc.name}* removed.`, { parse_mode: 'Markdown' });
    }
  });
}
