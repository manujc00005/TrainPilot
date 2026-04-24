import type { SportType } from '../config/constants.js';
import type { StravaActivity } from './strava.types.js';

export interface Activity {
  id: string;
  stravaId: number;
  athleteId: string;
  sport: SportType;
  startDate: Date;
  name: string;
  description?: string;

  // Distance & time
  distanceMeters: number;
  movingTimeSeconds: number;
  elapsedTimeSeconds: number;

  // Elevation
  totalElevationGainMeters: number;
  elevHighMeters?: number;
  elevLowMeters?: number;

  // Speed & pace
  averageSpeedMs: number;
  maxSpeedMs?: number;
  averagePaceSecsPerKm?: number;

  // Heart rate
  averageHeartRate?: number;
  maxHeartRate?: number;

  // Power (cycling)
  averageWatts?: number;
  maxWatts?: number;
  weightedAverageWatts?: number;
  kilojoules?: number;

  // Cadence & misc
  averageCadence?: number;
  calories?: number;
  sufferScore?: number;
  perceivedExertion?: number;

  // Activity metadata
  /** 0=default, 1=race, 2=long_run, 3=workout (running) */
  workoutType?: number;
  isTrainer: boolean;
  isCommute: boolean;
  gearId?: string;
  prCount?: number;
  achievementCount?: number;

  rawHash: string;
  weatherContext?: WeatherContext;
  raw: StravaActivity;
}

export interface WeatherContext {
  averageTempCelsius: number;
  paceAdjustmentFactor: number; // multiplier to normalize pace for temperature
}
