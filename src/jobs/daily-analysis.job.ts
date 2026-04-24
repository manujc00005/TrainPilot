import { getStorage } from '../services/storage/index.js';
import { calculateWeeklyMetrics } from '../services/metrics/metrics.service.js';
import { generateDailyAnalysis } from '../services/llm/llm.service.js';
import { sendNotification } from '../services/notification/notification.service.js';
import { config } from '../config/index.js';
import { getCurrentWeekBounds } from '../utils/date.utils.js';
import { logger } from '../utils/logger.js';

export async function runDailyAnalysis(): Promise<void> {
  logger.info('Starting daily analysis');

  const storage = getStorage();
  const athleteId = config.STRAVA_ATHLETE_ID;
  const { start: weekStart } = getCurrentWeekBounds();

  const [activities, plannedSessions, recentWeeks, goal, subjectiveFatigue] = await Promise.all([
    storage.getActivitiesByWeek(weekStart, athleteId),
    storage.getPlannedSessionsByWeek(weekStart, athleteId),
    storage.getRecentWeeklyMetrics(4, athleteId),
    storage.getActiveGoal(athleteId),
    storage.getSubjectiveFatigue(athleteId, new Date()),
  ]);

  if (!goal) {
    logger.warn('No active training goal found — skipping daily analysis');
    return;
  }

  const metrics = await calculateWeeklyMetrics(
    activities,
    plannedSessions,
    recentWeeks,
    weekStart,
    subjectiveFatigue ?? undefined,
  );

  await storage.saveWeeklyMetrics(metrics);

  const analysis = await generateDailyAnalysis({
    contextType: 'daily_analysis',
    goal,
    currentWeekMetrics: metrics,
    recentWeeksMetrics: recentWeeks,
    plannedSessions,
    recentActivities: activities.slice(0, 5),
  });

  await sendNotification({
    type: 'daily_analysis',
    text: analysis,
    athleteId,
  });

  logger.info('Daily analysis complete');
}
