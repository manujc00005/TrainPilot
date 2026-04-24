import { getStorage } from '../services/storage/index.js';
import { calculateWeeklyMetrics } from '../services/metrics/metrics.service.js';
import { generateWeeklyPlan } from '../services/llm/llm.service.js';
import { sendNotification } from '../services/notification/notification.service.js';
import { config } from '../config/index.js';
import { getCurrentWeekBounds, getWeekBounds } from '../utils/date.utils.js';
import { generateId } from '../utils/hash.utils.js';
import { logger } from '../utils/logger.js';
import { addWeeks } from 'date-fns';
import type { PlannedSession } from '../types/plan.types.js';

export async function runWeeklyPlanning(): Promise<void> {
  logger.info('Starting weekly planning');

  const storage = getStorage();
  const athleteId = config.STRAVA_ATHLETE_ID;
  const { start: thisWeekStart } = getCurrentWeekBounds();
  const nextWeekStart = getWeekBounds(addWeeks(thisWeekStart, 1)).start;

  const [activities, plannedSessions, recentWeeks, goal] = await Promise.all([
    storage.getActivitiesByWeek(thisWeekStart, athleteId),
    storage.getPlannedSessionsByWeek(thisWeekStart, athleteId),
    storage.getRecentWeeklyMetrics(4, athleteId),
    storage.getActiveGoal(athleteId),
  ]);

  if (!goal) {
    logger.warn('No active training goal found — skipping weekly planning');
    return;
  }

  const metrics = await calculateWeeklyMetrics(activities, plannedSessions, recentWeeks, thisWeekStart);

  const planJson = await generateWeeklyPlan(
    {
      contextType: 'weekly_planning',
      goal,
      currentWeekMetrics: metrics,
      recentWeeksMetrics: recentWeeks,
      plannedSessions,
      recentActivities: activities,
    },
    nextWeekStart,
  );

  const sessions = parsePlanResponse(planJson, athleteId, nextWeekStart);

  if (sessions.length > 0) {
    await storage.savePlannedSessions(sessions);
    logger.info({ count: sessions.length }, 'Planned sessions saved');
  }

  await sendNotification({
    type: 'weekly_plan',
    text: planJson,
    athleteId,
  });

  logger.info('Weekly planning complete');
}

function parsePlanResponse(
  raw: string,
  athleteId: string,
  weekStart: Date,
): PlannedSession[] {
  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const items = JSON.parse(jsonMatch[0]) as Array<{
      dayOfWeek: number;
      sessionType: PlannedSession['sessionType'];
      targetDistanceKm?: number;
      targetDurationMinutes?: number;
      targetPaceSecsPerKm?: number;
      description: string;
    }>;

    return items.map((item) => ({
      id: generateId(),
      athleteId,
      weekStart,
      dayOfWeek: item.dayOfWeek,
      sessionType: item.sessionType,
      targetDistanceKm: item.targetDistanceKm,
      targetDurationMinutes: item.targetDurationMinutes,
      targetPaceSecsPerKm: item.targetPaceSecsPerKm,
      description: item.description,
      completed: false,
    }));
  } catch {
    logger.error({ raw }, 'Failed to parse weekly plan JSON');
    return [];
  }
}
