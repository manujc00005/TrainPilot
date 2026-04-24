import type { TrainingGoal } from '../../../types/plan.types.js';
import type { WeeklyMetrics } from '../../../types/metrics.types.js';
import type { Activity } from '../../../types/activity.types.js';
import { formatPace, round } from '../../../utils/math.utils.js';
import { metersToKm } from '../../../utils/math.utils.js';
import { formatDate } from '../../../utils/date.utils.js';

export const CHAT_SYSTEM = `LANGUAGE RULE: Always respond in the exact same language the athlete used to write their message. If they write in Spanish, respond in Spanish. Never mix languages.

You are TrainPilot, a personal endurance sports coach with full access to the athlete's real training data.

Guidelines:
- Be direct, specific, and use the athlete's actual numbers in your answers
- Keep responses under 200 words unless a detailed explanation is genuinely needed
- Do not give generic advice — everything must be grounded in their data
- If you don't have enough data to answer well, say so honestly`;

export function buildChatPrompt(
  userMessage: string,
  goal: TrainingGoal,
  recentWeeks: WeeklyMetrics[],
  recentActivities: Activity[],
  baselineSummary?: string,
): string {
  const latest = recentWeeks[0];

  return `
${baselineSummary ? `## Athlete Profile\n${baselineSummary}\n` : ''}## Training Goal
${goal.description}
Sport: ${goal.sport} | Level: ${goal.fitnessLevel} | Weekly target: ${goal.weeklyTargetHours}h
${goal.targetDate ? `Target date: ${formatDate(goal.targetDate)}` : ''}

## Current State
${latest ? `- CTL (fitness): ${latest.fatigue.ctl} | ATL (fatigue): ${latest.fatigue.atl} | TSB (freshness): ${latest.fatigue.tsb}
- Status: ${latest.fatigue.fatigueLevel}
- This week: ${latest.volume.totalDistanceKm}km, ${latest.volume.totalElevationGainMeters}m elev, ${round(latest.volume.totalTimeHours, 1)}h (${latest.activitiesCount} sessions)
${latest.intensity.averageHeartRate ? `- Avg HR this week: ${latest.intensity.averageHeartRate} bpm` : ''}
${latest.fatigue.subjectiveFatigue ? `- Subjective fatigue: ${latest.fatigue.subjectiveFatigue}/10` : ''}` : 'No data for current week yet.'}

## Recent Weeks
${recentWeeks.length > 0
  ? recentWeeks.map((w, i) =>
      `Week -${i + 1} (${formatDate(new Date(w.weekStart))}): ${w.volume.totalDistanceKm}km, ${w.volume.totalElevationGainMeters}m elev, ${w.activitiesCount} sessions, TSS: ${w.intensity.estimatedTSS}${w.intensity.averageHeartRate ? `, avg HR: ${w.intensity.averageHeartRate}bpm` : ''}, fatigue: ${w.fatigue.fatigueLevel}`
    ).join('\n')
  : 'No recent history.'}

## Last 5 Activities
${recentActivities.slice(0, 5).length > 0
  ? recentActivities.slice(0, 5).map(a =>
      `- ${formatDate(new Date(a.startDate))} — ${a.name}: ${round(metersToKm(a.distanceMeters), 1)}km, ${a.totalElevationGainMeters}m elev${a.averagePaceSecsPerKm ? `, ${formatPace(a.averagePaceSecsPerKm)}/km` : ''}${a.averageHeartRate ? `, ${a.averageHeartRate}bpm` : ''}${a.workoutType === 1 ? ' 🏁 RACE' : ''}`
    ).join('\n')
  : 'No recent activities.'}

## Athlete's Message
"${userMessage}"
`.trim();
}
