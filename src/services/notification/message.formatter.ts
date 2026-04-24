import type { NotificationType } from '../../types/notification.types.js';

// Telegram supports Markdown V2 — we use plain markdown for simplicity
export function formatMessage(type: NotificationType, rawContent: string): string {
  const header = HEADERS[type] ?? '';
  return header ? `${header}\n\n${rawContent}` : rawContent;
}

const HEADERS: Record<NotificationType, string> = {
  daily_analysis: '📈 *Daily Training Report*',
  weekly_plan: '📅 *Weekly Training Plan*',
  compliance_check: '✅ *Training Check-in*',
  custom: '',
};
