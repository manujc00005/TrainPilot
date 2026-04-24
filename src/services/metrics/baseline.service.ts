import type { WeeklyMetrics } from '../../types/metrics.types.js';
import type { Activity } from '../../types/activity.types.js';
import type { AthleteBaseline, VolumeTrend } from '../../types/baseline.types.js';
import type { FitnessLevel } from '../../config/constants.js';
import { generateId } from '../../utils/hash.utils.js';
import { metersToKm, round } from '../../utils/math.utils.js';

export function computeBaseline(
  athleteId: string,
  weeklyMetrics: WeeklyMetrics[],
  allActivities: Activity[],
  periodMonths: number,
): Omit<AthleteBaseline, 'summaryText'> {
  const sorted = [...weeklyMetrics].sort(
    (a, b) => new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime(),
  );

  const peakCTL = round(Math.max(...sorted.map((w) => w.fatigue.ctl), 0));
  const currentCTL = round(sorted.at(-1)?.fatigue.ctl ?? 0);

  const activeWeeks = sorted.filter((w) => w.activitiesCount > 0);
  const avgWeeklyDistanceKm = round(
    activeWeeks.reduce((s, w) => s + w.volume.totalDistanceKm, 0) / Math.max(activeWeeks.length, 1),
  );
  const avgWeeklyTimeHours = round(
    activeWeeks.reduce((s, w) => s + w.volume.totalTimeHours, 0) / Math.max(activeWeeks.length, 1),
  );

  const bestPaceSecsPerKm = allActivities
    .map((a) => a.averagePaceSecsPerKm)
    .filter((p): p is number => p != null && p > 0)
    .reduce<number | undefined>((best, p) => (best === undefined || p < best ? p : best), undefined);

  const longestActivityKm = round(
    Math.max(...allActivities.map((a) => metersToKm(a.distanceMeters)), 0),
  );

  const consistencyScore = round(activeWeeks.length / Math.max(sorted.length, 1), 2);
  const injuryWeeks = detectInjuryWeeks(sorted);
  const volumeTrend = detectVolumeTrend(sorted);
  const detectedFitnessLevel = detectFitnessLevel(avgWeeklyDistanceKm, peakCTL, bestPaceSecsPerKm);

  return {
    id: generateId(),
    athleteId,
    generatedAt: new Date(),
    periodMonths,
    peakCTL,
    currentCTL,
    avgWeeklyDistanceKm,
    avgWeeklyTimeHours,
    bestPaceSecsPerKm,
    longestActivityKm,
    totalActivities: allActivities.length,
    consistencyScore,
    injuryWeeks,
    volumeTrend,
    detectedFitnessLevel,
  };
}

// An "injury week" is a 0-activity week between two active weeks
function detectInjuryWeeks(sorted: WeeklyMetrics[]): number {
  let count = 0;
  for (let i = 1; i < sorted.length - 1; i++) {
    if (
      sorted[i].activitiesCount === 0 &&
      sorted[i - 1].activitiesCount > 0 &&
      sorted[i + 1].activitiesCount > 0
    ) {
      count++;
    }
  }
  return count;
}

function detectVolumeTrend(sorted: WeeklyMetrics[]): VolumeTrend {
  if (sorted.length < 12) return 'stable';
  const half = Math.floor(sorted.length / 2);
  const recentAvg =
    sorted.slice(-6).reduce((s, w) => s + w.volume.totalDistanceKm, 0) / 6;
  const previousAvg =
    sorted.slice(half - 6, half).reduce((s, w) => s + w.volume.totalDistanceKm, 0) / 6;

  if (recentAvg > previousAvg * 1.1) return 'increasing';
  if (recentAvg < previousAvg * 0.9) return 'decreasing';
  return 'stable';
}

function detectFitnessLevel(
  avgWeeklyKm: number,
  peakCTL: number,
  _bestPace?: number,
): FitnessLevel {
  if (avgWeeklyKm >= 70 || peakCTL >= 80) return 'advanced';
  if (avgWeeklyKm >= 30 || peakCTL >= 40) return 'intermediate';
  return 'beginner';
}
