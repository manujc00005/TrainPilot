import type { SportType, FatigueLevel } from '../config/constants.js';

export interface WeeklyMetrics {
  weekStart: Date;
  weekEnd: Date;
  athleteId: string;
  sport: SportType;
  activitiesCount: number;
  volume: VolumeMetrics;
  intensity: IntensityMetrics;
  fatigue: FatigueMetrics;
  compliance: ComplianceMetrics;
}

export interface VolumeMetrics {
  totalDistanceKm: number;
  totalTimeHours: number;
  totalElevationGainMeters: number;
  longestActivityDistanceKm: number;
  averageDailyDistanceKm: number;
}

export interface IntensityMetrics {
  estimatedTSS: number;
  averagePaceSecsPerKm?: number;
  averageHeartRate?: number;
  intensityDistribution: ZoneDistribution;
}

export interface ZoneDistribution {
  easy: number;    // % of time in easy/recovery pace
  moderate: number;
  hard: number;
}

export interface FatigueMetrics {
  atl: number;           // Acute Training Load (7-day)
  ctl: number;           // Chronic Training Load (42-day)
  tsb: number;           // Training Stress Balance = CTL - ATL
  fatigueLevel: FatigueLevel;
  hrv?: number;
  subjectiveFatigue?: number; // 1-10 from user via Telegram
}

export interface ComplianceMetrics {
  plannedSessions: number;
  completedSessions: number;
  completionRate: number; // 0-1
  missedSessionDates: Date[];
  partiallyCompleted: number;
}
