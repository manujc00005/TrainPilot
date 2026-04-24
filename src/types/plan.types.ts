import type { SportType, FitnessLevel, SessionType } from '../config/constants.js';

export interface TrainingGoal {
  id: string;
  athleteId: string;
  sport: SportType;
  description: string;
  targetDate?: Date;
  weeklyTargetHours: number;
  fitnessLevel: FitnessLevel;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlannedSession {
  id: string;
  athleteId: string;
  weekStart: Date;
  dayOfWeek: number; // 0=Sunday, 1=Monday...
  sessionType: SessionType;
  targetDistanceKm?: number;
  targetDurationMinutes?: number;
  targetPaceSecsPerKm?: number;
  description: string;
  completed: boolean;
  completedActivityId?: string;
  skippedReason?: string;
}
