import type { FitnessLevel } from '../config/constants.js';

export type VolumeTrend = 'increasing' | 'stable' | 'decreasing';

export interface AthleteBaseline {
  id: string;
  athleteId: string;
  generatedAt: Date;
  periodMonths: number;          // how many months of data were used

  // Fitness load model
  peakCTL: number;               // highest chronic training load in the period
  currentCTL: number;
  avgWeeklyDistanceKm: number;
  avgWeeklyTimeHours: number;

  // Performance markers
  bestPaceSecsPerKm?: number;    // best average pace in any single activity
  longestActivityKm: number;
  totalActivities: number;

  // Consistency & patterns
  consistencyScore: number;      // 0-1: % of weeks with ≥1 activity
  injuryWeeks: number;           // isolated 0-activity weeks between active periods
  volumeTrend: VolumeTrend;      // last 6w vs previous 6w

  // Auto-detected fitness level from data
  detectedFitnessLevel: FitnessLevel;

  // LLM-generated narrative — used as persistent context in every prompt
  summaryText: string;
}
