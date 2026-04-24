import axios from 'axios';
import { config } from '../../config/index.js';
import { STRAVA_API_BASE } from '../../config/constants.js';
import { getValidToken } from './strava.auth.js';
import { mapStravaActivities, mapStravaActivity } from './strava.mapper.js';
import { withRetry } from '../../utils/retry.utils.js';
import { toUnixTimestamp } from '../../utils/date.utils.js';
import { logger } from '../../utils/logger.js';
import type { Activity } from '../../types/activity.types.js';
import type { StravaActivity } from '../../types/strava.types.js';

const ATHLETE_ID = config.STRAVA_ATHLETE_ID;

async function stravaGet<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  const token = await getValidToken();
  const response = await withRetry(() =>
    axios.get<T>(`${STRAVA_API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      params,
    }),
  );
  return response.data;
}

export async function getActivitiesByDateRange(start: Date, end: Date): Promise<Activity[]> {
  const allActivities: StravaActivity[] = [];
  let page = 1;

  while (true) {
    const batch = await stravaGet<StravaActivity[]>('/athlete/activities', {
      after: toUnixTimestamp(start),
      before: toUnixTimestamp(end),
      per_page: 100,
      page,
    });

    if (batch.length === 0) break;
    allActivities.push(...batch);

    if (batch.length < 100) break;
    page++;
  }

  logger.info({ count: allActivities.length, start, end }, 'Fetched Strava activities');
  return mapStravaActivities(allActivities, ATHLETE_ID);
}

export async function getActivityDetail(stravaId: number): Promise<Activity | null> {
  const raw = await stravaGet<StravaActivity>(`/activities/${stravaId}`);
  return mapStravaActivity(raw, ATHLETE_ID);
}

export async function getAthleteStats() {
  return stravaGet(`/athletes/${ATHLETE_ID}/stats`);
}
