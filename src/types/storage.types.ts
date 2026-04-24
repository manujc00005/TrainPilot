import type { Activity } from './activity.types.js';
import type { WeeklyMetrics } from './metrics.types.js';
import type { TrainingGoal, PlannedSession } from './plan.types.js';
import type { StravaTokens } from './strava.types.js';
import type { LLMLogEntry } from './llm.types.js';
import type { AthleteBaseline } from './baseline.types.js';

export interface IStorage {
  // Lifecycle
  initialize(): Promise<void>;
  close(): void;

  // Activities
  saveActivities(activities: Activity[]): Promise<void>;
  getActivitiesByDateRange(start: Date, end: Date, athleteId: string): Promise<Activity[]>;
  getActivitiesByWeek(weekStart: Date, athleteId: string): Promise<Activity[]>;
  getActivityByStravaId(stravaId: number): Promise<Activity | null>;

  // Metrics
  saveWeeklyMetrics(metrics: WeeklyMetrics): Promise<void>;
  getWeeklyMetrics(weekStart: Date, athleteId: string): Promise<WeeklyMetrics | null>;
  getRecentWeeklyMetrics(count: number, athleteId: string): Promise<WeeklyMetrics[]>;

  // Training plan
  saveGoal(goal: TrainingGoal): Promise<void>;
  getActiveGoal(athleteId: string): Promise<TrainingGoal | null>;
  savePlannedSessions(sessions: PlannedSession[]): Promise<void>;
  getPlannedSessionsByWeek(weekStart: Date, athleteId: string): Promise<PlannedSession[]>;
  markSessionCompleted(sessionId: string, activityId: string): Promise<void>;
  markSessionSkipped(sessionId: string, reason: string): Promise<void>;

  // Strava tokens
  saveTokens(athleteId: string, tokens: StravaTokens): Promise<void>;
  getTokens(athleteId: string): Promise<StravaTokens | null>;

  // LLM audit log
  saveLLMLog(entry: LLMLogEntry): Promise<void>;

  // User feedback (subjective fatigue via Telegram)
  saveSubjectiveFatigue(athleteId: string, date: Date, score: number): Promise<void>;
  getSubjectiveFatigue(athleteId: string, date: Date): Promise<number | null>;

  // Athlete baseline (onboarding fingerprint)
  saveBaseline(baseline: AthleteBaseline): Promise<void>;
  getBaseline(athleteId: string): Promise<AthleteBaseline | null>;
}
