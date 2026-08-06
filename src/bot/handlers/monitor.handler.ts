import { Telegraf } from 'telegraf';
import { ContractMonitorService } from '../../blockchain/contract.monitor.js';
import { WalletRepo } from '../../db/wallet.repo.js';
import { ContractRepo } from '../../db/contract.repo.js';
import { RpcRepo } from '../../db/rpc.repo.js';
import { logger } from '../../services/logger.service.js';

export function registerMonitorHandlers(bot: Telegraf<any>): void {
  const monitorService = ContractMonitorService.getInstance();

  const sendBroadcast = async (text: string) => {
    try {
      if (process.env.TELEGRAM_ADMIN_ID) {
        const adminId = parseInt(process.env.TELEGRAM_ADMIN_ID, 10);
        if (adminId !== 0) {
          await bot.telegram.sendMessage(adminId, text, { parse_mode: 'Markdown' });
        }
      }
    } catch (err) {
      logger.error('Failed to send broadcast status message to Telegram admin:', err);
    }
  };

  // Wire automatic monitoring notifications directly to Telegram chat
  monitorService.registerStatusCallback((message, results) => {
    let formattedMsg = message;
    if (results && results.length > 0) {
      formattedMsg += '\n\n📊 *Mint Submission Results:*\n';
      results.forEach((r, idx) => {
        const statusEmoji = r.status === 'CONFIRMED' ? '✅' : r.status === 'PENDING' ? '⏳' : '❌';
        formattedMsg += `\n${idx + 1}. *${r.walletName}* (${r.walletAddress.substring(0, 6)}...${r.walletAddress.substring(38)})\n`;
        formattedMsg += ` Status: ${statusEmoji} ${r.status}\n`;
        if (r.txHash) formattedMsg += ` TxHash: \`${r.txHash}\`\n`;
        if (r.blockNumber) formattedMsg += ` Block: \`${r.blockNumber}\`\n`;
        if (r.error) formattedMsg += ` Error: _${r.error}_\n`;
      });
    }

    sendBroadcast(formattedMsg);
  });

  // /startmonitor
  bot.command('startmonitor', async (ctx) => {
    try {
      const contracts = ContractRepo.getAllContracts();
      if (contracts.length === 0) {
        await ctx.reply('⚠️ Cannot start monitoring: No NFT contracts configured! Add a contract with `/addcontract`.', { parse_mode: 'Markdown' });
        return;
      }

      // Enable monitoring on all contracts if none currently selected
      const monitored = ContractRepo.getMonitoredContracts();
      if (monitored.length === 0) {
        contracts.forEach(c => ContractRepo.setMonitoringStatus(c.id, true));
      }

      monitorService.start();
      await ctx.reply('🟢 *Contract Monitoring Engine Started!*\nContinuously polling contracts for public mint availability...', { parse_mode: 'Markdown' });
    } catch (err: any) {
      await ctx.reply(`❌ Error starting monitor: ${err.message}`);
    }
  });

  // /stopmonitor
  bot.command('stopmonitor', async (ctx) => {
    try {
      monitorService.stop();
      await ctx.reply('🛑 *Contract Monitoring Engine Stopped.*', { parse_mode: 'Markdown' });
    } catch (err: any) {
      await ctx.reply(`❌ Error stopping monitor: ${err.message}`);
    }
  });

  // /status
  bot.command('status', async (ctx) => {
    try {
      const monitorStatus = monitorService.getStatus();
      const wallets = WalletRepo.getAllWallets();
      const activeWallets = WalletRepo.getActiveWallets();
      const contracts = ContractRepo.getAllContracts();
      const monitoredContracts = ContractRepo.getMonitoredContracts();
      const rpcs = RpcRepo.getActiveRpcs();

      const text =
        `📊 *System Operational Status*\n\n` +
        `• *Monitoring Engine:* ${monitorStatus.isRunning ? '🟢 RUNNING' : '🔴 STOPPED'}\n` +
        `• *Monitored Contracts:* \`${monitoredContracts.length} / ${contracts.length}\`\n` +
        `• *Active Wallets:* \`${activeWallets.length} / ${wallets.length}\`\n` +
        `• *Active RPC Nodes:* \`${rpcs.length}\`\n` +
        `• *Primary RPC:* \`${rpcs[0]?.name || 'None'} (${rpcs[0]?.url || 'N/A'})\`\n` +
        `• *System Time:* \`${new Date().toISOString()}\``;

      await ctx.reply(text, { parse_mode: 'Markdown' });
    } catch (err: any) {
      await ctx.reply(`❌ Error fetching status: ${err.message}`);
    }
  });

  // /logs
  bot.command('logs', async (ctx) => {
    try {
      const logsStr = logger.formatRecentLogsForTelegram(20);
      await ctx.reply(`📋 *Recent Application Logs:*\n\n\`\`\`\n${logsStr}\n\`\`\``, {
        parse_mode: 'Markdown',
      });
    } catch (err: any) {
      await ctx.reply(`❌ Error fetching logs: ${err.message}`);
    }
  });
}
