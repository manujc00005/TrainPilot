import { getStorage } from '../services/storage/index.js';
import { calculateWeeklyMetrics } from '../services/metrics/metrics.service.js';
import { generateComplianceCheck } from '../services/llm/llm.service.js';
import { sendNotification } from '../services/notification/notification.service.js';
import { config } from '../config/index.js';
import { getCurrentWeekBounds, startOfDay } from '../utils/date.utils.js';
import { logger } from '../utils/logger.js';

export async function runComplianceCheck(): Promise<void> {
  logger.info('Starting compliance check');

  const storage = getStorage();
  const athleteId = config.STRAVA_ATHLETE_ID;
  const { start: weekStart } = getCurrentWeekBounds();
  const today = startOfDay(new Date());

  const [activities, plannedSessions, recentWeeks, goal] = await Promise.all([
    storage.getActivitiesByWeek(weekStart, athleteId),
    storage.getPlannedSessionsByWeek(weekStart, athleteId),
    storage.getRecentWeeklyMetrics(4, athleteId),
    storage.getActiveGoal(athleteId),
  ]);

  if (!goal) {
    logger.warn('No active training goal — skipping compliance check');
    return;
  }

  // Only check sessions scheduled for today or earlier this week
  const dueSessions = plannedSessions.filter((s) => {
    const sessionDate = new Date(weekStart);
    sessionDate.setDate(sessionDate.getDate() + s.dayOfWeek);
    return sessionDate <= today && s.sessionType !== 'rest';
  });

  const missedSessions = dueSessions.filter((s) => !s.completed);

  if (missedSessions.length === 0) {
    logger.info('No missed sessions — skipping compliance notification');
    return;
  }

  const metrics = await calculateWeeklyMetrics(activities, plannedSessions, recentWeeks, weekStart);

  const message = await generateComplianceCheck({
    contextType: 'compliance_check',
    goal,
    currentWeekMetrics: metrics,
    recentWeeksMetrics: recentWeeks,
    plannedSessions,
    recentActivities: activities,
    missedSessions,
  });

  await sendNotification({
    type: 'compliance_check',
    text: message,
    athleteId,
  });

  logger.info({ missed: missedSessions.length }, 'Compliance check complete');
}
