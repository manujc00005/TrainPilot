import axios from 'axios';
import { config } from '../../config/index.js';
import { withRetry } from '../../utils/retry.utils.js';
import { logger } from '../../utils/logger.js';
import type { NotificationProvider, NotificationPayload, InboundMessage } from '../../types/notification.types.js';
import { formatMessage } from './message.formatter.js';

const GRAPH_API = 'https://graph.facebook.com/v20.0';
const MAX_CHUNK = 4000;

export class WhatsAppProvider implements NotificationProvider {
  private readonly phoneNumberId: string;
  private readonly accessToken: string;
  private readonly recipient: string;

  constructor() {
    if (!config.WHATSAPP_PHONE_NUMBER_ID) throw new Error('WHATSAPP_PHONE_NUMBER_ID is required');
    if (!config.WHATSAPP_ACCESS_TOKEN) throw new Error('WHATSAPP_ACCESS_TOKEN is required');
    if (!config.WHATSAPP_RECIPIENT) throw new Error('WHATSAPP_RECIPIENT is required');
    this.phoneNumberId = config.WHATSAPP_PHONE_NUMBER_ID;
    this.accessToken = config.WHATSAPP_ACCESS_TOKEN;
    this.recipient = config.WHATSAPP_RECIPIENT;
  }

  async send(payload: NotificationPayload): Promise<void> {
    const text = formatMessage(payload.type, payload.text);
    const chunks = splitMessage(text);

    for (const chunk of chunks) {
      await withRetry(() =>
        axios.post(
          `${GRAPH_API}/${this.phoneNumberId}/messages`,
          {
            messaging_product: 'whatsapp',
            to: this.recipient,
            type: 'text',
            text: { body: chunk },
          },
          { headers: { Authorization: `Bearer ${this.accessToken}` } },
        ),
      );
    }

    logger.info({ type: payload.type, chunks: chunks.length }, 'WhatsApp message sent');
  }

  async handleUpdate(update: unknown): Promise<InboundMessage | null> {
    const body = update as WhatsAppWebhookBody;

    const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!message || message.type !== 'text') return null;

    const text = message.text?.body?.trim() ?? '';
    if (!text) return null;

    const fatigueMatch = text.match(/^\/fatiga\s+([1-9]|10)$/i);
    if (fatigueMatch) return { type: 'fatigue', score: fatigueMatch[1] };

    if (text.startsWith('/')) return null;

    return { type: 'chat', text };
  }
}

function splitMessage(text: string): string[] {
  if (text.length <= MAX_CHUNK) return [text];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    const chunk = remaining.slice(0, MAX_CHUNK);
    const lastNewline = chunk.lastIndexOf('\n');
    const cutAt = lastNewline > MAX_CHUNK * 0.8 ? lastNewline : MAX_CHUNK;
    chunks.push(remaining.slice(0, cutAt));
    remaining = remaining.slice(cutAt).trim();
  }
  return chunks;
}

// Meta webhook payload shape (simplified)
interface WhatsAppWebhookBody {
  object?: string;
  entry?: Array<{
    id?: string;
    changes?: Array<{
      value?: {
        messages?: Array<{
          from?: string;
          type?: string;
          text?: { body?: string };
        }>;
      };
    }>;
  }>;
}
