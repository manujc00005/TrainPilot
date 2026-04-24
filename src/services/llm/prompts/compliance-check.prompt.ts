import type { LLMContext } from '../../../types/llm.types.js';
import { formatDate } from '../../../utils/date.utils.js';
import { round } from '../../../utils/math.utils.js';

export const COMPLIANCE_CHECK_SYSTEM = `You are a supportive but honest sports coach checking in on missed training sessions.

Your tone should be:
- Empathetic, not judgmental
- Curious about reasons (life, injury, fatigue, motivation)
- Constructive — always offer a path forward

Keep responses under 200 words. Always end with a specific question or actionable suggestion.
Respond in the same language as the athlete's goal.`;

export function buildComplianceCheckPrompt(ctx: LLMContext): string {
  const { goal, missedSessions = [], currentWeekMetrics: m, userFeedback } = ctx;

  return `
## Athlete Goal
${goal.description} | Level: ${goal.fitnessLevel}

## Missed Sessions Today
${
  missedSessions.length === 0
    ? 'All sessions completed! Great work.'
    : missedSessions
        .map(
          (s) =>
            `- ${formatDate(new Date(s.weekStart))} Day ${s.dayOfWeek}: ${s.sessionType}${s.targetDistanceKm ? ` (${s.targetDistanceKm}km)` : ''}${s.targetDurationMinutes ? ` (${s.targetDurationMinutes}min)` : ''} — ${s.description}`,
        )
        .join('\n')
}

## Week Status
- Compliance: ${round(m.compliance.completionRate * 100)}% (${m.compliance.completedSessions}/${m.compliance.plannedSessions})
- Fatigue: ${m.fatigue.fatigueLevel} (TSB: ${m.fatigue.tsb})
${m.fatigue.subjectiveFatigue ? `- Athlete's own fatigue rating: ${m.fatigue.subjectiveFatigue}/10` : ''}
${userFeedback ? `\n## Athlete's Feedback\n"${userFeedback}"` : ''}

${
  missedSessions.length > 0
    ? 'Acknowledge the missed sessions with empathy, assess if they should be rescheduled or dropped based on current fatigue, and suggest what to do next.'
    : 'Congratulate the athlete and give a brief motivational note for tomorrow.'
}
`.trim();
}
