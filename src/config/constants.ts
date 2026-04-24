export const STRAVA_API_BASE = 'https://www.strava.com/api/v3';
export const STRAVA_AUTH_URL = 'https://www.strava.com/oauth/token';

export const SPORT_TYPES = ['running', 'cycling', 'triathlon'] as const;
export type SportType = (typeof SPORT_TYPES)[number];

export const FITNESS_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export type FitnessLevel = (typeof FITNESS_LEVELS)[number];

export const SESSION_TYPES = [
  'easy',
  'tempo',
  'intervals',
  'long_run',
  'recovery',
  'strength',
  'rest',
] as const;
export type SessionType = (typeof SESSION_TYPES)[number];

export const FATIGUE_LEVELS = ['fresh', 'normal', 'tired', 'overreached'] as const;
export type FatigueLevel = (typeof FATIGUE_LEVELS)[number];

// ATL/CTL decay constants (standard PMC model)
export const ATL_DECAY = Math.exp(-1 / 7);   // 7-day time constant
export const CTL_DECAY = Math.exp(-1 / 42);  // 42-day time constant

// TSB thresholds
export const TSB_FRESH_THRESHOLD = 5;
export const TSB_TIRED_THRESHOLD = -10;
export const TSB_OVERREACHED_THRESHOLD = -25;
