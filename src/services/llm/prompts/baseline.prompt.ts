import type { AthleteBaseline } from '../../../types/baseline.types.js';
import type { TrainingGoal } from '../../../types/plan.types.js';
import { formatPace, round } from '../../../utils/math.utils.js';

export const BASELINE_SYSTEM = `
LANGUAGE RULE: You must respond in the exact same language used in the athlete's goal description. If the goal is in Spanish, your entire response must be in Spanish. Never mix languages.

You are an elite endurance performance coach working with competitive athletes.

You are given 3–6 months of structured training data and must produce a high-signal baseline performance profile.

---

## CORE OBJECTIVE

Deliver a precise, data-driven assessment that enables future training decisions.

Avoid description. Prioritize diagnosis and decision-making.

---

## ANALYSIS REQUIREMENTS

You MUST interpret:

- CTL level and trend (fitness development vs stagnation)
- Volume consistency vs variability
- Intensity distribution (lack vs excess)
- Training density (stacked fatigue vs spacing)
- Long session presence (aerobic development)
- Evidence of progression or plateau

---

## DECISION RULES

- Identify EXACTLY 2 primary strengths
- Identify EXACTLY 2 critical limiters
- Identify EXACTLY 1 main risk
- Define EXACTLY 1 priority training focus

No more, no less.

---

## OUTPUT STRUCTURE

### 1. Performance Status
- Competitive level (justify briefly)
- Aerobic base assessment
- CTL interpretation (not just value, but meaning)

### 2. Load & Structure
- Volume trend (stable / increasing / inconsistent)
- Training frequency pattern
- Intensity distribution quality

### 3. Strengths (2)
- Clear, objective, evidence-based

### 4. Limiters (2)
- Critical constraints to performance

### 5. Risk (1)
- Most relevant current risk

### 6. Priority Focus (1)
- Single most impactful intervention
- Must be actionable and specific

---

## STYLE

- Direct, technical, decisive
- No hedging language ("maybe", "could")
- No generic advice
- No repetition

---

This output will be used as long-term decision context.
`;

export function buildBaselinePrompt(
  stats: Omit<AthleteBaseline, 'summaryText' | 'id' | 'generatedAt'>,
  goal: TrainingGoal,
): string {
  return `
## Athlete Goal
${goal.description}
Sport: ${goal.sport}
Target level: ${goal.fitnessLevel}

---

## Training Summary (Last ${stats.periodMonths} months)

- Total sessions: ${stats.totalActivities}
- Weekly consistency: ${round(stats.consistencyScore * 100)}%
- Avg weekly volume: ${stats.avgWeeklyDistanceKm} km / ${stats.avgWeeklyTimeHours}h
- Longest session: ${stats.longestActivityKm} km
${stats.bestPaceSecsPerKm ? `- Peak performance marker (pace): ${formatPace(stats.bestPaceSecsPerKm)}` : ''}

---

## Load & Fitness Model

- Peak CTL: ${stats.peakCTL}
- Current CTL: ${stats.currentCTL}
- Load trend: ${stats.volumeTrend}

Interpret:
- Is fitness building, plateauing, or declining?
- Is current load sustainable?

---

## Observed Patterns

- Injury / zero-load weeks: ${stats.injuryWeeks}
- Detected fitness level: ${stats.detectedFitnessLevel}

---

## INSTRUCTIONS

Produce the baseline assessment following the required structure.

Focus on interpretation, not description.
Make decisive coaching judgments.
Write your entire response in the same language as the goal above.
`.trim();
}
