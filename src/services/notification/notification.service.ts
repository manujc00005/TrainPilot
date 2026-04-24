import { config } from '../../config/index.js';
import { TelegramProvider } from './telegram.provider.js';
import { WhatsAppProvider } from './whatsapp.provider.js';
import type { NotificationProvider, NotificationPayload, InboundMessage } from '../../types/notification.types.js';

let provider: NotificationProvider | null = null;

export function getProvider(): NotificationProvider {
  if (!provider) {
    if (config.NOTIFICATION_PROVIDER === 'telegram') {
      provider = new TelegramProvider();
    } else {
      provider = new WhatsAppProvider();
    }
  }
  return provider;
}

export async function sendNotification(payload: NotificationPayload): Promise<void> {
  await getProvider().send(payload);
}

export async function handleWebhookUpdate(update: unknown): Promise<InboundMessage | null> {
  const p = getProvider();
  return p.handleUpdate ? p.handleUpdate(update) : null;
}
