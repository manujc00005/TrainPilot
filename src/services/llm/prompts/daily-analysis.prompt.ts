import type { LLMContext } from '../../../types/llm.types.js';
import type { WeeklyMetrics } from '../../../types/metrics.types.js';
import { formatPace, formatDuration, metersToKm, round } from '../../../utils/math.utils.js';
import { formatDate } from '../../../utils/date.utils.js';

export const DAILY_ANALYSIS_SYSTEM = `You are an expert endurance sports coach with deep knowledge of training periodization, physiology, and athlete psychology.

Your role is to analyze training data and provide:
- Honest, data-driven feedback (not just encouragement)
- Specific, actionable recommendations
- Context-aware advice considering fatigue, goal timeline, and recent trends

Always respond in the same language as the athlete's goal description.
Keep responses concise and practical — no more than 300 words.
Format with clear sections using emojis as headers.`;

export function buildDailyAnalysisPrompt(ctx: LLMContext): string {
  const { goal, currentWeekMetrics: m, recentActivities, recentWeeksMetrics } = ctx;

  const lastActivity = recentActivities[0];
  const trend = buildTrendSummary(recentWeeksMetrics);

  return `
## Athlete Goal
${goal.description}
Sport: ${goal.sport} | Level: ${goal.fitnessLevel} | Weekly target: ${goal.weeklyTargetHours}h
${goal.targetDate ? `Target date: ${formatDate(goal.targetDate)}` : ''}

## This Week So Far
- Activities: ${m.activitiesCount}
- Distance: ${m.volume.totalDistanceKm} km / ${round(goal.weeklyTargetHours * 10)} km target
- Time: ${round(m.volume.totalTimeHours, 1)}h
- Elevation: ${m.volume.totalElevationGainMeters}m
- Est. TSS: ${m.intensity.estimatedTSS}
- Intensity: ${m.intensity.intensityDistribution.easy}% easy / ${m.intensity.intensityDistribution.moderate}% moderate / ${m.intensity.intensityDistribution.hard}% hard
${m.intensity.averagePaceSecsPerKm ? `- Avg pace: ${formatPace(m.intensity.averagePaceSecsPerKm)}` : ''}
${m.intensity.averageHeartRate ? `- Avg HR: ${m.intensity.averageHeartRate} bpm` : ''}

## Fatigue Status
- ATL (acute load): ${m.fatigue.atl}
- CTL (fitness): ${m.fatigue.ctl}
- TSB (freshness): ${m.fatigue.tsb}
- Status: ${m.fatigue.fatigueLevel}
${m.fatigue.subjectiveFatigue ? `- Subjective fatigue: ${m.fatigue.subjectiveFatigue}/10` : ''}

## Compliance
- Planned: ${m.compliance.plannedSessions} sessions | Completed: ${m.compliance.completedSessions}
- Rate: ${round(m.compliance.completionRate * 100)}%
${m.compliance.missedSessionDates.length > 0 ? `- Missed: ${m.compliance.missedSessionDates.map(formatDate).join(', ')}` : ''}

## Most Recent Activity
${lastActivity ? `${lastActivity.name} — ${round(metersToKm(lastActivity.distanceMeters), 1)}km in ${formatDuration(lastActivity.movingTimeSeconds)}${lastActivity.averagePaceSecsPerKm ? ` @ ${formatPace(lastActivity.averagePaceSecsPerKm)}` : ''}${lastActivity.weatherContext ? ` (${lastActivity.weatherContext.averageTempCelsius}°C)` : ''}` : 'No recent activity'}

## 4-Week Trend
${trend}

Please provide:
1. 📊 Brief analysis of this week's training quality
2. 🔋 Fatigue assessment and recovery recommendation
3. 🎯 One specific action for the next 48h
4. ⚠️ Any red flags or concerns
`.trim();
}

function buildTrendSummary(weeks: WeeklyMetrics[]): string {
  if (weeks.length === 0) return 'Not enough history yet.';
  return weeks
    .map(
      (w, i) =>
        `Week -${i + 1}: ${w.volume.totalDistanceKm}km, ${w.activitiesCount} sessions, fatigue: ${w.fatigue.fatigueLevel}`,
    )
    .join('\n');
}
