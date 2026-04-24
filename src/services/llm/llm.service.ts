import { config } from '../../config/index.js';
import { ClaudeProvider } from './claude.provider.js';
import { OpenAIProvider } from './openai.provider.js';
import { getStorage } from '../storage/index.js';
import { generateId } from '../../utils/hash.utils.js';
import { logger } from '../../utils/logger.js';
import type { LLMContext, LLMContextType, LLMProvider, LLMResponse } from '../../types/llm.types.js';
import type { AthleteBaseline } from '../../types/baseline.types.js';
import type { TrainingGoal } from '../../types/plan.types.js';
import {
  DAILY_ANALYSIS_SYSTEM,
  buildDailyAnalysisPrompt,
} from './prompts/daily-analysis.prompt.js';
import {
  WEEKLY_PLANNING_SYSTEM,
  buildWeeklyPlanningPrompt,
} from './prompts/weekly-planning.prompt.js';
import {
  COMPLIANCE_CHECK_SYSTEM,
  buildComplianceCheckPrompt,
} from './prompts/compliance-check.prompt.js';
import { BASELINE_SYSTEM, buildBaselinePrompt } from './prompts/baseline.prompt.js';
import { CHAT_SYSTEM, buildChatPrompt } from './prompts/chat.prompt.js';
import type { WeeklyMetrics } from '../../types/metrics.types.js';
import type { Activity } from '../../types/activity.types.js';

let provider: LLMProvider | null = null;

function getProvider(): LLMProvider {
  if (!provider) {
    if (config.LLM_PROVIDER === 'claude') {
      provider = new ClaudeProvider();
    } else {
      provider = new OpenAIProvider();
    }
  }
  return provider;
}

export async function generateDailyAnalysis(ctx: LLMContext): Promise<string> {
  return runLLM(ctx.contextType, DAILY_ANALYSIS_SYSTEM, buildDailyAnalysisPrompt(ctx));
}

export async function generateWeeklyPlan(ctx: LLMContext, nextWeekStart: Date): Promise<string> {
  return runLLM(ctx.contextType, WEEKLY_PLANNING_SYSTEM, buildWeeklyPlanningPrompt(ctx, nextWeekStart));
}

export async function generateComplianceCheck(ctx: LLMContext): Promise<string> {
  return runLLM(ctx.contextType, COMPLIANCE_CHECK_SYSTEM, buildComplianceCheckPrompt(ctx));
}

export async function generateChatResponse(
  userMessage: string,
  goal: TrainingGoal,
  recentWeeks: WeeklyMetrics[],
  recentActivities: Activity[],
  baselineSummary?: string,
): Promise<string> {
  return runLLM('chat', CHAT_SYSTEM, buildChatPrompt(userMessage, goal, recentWeeks, recentActivities, baselineSummary));
}

export async function generateBaseline(
  stats: Omit<AthleteBaseline, 'summaryText' | 'id' | 'generatedAt'>,
  goal: TrainingGoal,
): Promise<string> {
  return runLLM('baseline', BASELINE_SYSTEM, buildBaselinePrompt(stats, goal));
}

async function runLLM(
  contextType: LLMContextType,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const llm = getProvider();
  let result: LLMResponse;

  try {
    result = await llm.complete(systemPrompt, userPrompt);
  } catch (err) {
    logger.error({ err }, 'LLM call failed');
    throw err;
  }

  const storage = getStorage();
  await storage.saveLLMLog({
    id: generateId(),
    athleteId: config.STRAVA_ATHLETE_ID,
    contextType,
    model: result.model,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    cacheReadTokens: result.cacheReadTokens,
    cacheCreationTokens: result.cacheCreationTokens,
    response: result.content,
    createdAt: new Date(),
  });

  logger.info(
    { contextType, tokens: result.inputTokens + result.outputTokens },
    'LLM response generated',
  );

  return result.content;
}
