import type { Activity } from '../../types/activity.types.js';
import type { PlannedSession } from '../../types/plan.types.js';
import type { ComplianceMetrics } from '../../types/metrics.types.js';
import { metersToKm } from '../../utils/math.utils.js';
import { round } from '../../utils/math.utils.js';

// Tolerances for matching a completed activity to a planned session
const DISTANCE_TOLERANCE = 0.15;  // 15% distance variance allowed
const DURATION_TOLERANCE = 0.20;  // 20% duration variance allowed

export function checkCompliance(
  plannedSessions: PlannedSession[],
  completedActivities: Activity[],
): ComplianceMetrics {
  const workoutSessions = plannedSessions.filter((s) => s.sessionType !== 'rest');

  let completedCount = 0;
  let partialCount = 0;
  const missedDates: Date[] = [];

  for (const session of workoutSessions) {
    const match = findMatchingActivity(session, completedActivities);

    if (!match) {
      missedDates.push(getSessionDate(session));
      continue;
    }

    if (isFullyCompleted(session, match)) {
      completedCount++;
    } else {
      partialCount++;
    }
  }

  const total = workoutSessions.length;

  return {
    plannedSessions: total,
    completedSessions: completedCount,
    completionRate: total > 0 ? round(completedCount / total, 2) : 1,
    missedSessionDates: missedDates,
    partiallyCompleted: partialCount,
  };
}

function findMatchingActivity(session: PlannedSession, activities: Activity[]): Activity | null {
  const sessionDate = getSessionDate(session);
  const dayStart = new Date(sessionDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(sessionDate);
  dayEnd.setHours(23, 59, 59, 999);

  return (
    activities.find((a) => a.startDate >= dayStart && a.startDate <= dayEnd) ?? null
  );
}

function isFullyCompleted(session: PlannedSession, activity: Activity): boolean {
  if (session.targetDistanceKm) {
    const actual = metersToKm(activity.distanceMeters);
    const expected = session.targetDistanceKm;
    if (actual < expected * (1 - DISTANCE_TOLERANCE)) return false;
  }

  if (session.targetDurationMinutes) {
    const actualMins = activity.movingTimeSeconds / 60;
    const expected = session.targetDurationMinutes;
    if (actualMins < expected * (1 - DURATION_TOLERANCE)) return false;
  }

  return true;
}

function getSessionDate(session: PlannedSession): Date {
  const d = new Date(session.weekStart);
  d.setDate(d.getDate() + session.dayOfWeek);
  return d;
}
