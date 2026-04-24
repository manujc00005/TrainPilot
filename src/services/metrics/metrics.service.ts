import type { Activity } from '../../types/activity.types.js';
import type { PlannedSession } from '../../types/plan.types.js';
import type { WeeklyMetrics } from '../../types/metrics.types.js';
import { calculateVolume } from './volume.calculator.js';
import { calculateIntensity } from './intensity.calculator.js';
import { calculateFatigue } from './fatigue.detector.js';
import { checkCompliance } from './compliance.checker.js';
import { config } from '../../config/index.js';
import { getWeekBounds } from '../../utils/date.utils.js';

export async function calculateWeeklyMetrics(
  activities: Activity[],
  plannedSessions: PlannedSession[],
  recentWeeks: WeeklyMetrics[],
  weekStart: Date,
  subjectiveFatigue?: number,
): Promise<WeeklyMetrics> {
  const { end: weekEnd } = getWeekBounds(weekStart);

  const volume = calculateVolume(activities);
  const intensity = calculateIntensity(activities);
  const fatigue = calculateFatigue(intensity.estimatedTSS, recentWeeks, subjectiveFatigue);
  const compliance = checkCompliance(plannedSessions, activities);

  return {
    weekStart,
    weekEnd,
    athleteId: config.STRAVA_ATHLETE_ID,
    sport: config.ATHLETE_SPORT,
    activitiesCount: activities.length,
    volume,
    intensity,
    fatigue,
    compliance,
  };
}
