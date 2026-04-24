import type { LLMContext } from '../../../types/llm.types.js';
import { formatDate } from '../../../utils/date.utils.js';
import { round } from '../../../utils/math.utils.js';
import { addDays } from 'date-fns';

export const WEEKLY_PLANNING_SYSTEM = `LANGUAGE RULE: The "description" field of every session must be written in the exact same language as the athlete's goal. If the goal is in Spanish, all descriptions must be in Spanish.

You are an expert endurance sports coach specializing in training plan design.

Generate a concrete weekly training plan with exactly 7 days. For each training day specify:
- Day name and date
- Session type: easy | tempo | intervals | long_run | recovery | strength | rest
- Target distance (km) or duration (minutes)
- Target pace (min/km) if applicable
- Brief description of the session goal (in the athlete's goal language)

Consider the athlete's current fatigue, fitness trend, and weekly target hours.
Apply 80/20 training principle (80% easy, 20% hard).

Respond with a valid JSON array — no extra text, just the JSON.

Format:
[
  {
    "dayOfWeek": 1,
    "date": "YYYY-MM-DD",
    "sessionType": "easy|tempo|intervals|long_run|recovery|strength|rest",
    "targetDistanceKm": 10,
    "targetDurationMinutes": 60,
    "targetPaceSecsPerKm": 330,
    "description": "Easy aerobic base run, keep HR under 140bpm"
  }
]`;

export function buildWeeklyPlanningPrompt(ctx: LLMContext, nextWeekStart: Date): string {
  const { goal, currentWeekMetrics: m, recentWeeksMetrics } = ctx;

  const days = Array.from({ length: 7 }, (_, i) => ({
    dayOfWeek: i + 1,
    date: formatDate(addDays(nextWeekStart, i)),
  }));

  return `
${ctx.baselineSummary ? `## Athlete Profile\n${ctx.baselineSummary}\n` : ''}## Athlete Goal
${goal.description}
Sport: ${goal.sport} | Level: ${goal.fitnessLevel} | Weekly target: ${goal.weeklyTargetHours}h
${goal.targetDate ? `Target date: ${formatDate(goal.targetDate)}` : ''}

## Current Fitness State
- ATL: ${m.fatigue.atl} | CTL: ${m.fatigue.ctl} | TSB: ${m.fatigue.tsb}
- Status: ${m.fatigue.fatigueLevel}
- This week: ${m.volume.totalDistanceKm}km in ${round(m.volume.totalTimeHours, 1)}h

## Recent Weeks
${recentWeeksMetrics.map((w, i) => `Week -${i + 1}: ${w.volume.totalDistanceKm}km, TSS: ${w.intensity.estimatedTSS}`).join('\n')}

## Compliance This Week
Completed ${m.compliance.completedSessions}/${m.compliance.plannedSessions} sessions (${round(m.compliance.completionRate * 100)}%)

## Next Week Dates
${days.map((d) => `Day ${d.dayOfWeek} (${d.date})`).join('\n')}

Generate the training plan for next week. Return only the JSON array.
All "description" values must be written in the same language as the goal above.
`.trim();
}
