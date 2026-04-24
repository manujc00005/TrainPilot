import type { WeeklyMetrics } from '../../types/metrics.types.js';
import type { FatigueMetrics } from '../../types/metrics.types.js';
import {
  ATL_DECAY,
  CTL_DECAY,
  TSB_FRESH_THRESHOLD,
  TSB_TIRED_THRESHOLD,
  TSB_OVERREACHED_THRESHOLD,
} from '../../config/constants.js';
import type { FatigueLevel } from '../../config/constants.js';
import { round } from '../../utils/math.utils.js';

// Standard Performance Management Chart (PMC) model
// ATL = yesterday's ATL × e^(-1/7) + today's TSS × (1 - e^(-1/7))
// CTL = yesterday's CTL × e^(-1/42) + today's TSS × (1 - e^(-1/42))
export function calculateFatigue(
  currentWeekTSS: number,
  recentWeeks: WeeklyMetrics[],
  subjectiveFatigue?: number,
): FatigueMetrics {
  // Seed ATL/CTL from historical data (up to 6 weeks back)
  let atl = 0;
  let ctl = 0;

  const historicalByDay = buildDailyTSS(recentWeeks, currentWeekTSS);

  for (const dailyTSS of historicalByDay) {
    atl = atl * ATL_DECAY + dailyTSS * (1 - ATL_DECAY);
    ctl = ctl * CTL_DECAY + dailyTSS * (1 - CTL_DECAY);
  }

  const tsb = ctl - atl;

  return {
    atl: round(atl),
    ctl: round(ctl),
    tsb: round(tsb),
    fatigueLevel: classifyFatigue(tsb, subjectiveFatigue),
    subjectiveFatigue,
  };
}

function buildDailyTSS(recentWeeks: WeeklyMetrics[], currentWeekTSS: number): number[] {
  const allWeeks = [...recentWeeks].reverse(); // oldest first
  const days: number[] = [];

  for (const week of allWeeks) {
    const dailyAvg = week.intensity.estimatedTSS / 7;
    for (let i = 0; i < 7; i++) days.push(dailyAvg);
  }

  // Add current week days
  const currentDailyAvg = currentWeekTSS / 7;
  for (let i = 0; i < 7; i++) days.push(currentDailyAvg);

  return days;
}

function classifyFatigue(tsb: number, subjective?: number): FatigueLevel {
  // Subjective fatigue overrides TSB if very low (1-3 = very tired)
  if (subjective != null && subjective <= 3) return 'overreached';
  if (subjective != null && subjective <= 5) return 'tired';

  if (tsb >= TSB_FRESH_THRESHOLD) return 'fresh';
  if (tsb >= TSB_TIRED_THRESHOLD) return 'normal';
  if (tsb >= TSB_OVERREACHED_THRESHOLD) return 'tired';
  return 'overreached';
}
