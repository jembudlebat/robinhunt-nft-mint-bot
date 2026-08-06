import { Telegraf, Markup } from 'telegraf';
import { ContractRepo } from '../../db/contract.repo.js';
import { logger } from '../../services/logger.service.js';
import { ContractRecord } from '../../types/index.js';

// In-memory edit session tracker: userId -> { contractId, field }
const editSessions = new Map<number, { contractId: number; field: keyof ContractRecord }>();

export function registerContractHandlers(bot: Telegraf<any>): void {
  // /addcontract <name> <address> [mint_function] [price]
  bot.command('addcontract', async (ctx) => {
    try {
      const text = ctx.message.text.trim();
      const parts = text.split(/\s+/);

      if (parts.length < 3) {
        await ctx.reply(
          '⚠️ Usage: `/addcontract <name> <0xContractAddress> [mint_function] [price]`\nExample: `/addcontract RobinNFT 0x123...456 mint(uint256) 0.05`',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const name = parts[1];
      const address = parts[2];
      const mintFunction = parts[3] || 'mint(uint256)';
      const price = parts[4] || '0.0';

      const contract = ContractRepo.addContract(name, address, mintFunction, price);
      logger.info(`Contract added: ${contract.name} (${contract.address})`);

      await ctx.reply(
        `✅ *Contract Configured Successfully!*\n\n` +
        `*Name:* \`${contract.name}\`\n` +
        `*Address:* \`${contract.address}\`\n` +
        `*Function:* \`${contract.mint_function}\`\n` +
        `*Price:* \`${contract.mint_price} ETH\`\n` +
        `*Quantity:* \`${contract.quantity}\`\n` +
        `*Gas Limit:* \`${contract.gas_limit}\`\n` +
        `*Max Fee:* \`${contract.max_fee_per_gas} Gwei\`\n` +
        `*Priority Fee:* \`${contract.max_priority_fee_per_gas} Gwei\`\n\n` +
        `Use /contracts to view and edit settings interactively.`,
        { parse_mode: 'Markdown' }
      );
    } catch (err: any) {
      await ctx.reply(`❌ *Error adding contract:* ${err.message}`, { parse_mode: 'Markdown' });
    }
  });

  // /contracts
  bot.command('contracts', async (ctx) => {
    try {
      const contracts = ContractRepo.getAllContracts();
      if (contracts.length === 0) {
        await ctx.reply('📭 No NFT contracts configured yet. Use `/addcontract` to add one.', {
          parse_mode: 'Markdown',
        });
        return;
      }

      for (const c of contracts) {
        const statusStr = c.is_monitored ? '🟢 Monitoring Active' : '⚪ Monitoring Stopped';
        const text =
          `📝 *Contract Configuration: ${c.name}*\n` +
          `Status: ${statusStr}\n\n` +
          `• *Address:* \`${c.address}\`\n` +
          `• *Function:* \`${c.mint_function}\`\n` +
          `• *Price:* \`${c.mint_price} ETH\`\n` +
          `• *Quantity:* \`${c.quantity}\`\n` +
          `• *Gas Limit:* \`${c.gas_limit}\`\n` +
          `• *Max Fee:* \`${c.max_fee_per_gas} Gwei\`\n` +
          `• *Priority Fee:* \`${c.max_priority_fee_per_gas} Gwei\``;

        const keyboard = Markup.inlineKeyboard([
          [
            Markup.button.callback('✏️ Edit Function', `edit_c_${c.id}_mint_function`),
            Markup.button.callback('✏️ Edit Price', `edit_c_${c.id}_mint_price`),
          ],
          [
            Markup.button.callback('✏️ Edit Quantity', `edit_c_${c.id}_quantity`),
            Markup.button.callback('✏️ Edit Gas Limit', `edit_c_${c.id}_gas_limit`),
          ],
          [
            Markup.button.callback('✏️ Edit Max Fee', `edit_c_${c.id}_max_fee_per_gas`),
            Markup.button.callback('✏️ Edit Priority Fee', `edit_c_${c.id}_max_priority_fee_per_gas`),
          ],
          [
            Markup.button.callback('✏️ Edit Address', `edit_c_${c.id}_address`),
            Markup.button.callback('✏️ Edit Name', `edit_c_${c.id}_name`),
          ],
          [
            Markup.button.callback(c.is_monitored ? '⏹️ Stop Monitoring' : '▶️ Start Monitoring', `toggle_mon_${c.id}`),
            Markup.button.callback('🗑️ Delete', `delete_c_${c.id}`),
          ],
        ]);

        await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
      }
    } catch (err: any) {
      await ctx.reply(`❌ Error listing contracts: ${err.message}`);
    }
  });

  // /deletecontract <name_or_address>
  bot.command('deletecontract', async (ctx) => {
    try {
      const text = ctx.message.text.trim();
      const parts = text.split(/\s+/);
      if (parts.length < 2) {
        await ctx.reply('⚠️ Usage: `/deletecontract <contract_name_or_address>`', { parse_mode: 'Markdown' });
        return;
      }

      const target = parts[1];
      const deleted = ContractRepo.deleteContract(target);
      if (deleted) {
        await ctx.reply(`🗑️ Contract \`${target}\` deleted.`, { parse_mode: 'Markdown' });
      } else {
        await ctx.reply(`⚠️ Contract \`${target}\` not found.`, { parse_mode: 'Markdown' });
      }
    } catch (err: any) {
      await ctx.reply(`❌ Error deleting contract: ${err.message}`);
    }
  });

  // Callback to trigger interactive field editing
  bot.action(/^edit_c_(\d+)_(.+)$/, async (ctx) => {
    const contractId = parseInt(ctx.match[1], 10);
    const field = ctx.match[2] as keyof ContractRecord;
    const userId = ctx.from?.id;

    if (!userId) return;

    const contract = ContractRepo.getContractById(contractId);
    if (!contract) {
      await ctx.answerCbQuery('Contract not found.');
      return;
    }

    editSessions.set(userId, { contractId, field });
    await ctx.answerCbQuery(`Editing ${field}`);
    await ctx.reply(
      `💬 *Editing parameter '${field}' for contract '${contract.name}'*\n\n` +
      `Current value: \`${contract[field]}\`\n\n` +
      `Please type and send the new value in your next message.`,
      { parse_mode: 'Markdown' }
    );
  });

  // Toggle contract monitoring callback
  bot.action(/^toggle_mon_(\d+)$/, async (ctx) => {
    const contractId = parseInt(ctx.match[1], 10);
    const contract = ContractRepo.getContractById(contractId);
    if (contract) {
      const newStatus = !contract.is_monitored;
      ContractRepo.setMonitoringStatus(contractId, newStatus);
      await ctx.answerCbQuery(`Monitoring is now ${newStatus ? 'ON' : 'OFF'}`);
      await ctx.reply(
        `🔄 Monitoring status for *${contract.name}* updated to: ${newStatus ? '🟢 ACTIVE' : '⚪ STOPPED'}`,
        { parse_mode: 'Markdown' }
      );
    }
  });

  // Callback to delete contract directly from button
  bot.action(/^delete_c_(\d+)$/, async (ctx) => {
    const contractId = parseInt(ctx.match[1], 10);
    const contract = ContractRepo.getContractById(contractId);
    if (contract) {
      ContractRepo.deleteContract(contractId);
      await ctx.answerCbQuery('Contract deleted.');
      await ctx.reply(`🗑️ Contract *${contract.name}* deleted.`, { parse_mode: 'Markdown' });
    }
  });

  // Text message listener for interactive edit session input
  bot.on('text', async (ctx, next) => {
    const userId = ctx.from?.id;
    if (!userId || !editSessions.has(userId)) {
      return next();
    }

    const session = editSessions.get(userId)!;
    editSessions.delete(userId);

    const newValue = ctx.message.text.trim();

    try {
      ContractRepo.updateContractField(session.contractId, session.field, newValue);
      const updated = ContractRepo.getContractById(session.contractId)!;

      await ctx.reply(
        `✅ *Updated '${session.field}' successfully for ${updated.name}!*\n\n` +
        `New Value: \`${updated[session.field]}\``,
        { parse_mode: 'Markdown' }
      );
    } catch (err: any) {
      await ctx.reply(`❌ Failed to update field: ${err.message}`);
    }
  });
}
