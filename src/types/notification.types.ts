export type NotificationType = 'daily_analysis' | 'weekly_plan' | 'compliance_check' | 'custom';

export interface NotificationPayload {
  type: NotificationType;
  text: string;
  athleteId: string;
}

export interface NotificationProvider {
  send(payload: NotificationPayload): Promise<void>;
}
