import type { Activity } from '../../types/activity.types.js';
import type { IntensityMetrics, ZoneDistribution } from '../../types/metrics.types.js';
import { metersToKm, secondsToHours, round } from '../../utils/math.utils.js';

// Simplified TSS using HR-based intensity factor when available,
// falling back to pace-based estimation for running
export function calculateIntensity(activities: Activity[]): IntensityMetrics {
  if (activities.length === 0) {
    return {
      estimatedTSS: 0,
      intensityDistribution: { easy: 0, moderate: 0, hard: 0 },
    };
  }

  let totalTSS = 0;
  const paces: number[] = [];
  const heartRates: number[] = [];
  const zoneSeconds = { easy: 0, moderate: 0, hard: 0 };

  for (const activity of activities) {
    const tss = estimateTSS(activity);
    totalTSS += tss;

    if (activity.averagePaceSecsPerKm) paces.push(activity.averagePaceSecsPerKm);
    if (activity.averageHeartRate) heartRates.push(activity.averageHeartRate);

    const zone = classifyIntensity(activity);
    zoneSeconds[zone] += activity.movingTimeSeconds;
  }

  const totalSeconds = activities.reduce((s, a) => s + a.movingTimeSeconds, 0);
  const distribution: ZoneDistribution =
    totalSeconds > 0
      ? {
          easy: round((zoneSeconds.easy / totalSeconds) * 100),
          moderate: round((zoneSeconds.moderate / totalSeconds) * 100),
          hard: round((zoneSeconds.hard / totalSeconds) * 100),
        }
      : { easy: 0, moderate: 0, hard: 0 };

  return {
    estimatedTSS: round(totalTSS),
    averagePaceSecsPerKm: paces.length > 0 ? round(paces.reduce((a, b) => a + b) / paces.length) : undefined,
    averageHeartRate: heartRates.length > 0 ? round(heartRates.reduce((a, b) => a + b) / heartRates.length) : undefined,
    intensityDistribution: distribution,
  };
}

function estimateTSS(activity: Activity): number {
  const hours = secondsToHours(activity.movingTimeSeconds);

  // If HR available: TSS ≈ hours × (avgHR/thresholdHR)² × 100
  if (activity.averageHeartRate) {
    const thresholdHR = 170; // Default threshold HR; ideally user-configured
    const intensityFactor = activity.averageHeartRate / thresholdHR;
    return hours * intensityFactor * intensityFactor * 100;
  }

  // Pace-based fallback for running: TSS ≈ hours × IF² × 100
  // IF derived from pace relative to threshold pace (4:30/km default)
  if (activity.averagePaceSecsPerKm) {
    const thresholdPace = 270; // 4:30/km in seconds
    const intensityFactor = thresholdPace / activity.averagePaceSecsPerKm;
    return hours * intensityFactor * intensityFactor * 100;
  }

  // Bare minimum: assume moderate intensity
  return hours * 0.6 * 0.6 * 100;
}

function classifyIntensity(activity: Activity): keyof ZoneDistribution {
  if (activity.averageHeartRate) {
    if (activity.averageHeartRate < 140) return 'easy';
    if (activity.averageHeartRate < 160) return 'moderate';
    return 'hard';
  }

  // Pace-based: easy <5:30/km, moderate 4:30–5:30, hard <4:30
  const pace = activity.averagePaceSecsPerKm;
  if (!pace) return 'moderate';
  if (pace > 330) return 'easy';
  if (pace > 270) return 'moderate';
  return 'hard';
}
