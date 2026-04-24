import axios from 'axios';
import { config } from '../../config/index.js';
import { withRetry } from '../../utils/retry.utils.js';
import { logger } from '../../utils/logger.js';
import type { NotificationProvider, NotificationPayload, InboundMessage } from '../../types/notification.types.js';
import { formatMessage } from './message.formatter.js';

export class TelegramProvider implements NotificationProvider {
  private readonly baseUrl: string;
  private readonly chatId: string;

  constructor() {
    if (!config.TELEGRAM_BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN is required');
    if (!config.TELEGRAM_CHAT_ID) throw new Error('TELEGRAM_CHAT_ID is required');
    this.baseUrl = `https://api.telegram.org/bot${config.TELEGRAM_BOT_TOKEN}`;
    this.chatId = config.TELEGRAM_CHAT_ID;
  }

  async send(payload: NotificationPayload): Promise<void> {
    const text = formatMessage(payload.type, payload.text);

    // Telegram has a 4096 char limit per message — split if needed
    const chunks = splitMessage(text);

    for (const chunk of chunks) {
      await withRetry(() =>
        axios.post(`${this.baseUrl}/sendMessage`, {
          chat_id: this.chatId,
          text: chunk,
          parse_mode: 'Markdown',
        }),
      );
    }

    logger.info({ type: payload.type, chunks: chunks.length }, 'Telegram message sent');
  }

  async handleUpdate(update: unknown): Promise<InboundMessage | null> {
    const { message } = update as TelegramUpdate;
    const text = message?.text?.trim();
    if (!text) return null;

    const fatigueMatch = text.match(/^\/fatiga\s+([1-9]|10)$/i);
    if (fatigueMatch) return { type: 'fatigue', score: fatigueMatch[1] };

    // Ignore other slash commands
    if (text.startsWith('/')) return null;

    return { type: 'chat', text };
  }
}

function splitMessage(text: string, maxLength = 4000): string[] {
  if (text.length <= maxLength) return [text];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    const chunk = remaining.slice(0, maxLength);
    const lastNewline = chunk.lastIndexOf('\n');
    const cutAt = lastNewline > maxLength * 0.8 ? lastNewline : maxLength;
    chunks.push(remaining.slice(0, cutAt));
    remaining = remaining.slice(cutAt).trim();
  }
  return chunks;
}

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: { id: number; username?: string };
    chat: { id: number };
    text?: string;
    date: number;
  };
}
