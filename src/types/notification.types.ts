export type NotificationType = 'daily_analysis' | 'weekly_plan' | 'compliance_check' | 'custom';

export interface NotificationPayload {
  type: NotificationType;
  text: string;
  athleteId: string;
}

export interface NotificationProvider {
  send(payload: NotificationPayload): Promise<void>;
  /** Parse an inbound webhook update into a typed message, or null if irrelevant */
  handleUpdate?(update: unknown): Promise<InboundMessage | null>;
}

export type InboundMessage =
  | { type: 'fatigue'; score: string }
  | { type: 'chat'; text: string };
