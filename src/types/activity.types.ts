import type { SportType } from '../config/constants.js';
import type { StravaActivity } from './strava.types.js';

export interface Activity {
  id: string;
  stravaId: number;
  athleteId: string;
  sport: SportType;
  startDate: Date;
  name: string;
  distanceMeters: number;
  movingTimeSeconds: number;
  elapsedTimeSeconds: number;
  totalElevationGainMeters: number;
  averageSpeedMs: number;
  averagePaceSecsPerKm?: number;
  averageHeartRate?: number;
  maxHeartRate?: number;
  averageCadence?: number;
  averageWatts?: number;
  sufferScore?: number;
  perceivedExertion?: number;
  rawHash: string;
  weatherContext?: WeatherContext;
  raw: StravaActivity;
}

export interface WeatherContext {
  averageTempCelsius: number;
  paceAdjustmentFactor: number; // multiplier to normalize pace for temperature
}
