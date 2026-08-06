import { Telegraf, Markup } from 'telegraf';
import { WalletRepo } from '../../db/wallet.repo.js';
import { ContractRepo } from '../../db/contract.repo.js';
import { RpcRepo } from '../../db/rpc.repo.js';
import { logger } from '../../services/logger.service.js';

export function registerSystemHandlers(bot: Telegraf<any>): void {
  // /start
  bot.command('start', async (ctx) => {
    const text =
      `🤖 *Robinhood Chain NFT Minting Bot*\n\n` +
      `Welcome to your automated, high-speed NFT minting assistant for Robinhood Chain.\n\n` +
      `*Key Capabilities:*\n` +
      `• Multi-wallet parallel transaction submission\n` +
      `• Continuous background contract state monitoring\n` +
      `• Multi-RPC automatic latency scoring & failover\n` +
      `• AES-256-GCM encrypted key storage\n\n` +
      `Use the menu below or send /help to view all available commands.`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('💳 Wallets', 'cmd_wallets'), Markup.button.callback('📝 Contracts', 'cmd_contracts')],
      [Markup.button.callback('🌐 RPCs', 'cmd_rpcs'), Markup.button.callback('📊 System Status', 'cmd_status')],
      [Markup.button.callback('▶️ Start Monitor', 'cmd_start_mon'), Markup.button.callback('⏹️ Stop Monitor', 'cmd_stop_mon')],
    ]);

    await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  });

  // /help
  bot.command('help', async (ctx) => {
    const helpText =
      `📖 *Robinhood Chain Mint Bot Command Reference*\n\n` +
      `*Wallet Commands:*\n` +
      `• \`/addwallet <name> <private_key>\` - Encrypt and add a wallet\n` +
      `• \`/listwallets\` - View active wallets & balances\n` +
      `• \`/removewallet <name_or_address>\` - Remove a wallet\n\n` +
      `*Contract Commands:*\n` +
      `• \`/addcontract <name> <address> [fn] [price]\` - Add target NFT contract\n` +
      `• \`/contracts\` - Interactive menu to edit price, qty, gas, fees\n` +
      `• \`/deletecontract <name_or_address>\` - Delete a contract\n\n` +
      `*Monitoring & Minting:*\n` +
      `• \`/startmonitor\` - Start monitoring for public mint availability\n` +
      `• \`/stopmonitor\` - Stop active contract monitoring\n` +
      `• \`/status\` - View live monitoring & system status\n` +
      `• \`/logs\` - View recent bot execution logs\n\n` +
      `*RPC & Backup:*\n` +
      `• \`/setrpc <name> <url> [priority]\` - Add or update RPC node\n` +
      `• \`/listrpc\` - Benchmark and list RPC latency\n` +
      `• \`/backup\` - Export database JSON configuration backup\n` +
      `• \`/restore <json_string>\` - Restore configuration from backup`;

    await ctx.reply(helpText, { parse_mode: 'Markdown' });
  });

  // /backup
  bot.command('backup', async (ctx) => {
    try {
      const wallets = WalletRepo.getAllWallets();
      const contracts = ContractRepo.getAllContracts();
      const rpcs = RpcRepo.getAllRpcs();

      const backupData = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        wallets: wallets.map(w => ({ id: w.id, name: w.name, address: w.address, encrypted_private_key: w.encrypted_private_key, is_active: w.is_active })),
        contracts,
        rpcs,
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      await ctx.reply(
        `📦 *Configuration Backup Export:*\n\n\`\`\`json\n${jsonStr}\n\`\`\``,
        { parse_mode: 'Markdown' }
      );
    } catch (err: any) {
      await ctx.reply(`❌ Error creating backup: ${err.message}`);
    }
  });

  // Inline menu callbacks for system control
  bot.action('cmd_wallets', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('💳 Send `/listwallets` to view your active wallets, or `/addwallet <name> <key>` to add one.', { parse_mode: 'Markdown' });
  });

  bot.action('cmd_contracts', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('📝 Send `/contracts` to view & edit NFT contracts, or `/addcontract <name> <addr>` to add one.', { parse_mode: 'Markdown' });
  });

  bot.action('cmd_rpcs', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('🌐 Send `/listrpc` to view and benchmark RPC latency.', { parse_mode: 'Markdown' });
  });

  bot.action('cmd_status', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('📊 Send `/status` to view live system operational status.', { parse_mode: 'Markdown' });
  });

  bot.action('cmd_start_mon', async (ctx) => {
    await ctx.answerCbQuery('Starting monitor...');
    await ctx.reply('🟢 Send `/startmonitor` to initiate contract monitoring.', { parse_mode: 'Markdown' });
  });

  bot.action('cmd_stop_mon', async (ctx) => {
    await ctx.answerCbQuery('Stopping monitor...');
    await ctx.reply('🛑 Send `/stopmonitor` to stop active contract monitoring.', { parse_mode: 'Markdown' });
  });
}
