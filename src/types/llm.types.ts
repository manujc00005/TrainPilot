import type { WeeklyMetrics } from './metrics.types.js';
import type { TrainingGoal, PlannedSession } from './plan.types.js';
import type { Activity } from './activity.types.js';

export type LLMContextType = 'daily_analysis' | 'weekly_planning' | 'compliance_check' | 'baseline' | 'chat';

export interface LLMContext {
  contextType: LLMContextType;
  goal: TrainingGoal;
  currentWeekMetrics: WeeklyMetrics;
  recentWeeksMetrics: WeeklyMetrics[]; // last 4 weeks for trend
  plannedSessions: PlannedSession[];
  recentActivities: Activity[];
  missedSessions?: PlannedSession[];
  userFeedback?: string;
  /** Athlete baseline narrative from onboarding — injected as persistent context when available */
  baselineSummary?: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
}

export interface LLMProvider {
  complete(systemPrompt: string, userPrompt: string): Promise<LLMResponse>;
}

export interface LLMLogEntry {
  id: string;
  athleteId: string;
  contextType: LLMContextType;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  response: string;
  createdAt: Date;
}
