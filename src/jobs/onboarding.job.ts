import { subMonths, addWeeks } from 'date-fns';
import { getActivitiesByDateRange } from '../services/strava/strava.service.js';
import { getStorage } from '../services/storage/index.js';
import { calculateWeeklyMetrics } from '../services/metrics/metrics.service.js';
import { computeBaseline } from '../services/metrics/baseline.service.js';
import { generateBaseline } from '../services/llm/llm.service.js';
import { sendNotification } from '../services/notification/notification.service.js';
import { config } from '../config/index.js';
import { ONBOARDING_MONTHS } from '../config/constants.js';
import { startOfWeek } from '../utils/date.utils.js';
import { logger } from '../utils/logger.js';
import type { Activity } from '../types/activity.types.js';
import type { WeeklyMetrics } from '../types/metrics.types.js';

export async function runOnboarding(): Promise<void> {
  const storage = getStorage();
  const athleteId = config.STRAVA_ATHLETE_ID;

  const existing = await storage.getBaseline(athleteId);
  if (existing) {
    logger.info('Baseline already exists — skipping onboarding (use force=true to regenerate)');
    return;
  }

  const goal = await storage.getActiveGoal(athleteId);
  if (!goal) {
    logger.warn('No active training goal — set a goal before running onboarding');
    return;
  }

  const end = new Date();
  const start = subMonths(end, ONBOARDING_MONTHS);
  logger.info({ start, end, months: ONBOARDING_MONTHS }, 'Fetching historical activities');

  const activities = await getActivitiesByDateRange(start, end);
  await storage.saveActivities(activities);
  logger.info({ count: activities.length }, 'Historical activities saved');

  const weekStarts = getWeekStartsInRange(start, end);
  const actsByWeek = groupActivitiesByWeek(activities);

  const allWeeklyMetrics: WeeklyMetrics[] = [];

  for (const weekStart of weekStarts) {
    const key = weekStart.toISOString().slice(0, 10);
    const weekActivities = actsByWeek.get(key) ?? [];
    const priorWeeks = allWeeklyMetrics.slice(-4);

    const metrics = await calculateWeeklyMetrics(weekActivities, [], priorWeeks, weekStart);
    await storage.saveWeeklyMetrics(metrics);
    allWeeklyMetrics.push(metrics);
  }

  logger.info({ weeks: allWeeklyMetrics.length }, 'Weekly metrics computed');

  const stats = computeBaseline(athleteId, allWeeklyMetrics, activities, ONBOARDING_MONTHS);

  logger.info('Generating baseline narrative via LLM');
  const summaryText = await generateBaseline(stats, goal);

  await storage.saveBaseline({ ...stats, summaryText });
  logger.info('Onboarding complete — baseline saved');

  await sendNotification({
    type: 'custom',
    text: `*Perfil de atleta generado*\n\n${summaryText}`,
    athleteId,
  });
}

function getWeekStartsInRange(start: Date, end: Date): Date[] {
  const weeks: Date[] = [];
  let current = startOfWeek(start, { weekStartsOn: 1 });
  const last = startOfWeek(end, { weekStartsOn: 1 });

  while (current <= last) {
    weeks.push(current);
    current = addWeeks(current, 1);
  }

  return weeks;
}

function groupActivitiesByWeek(activities: Activity[]): Map<string, Activity[]> {
  const map = new Map<string, Activity[]>();

  for (const activity of activities) {
    const weekStart = startOfWeek(new Date(activity.startDate), { weekStartsOn: 1 });
    const key = weekStart.toISOString().slice(0, 10);
    const bucket = map.get(key) ?? [];
    bucket.push(activity);
    map.set(key, bucket);
  }

  return map;
}
