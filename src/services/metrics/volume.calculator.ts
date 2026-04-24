import type { Activity } from '../../types/activity.types.js';
import type { VolumeMetrics } from '../../types/metrics.types.js';
import { metersToKm, secondsToHours, round } from '../../utils/math.utils.js';

export function calculateVolume(activities: Activity[]): VolumeMetrics {
  if (activities.length === 0) {
    return {
      totalDistanceKm: 0,
      totalTimeHours: 0,
      totalElevationGainMeters: 0,
      longestActivityDistanceKm: 0,
      averageDailyDistanceKm: 0,
    };
  }

  const totalDistanceKm = round(
    activities.reduce((sum, a) => sum + metersToKm(a.distanceMeters), 0),
  );
  const totalTimeHours = round(
    activities.reduce((sum, a) => sum + secondsToHours(a.movingTimeSeconds), 0),
  );
  const totalElevationGainMeters = round(
    activities.reduce((sum, a) => sum + a.totalElevationGainMeters, 0),
  );
  const longestActivityDistanceKm = round(
    Math.max(...activities.map((a) => metersToKm(a.distanceMeters))),
  );

  return {
    totalDistanceKm,
    totalTimeHours,
    totalElevationGainMeters,
    longestActivityDistanceKm,
    averageDailyDistanceKm: round(totalDistanceKm / 7),
  };
}
