import { getValidToken } from '../services/strava/strava.auth.js';
import { logger } from '../utils/logger.js';

export async function runTokenRefresh(): Promise<void> {
  try {
    await getValidToken(); // Internally refreshes if needed
    logger.debug('Strava token check complete');
  } catch (err) {
    logger.error({ err }, 'Strava token refresh failed');
    throw err;
  }
}
