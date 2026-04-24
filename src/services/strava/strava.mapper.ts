import { createHash } from 'crypto';
import type { StravaActivity } from '../../types/strava.types.js';
import type { Activity } from '../../types/activity.types.js';
import { speedToSecsPerKm, temperaturePaceAdjustment } from '../../utils/math.utils.js';
import { parseStravaDate } from '../../utils/date.utils.js';
import { generateId } from '../../utils/hash.utils.js';
import type { SportType } from '../../config/constants.js';

const STRAVA_TO_SPORT: Record<string, SportType> = {
  Run: 'running',
  VirtualRun: 'running',
  TrailRun: 'running',
  Ride: 'cycling',
  VirtualRide: 'cycling',
  EBikeRide: 'cycling',
  Triathlon: 'triathlon',
};

export function mapStravaActivity(raw: StravaActivity, athleteId: string): Activity | null {
  const sport = STRAVA_TO_SPORT[raw.sport_type] ?? STRAVA_TO_SPORT[raw.type];
  if (!sport) return null;

  const rawHash = createHash('sha256').update(JSON.stringify(raw)).digest('hex');
  const avgPace = raw.average_speed > 0 ? speedToSecsPerKm(raw.average_speed) : undefined;

  const activity: Activity = {
    id: generateId(),
    stravaId: raw.id,
    athleteId,
    sport,
    startDate: parseStravaDate(raw.start_date),
    name: raw.name,
    description: raw.description,

    distanceMeters: raw.distance,
    movingTimeSeconds: raw.moving_time,
    elapsedTimeSeconds: raw.elapsed_time,

    totalElevationGainMeters: raw.total_elevation_gain,
    elevHighMeters: raw.elev_high,
    elevLowMeters: raw.elev_low,

    averageSpeedMs: raw.average_speed,
    maxSpeedMs: raw.max_speed > 0 ? raw.max_speed : undefined,
    averagePaceSecsPerKm: avgPace,

    averageHeartRate: raw.average_heartrate,
    maxHeartRate: raw.max_heartrate,

    averageWatts: raw.average_watts,
    maxWatts: raw.max_watts,
    weightedAverageWatts: raw.weighted_average_watts,
    kilojoules: raw.kilojoules,

    averageCadence: raw.average_cadence,
    calories: raw.calories,
    sufferScore: raw.suffer_score,
    perceivedExertion: raw.perceived_exertion,

    workoutType: raw.workout_type,
    isTrainer: raw.trainer ?? false,
    isCommute: raw.commute ?? false,
    gearId: raw.gear_id,
    prCount: raw.pr_count,
    achievementCount: raw.achievement_count,

    rawHash,
    raw,
  };

  if (raw.average_temp != null) {
    activity.weatherContext = {
      averageTempCelsius: raw.average_temp,
      paceAdjustmentFactor: temperaturePaceAdjustment(raw.average_temp),
    };
  }

  return activity;
}

export function mapStravaActivities(raws: StravaActivity[], athleteId: string): Activity[] {
  return raws.flatMap((raw) => {
    const activity = mapStravaActivity(raw, athleteId);
    return activity ? [activity] : [];
  });
}
