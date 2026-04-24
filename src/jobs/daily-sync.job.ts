import { getActivitiesByDateRange } from '../services/strava/strava.service.js';
import { getStorage } from '../services/storage/index.js';
import { getYesterdayBounds } from '../utils/date.utils.js';
import { logger } from '../utils/logger.js';

export async function runDailySync(): Promise<void> {
  logger.info('Starting daily sync');
  const { start, end } = getYesterdayBounds();

  const activities = await getActivitiesByDateRange(start, end);

  if (activities.length === 0) {
    logger.info('No activities found for yesterday');
    return;
  }

  const storage = getStorage();
  await storage.saveActivities(activities);
  logger.info({ count: activities.length }, 'Daily sync complete');
}
