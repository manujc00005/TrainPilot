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

  if (!sport) return null; // Skip unsupported activity types

  const rawHash = createHash('sha256').update(JSON.stringify(raw)).digest('hex');
  const avgPace = raw.average_speed > 0 ? speedToSecsPerKm(raw.average_speed) : undefined;

  const activity: Activity = {
    id: generateId(),
    stravaId: raw.id,
    athleteId,
    sport,
    startDate: parseStravaDate(raw.start_date),
    name: raw.name,
    distanceMeters: raw.distance,
    movingTimeSeconds: raw.moving_time,
    elapsedTimeSeconds: raw.elapsed_time,
    totalElevationGainMeters: raw.total_elevation_gain,
    averageSpeedMs: raw.average_speed,
    averagePaceSecsPerKm: avgPace,
    averageHeartRate: raw.average_heartrate,
    maxHeartRate: raw.max_heartrate,
    averageCadence: raw.average_cadence,
    averageWatts: raw.average_watts,
    sufferScore: raw.suffer_score,
    perceivedExertion: raw.perceived_exertion,
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
