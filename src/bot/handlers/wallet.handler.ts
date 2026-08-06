import { Telegraf, Markup } from 'telegraf';
import { WalletRepo } from '../../db/wallet.repo.js';
import { CryptoService } from '../../services/crypto.service.js';
import { WalletManager } from '../../blockchain/wallet.manager.js';
import { env } from '../../config/env.js';
import { logger } from '../../services/logger.service.js';

export function registerWalletHandlers(bot: Telegraf<any>): void {
  // /addwallet <name> <private_key>
  bot.command(['addwallet', 'importwallet'], async (ctx) => {
    try {
      const text = ctx.message.text.trim();
      const parts = text.split(/\s+/);

      if (parts.length < 3) {
        await ctx.reply(
          '⚠️ Usage: `/addwallet <wallet_name> <private_key>`\nExample: `/addwallet Wallet1 0x123...`',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const name = parts[1];
      const privateKey = parts[2];

      // Validate and get address
      const address = CryptoService.getAddressFromPrivateKey(privateKey);
      const encryptedKey = CryptoService.encryptPrivateKey(privateKey, env.encryptionKey);

      WalletRepo.addWallet(name, address, encryptedKey);

      // Mask key for safety
      logger.info(`Successfully added wallet: ${name} (${address})`);
      await ctx.reply(
        `✅ *Wallet Added Successfully!*\n\n*Name:* \`${name}\`\n*Address:* \`${address}\`\n*Security:* AES-256-GCM Encrypted`,
        { parse_mode: 'Markdown' }
      );
    } catch (err: any) {
      logger.error('Failed to add wallet:', err);
      await ctx.reply(`❌ *Error adding wallet:* ${err.message}`, { parse_mode: 'Markdown' });
    }
  });

  // /listwallets
  bot.command('listwallets', async (ctx) => {
    try {
      const wallets = WalletRepo.getAllWallets();
      if (wallets.length === 0) {
        await ctx.reply('📭 No wallets stored. Use `/addwallet <name> <private_key>` to add one.', {
          parse_mode: 'Markdown',
        });
        return;
      }

      let msg = '💳 *Configured Wallets:*\n\n';
      const buttons: any[] = [];

      for (const w of wallets) {
        let balance = 'Checking...';
        try {
          balance = await WalletManager.getWalletBalance(w.address);
        } catch {
          balance = 'Error RPC';
        }

        const statusIcon = w.is_active ? '✅ Active' : '❌ Disabled';
        msg += `*${w.name}* (${statusIcon})\n`;
        msg += ` Address: \`${w.address}\`\n`;
        msg += ` Balance: \`${parseFloat(balance).toFixed(4)} ETH\`\n\n`;

        buttons.push([
          Markup.button.callback(
            `${w.is_active ? 'Disable' : 'Enable'} ${w.name}`,
            `toggle_wallet_${w.id}`
          ),
          Markup.button.callback(`Delete ${w.name}`, `delete_wallet_${w.id}`),
        ]);
      }

      await ctx.reply(msg, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(buttons),
      });
    } catch (err: any) {
      await ctx.reply(`❌ Error listing wallets: ${err.message}`);
    }
  });

  // /removewallet <name_or_address>
  bot.command('removewallet', async (ctx) => {
    try {
      const text = ctx.message.text.trim();
      const parts = text.split(/\s+/);
      if (parts.length < 2) {
        await ctx.reply('⚠️ Usage: `/removewallet <wallet_name_or_address>`', { parse_mode: 'Markdown' });
        return;
      }

      const target = parts[1];
      const removed = WalletRepo.removeWallet(target);
      if (removed) {
        await ctx.reply(`🗑️ Wallet \`${target}\` removed successfully.`, { parse_mode: 'Markdown' });
      } else {
        await ctx.reply(`⚠️ Wallet \`${target}\` not found in database.`, { parse_mode: 'Markdown' });
      }
    } catch (err: any) {
      await ctx.reply(`❌ Error removing wallet: ${err.message}`);
    }
  });

  // Callback action for toggling wallet active status
  bot.action(/^toggle_wallet_(\d+)$/, async (ctx) => {
    const walletId = parseInt(ctx.match[1], 10);
    const wallet = WalletRepo.getWalletById(walletId);
    if (wallet) {
      WalletRepo.toggleWalletActive(walletId, !wallet.is_active);
      await ctx.answerCbQuery(`Wallet '${wallet.name}' is now ${!wallet.is_active ? 'Active' : 'Disabled'}`);
      await ctx.reply(`🔄 Wallet *${wallet.name}* status updated to: ${!wallet.is_active ? '✅ Active' : '❌ Disabled'}`, { parse_mode: 'Markdown' });
    }
  });

  // Callback action for deleting wallet
  bot.action(/^delete_wallet_(\d+)$/, async (ctx) => {
    const walletId = parseInt(ctx.match[1], 10);
    const wallet = WalletRepo.getWalletById(walletId);
    if (wallet) {
      WalletRepo.removeWallet(walletId);
      await ctx.answerCbQuery(`Wallet '${wallet.name}' deleted.`);
      await ctx.reply(`🗑️ Wallet *${wallet.name}* deleted.`, { parse_mode: 'Markdown' });
    }
  });
}
