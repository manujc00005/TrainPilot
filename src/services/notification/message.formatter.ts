import type { NotificationType } from '../../types/notification.types.js';

export function formatMessage(type: NotificationType, rawContent: string): string {
  const header = HEADERS[type] ?? '';
  const body = toTelegramMarkdown(rawContent);
  return header ? `${header}\n\n${body}` : body;
}

/**
 * Converts LLM output (standard Markdown) to Telegram-compatible Markdown.
 *
 * Telegram Markdown supports: *bold*, _italic_, `code`, ```block```, [text](url)
 * It does NOT support: ### headers, **bold**, horizontal rules, HTML tags
 */
function toTelegramMarkdown(text: string): string {
  return text
    // ### Heading / ## Heading / # Heading → *Heading*
    .replace(/^#{1,3}\s+(.+)$/gm, '*$1*')
    // **bold** → *bold*
    .replace(/\*\*(.+?)\*\*/g, '*$1*')
    // Horizontal rules → blank line
    .replace(/^---+$/gm, '')
    // Trailing spaces on lines
    .replace(/[ \t]+$/gm, '')
    // Collapse 3+ consecutive blank lines to 2
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const HEADERS: Record<NotificationType, string> = {
  daily_analysis: '📈 *Informe de entrenamiento*',
  weekly_plan: '📅 *Plan semanal*',
  compliance_check: '✅ *Revisión del día*',
  custom: '',
};
