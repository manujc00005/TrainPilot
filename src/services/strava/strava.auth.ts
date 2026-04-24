import axios from 'axios';
import { config } from '../../config/index.js';
import { STRAVA_AUTH_URL } from '../../config/constants.js';
import { getStorage } from '../storage/index.js';
import { logger } from '../../utils/logger.js';
import type { StravaTokens, StravaTokenResponse } from '../../types/strava.types.js';

const ATHLETE_ID = config.STRAVA_ATHLETE_ID;

export async function getValidToken(): Promise<string> {
  const storage = getStorage();
  let tokens = await storage.getTokens(ATHLETE_ID);

  if (!tokens) {
    // Bootstrap from env vars on first run
    tokens = {
      accessToken: config.STRAVA_ACCESS_TOKEN,
      refreshToken: config.STRAVA_REFRESH_TOKEN,
      expiresAt: 0, // Force refresh
    };
  }

  if (isExpired(tokens)) {
    tokens = await refreshToken(tokens.refreshToken);
    await storage.saveTokens(ATHLETE_ID, tokens);
    logger.info('Strava token refreshed');
  }

  return tokens.accessToken;
}

export async function refreshToken(refreshToken: string): Promise<StravaTokens> {
  const response = await axios.post<StravaTokenResponse>(STRAVA_AUTH_URL, {
    client_id: config.STRAVA_CLIENT_ID,
    client_secret: config.STRAVA_CLIENT_SECRET,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  return {
    accessToken: response.data.access_token,
    refreshToken: response.data.refresh_token,
    expiresAt: response.data.expires_at,
  };
}

function isExpired(tokens: StravaTokens): boolean {
  // Refresh 5 minutes before actual expiry
  return Date.now() / 1000 > tokens.expiresAt - 300;
}
