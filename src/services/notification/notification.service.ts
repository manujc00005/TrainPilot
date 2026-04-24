import { config } from '../../config/index.js';
import { TelegramProvider } from './telegram.provider.js';
import type { NotificationProvider, NotificationPayload } from '../../types/notification.types.js';

let provider: NotificationProvider | null = null;

function getProvider(): NotificationProvider {
  if (!provider) {
    if (config.NOTIFICATION_PROVIDER === 'telegram') {
      provider = new TelegramProvider();
    } else {
      throw new Error('whatsapp provider not yet implemented — use NOTIFICATION_PROVIDER=telegram');
    }
  }
  return provider;
}

export async function sendNotification(payload: NotificationPayload): Promise<void> {
  await getProvider().send(payload);
}
