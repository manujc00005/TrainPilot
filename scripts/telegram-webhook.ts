/**
 * Telegram webhook management.
 * Usage: tsx scripts/telegram-webhook.ts <command> [url]
 *
 * Commands:
 *   set <url>    Register webhook  (e.g. https://abc.ngrok-free.app)
 *   unset        Remove webhook (switches to polling mode)
 *   info         Show current webhook status
 */
import { config as loadEnv } from 'dotenv';
loadEnv();

import axios from 'axios';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN not set in .env');
  process.exit(1);
}

const BASE = `https://api.telegram.org/bot${TOKEN}`;
const command = process.argv[2];
const urlArg = process.argv[3];

async function setWebhook(publicUrl: string): Promise<void> {
  const webhookUrl = `${publicUrl.replace(/\/$/, '')}/api/webhook/inbound`;
  const res = await axios.post(`${BASE}/setWebhook`, { url: webhookUrl });
  console.log('✓ Webhook registered:', webhookUrl);
  console.log('  Response:', res.data);
}

async function unsetWebhook(): Promise<void> {
  const res = await axios.post(`${BASE}/deleteWebhook`);
  console.log('✓ Webhook removed');
  console.log('  Response:', res.data);
}

async function getInfo(): Promise<void> {
  const res = await axios.get(`${BASE}/getWebhookInfo`);
  const info = res.data.result;
  if (!info.url) {
    console.log('ℹ No webhook set (polling mode)');
  } else {
    console.log('Webhook URL:    ', info.url);
    console.log('Pending updates:', info.pending_update_count);
    console.log('Last error:     ', info.last_error_message ?? 'none');
  }
}

const COMMANDS: Record<string, () => Promise<void>> = {
  set: async () => {
    if (!urlArg) {
      console.error('Usage: tsx scripts/telegram-webhook.ts set <public-url>');
      process.exit(1);
    }
    await setWebhook(urlArg);
  },
  unset: unsetWebhook,
  info: getInfo,
};

if (!command || !COMMANDS[command]) {
  console.error(`Usage: tsx scripts/telegram-webhook.ts <command>\nAvailable: ${Object.keys(COMMANDS).join(' | ')}`);
  process.exit(1);
}

COMMANDS[command]().catch((err) => {
  console.error('Error:', err.response?.data ?? err.message);
  process.exit(1);
});
