/**
 * MediMind — Telegram Bot Service
 *
 * Uses long-polling (no public HTTPS URL needed — works fine on
 * localhost or any host, including free-tier Railway/Render).
 *
 * Responsibilities:
 *   1. Handle /start <code> to link a Telegram chat to a MediMind account
 *   2. Send medication reminder messages with an inline "Mark as Taken" button
 *   3. Handle button presses and log the dose as Completed
 */

const TelegramBot = require('node-telegram-bot-api');
const User = require('../models/User');
const MedicationLog = require('../models/MedicationLog');

let bot = null;

function initBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    console.log('⚠ TELEGRAM_BOT_TOKEN not set in .env — Telegram reminders are disabled.');
    return null;
  }

  bot = new TelegramBot(token, { polling: true });

  // ── /start command (with or without a linking code) ──
  bot.onText(/\/start(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const code = match[1]?.trim();

    if (!code) {
      return bot.sendMessage(
        chatId,
        "👋 Welcome to *MediMind*!\n\n" +
        "To link your account, log in to the MediMind website, go to your *Profile* page, and tap *Connect Telegram*. " +
        "You'll be given a 6-digit code — come back here and send it to me.",
        { parse_mode: 'Markdown' }
      );
    }

    const user = await User.findOne({
      telegram_link_code: code,
      telegram_link_code_expires: { $gt: new Date() }
    });

    if (!user) {
      return bot.sendMessage(
        chatId,
        "❌ That code is invalid or has expired. Please generate a new one from your MediMind profile page and try again."
      );
    }

    user.telegram_chat_id = String(chatId);
    user.telegram_link_code = null;
    user.telegram_link_code_expires = null;
    await user.save();

    bot.sendMessage(
      chatId,
      `✅ *Linked successfully, ${user.name}!*\n\nYou'll now receive your medication reminders right here, with a button to mark each dose as taken.`,
      { parse_mode: 'Markdown' }
    );
  });

  // ── /status command — quick check ──
  bot.onText(/\/status/, async (msg) => {
    const chatId = msg.chat.id;
    const user = await User.findOne({ telegram_chat_id: String(chatId) });
    if (user) {
      bot.sendMessage(chatId, `✅ This chat is linked to *${user.name}*'s MediMind account.`, { parse_mode: 'Markdown' });
    } else {
      bot.sendMessage(chatId, "This chat isn't linked to any MediMind account yet. Send /start to begin.");
    }
  });

  // ── /unlink command ──
  bot.onText(/\/unlink/, async (msg) => {
    const chatId = msg.chat.id;
    const user = await User.findOne({ telegram_chat_id: String(chatId) });
    if (user) {
      user.telegram_chat_id = null;
      await user.save();
      bot.sendMessage(chatId, "🔌 This chat has been unlinked. You will no longer receive reminders here.");
    } else {
      bot.sendMessage(chatId, "This chat wasn't linked to anything.");
    }
  });

  // ── Inline "Mark as Taken" button presses ──
  bot.on('callback_query', async (query) => {
    const data = query.data || '';
    const chatId = query.message.chat.id;

    if (!data.startsWith('taken:')) return;

    const [, prescriptionId, time] = data.split(':');

    try {
      await MedicationLog.create({
        prescriptionId,
        scheduled_time: time,
        taken_time: new Date(),
        status: 'Completed'
      });

      await bot.answerCallbackQuery(query.id, { text: '✅ Marked as taken!' });

      // Edit the original message to show it's done and remove the button
      await bot.editMessageText(
        query.message.text + '\n\n✅ *Marked as taken*',
        {
          chat_id: chatId,
          message_id: query.message.message_id,
          parse_mode: 'Markdown'
        }
      );
    } catch (err) {
      console.error('Telegram mark-as-taken error:', err.message);
      await bot.answerCallbackQuery(query.id, { text: 'Something went wrong. Please mark it as taken on the website instead.', show_alert: true });
    }
  });

  bot.on('polling_error', (err) => console.error('Telegram polling error:', err.message));

  console.log('✔ Telegram bot connected and listening');
  return bot;
}

function getBot() {
  return bot;
}

/**
 * Sends a reminder message with an inline "Mark as Taken" button.
 */
async function sendReminder(chatId, { medicationName, dosage, instructions, prescriptionId, reminderTime }) {
  if (!bot) return;

  let text = `💊 *Medication Reminder*\n\n*${medicationName}* — ${dosage}\nIt's time to take your medication.`;
  if (instructions) text += `\n\n📋 _${instructions}_`;

  await bot.sendMessage(chatId, text, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[
        { text: '✅ Mark as Taken', callback_data: `taken:${prescriptionId}:${reminderTime}` }
      ]]
    }
  });
}

module.exports = { initBot, getBot, sendReminder };
