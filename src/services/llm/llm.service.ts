import { config } from '../../config/index.js';
import { ClaudeProvider } from './claude.provider.js';
import { getStorage } from '../storage/index.js';
import { generateId } from '../../utils/hash.utils.js';
import { logger } from '../../utils/logger.js';
import type { LLMContext, LLMProvider, LLMResponse } from '../../types/llm.types.js';
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

let provider: LLMProvider | null = null;

function getProvider(): LLMProvider {
  if (!provider) {
    if (config.LLM_PROVIDER === 'claude') {
      provider = new ClaudeProvider();
    } else {
      throw new Error('openai provider not yet implemented — use LLM_PROVIDER=claude');
    }
  }
  return provider;
}

export async function generateDailyAnalysis(ctx: LLMContext): Promise<string> {
  return runLLM(ctx, DAILY_ANALYSIS_SYSTEM, buildDailyAnalysisPrompt(ctx));
}

export async function generateWeeklyPlan(ctx: LLMContext, nextWeekStart: Date): Promise<string> {
  return runLLM(ctx, WEEKLY_PLANNING_SYSTEM, buildWeeklyPlanningPrompt(ctx, nextWeekStart));
}

export async function generateComplianceCheck(ctx: LLMContext): Promise<string> {
  return runLLM(ctx, COMPLIANCE_CHECK_SYSTEM, buildComplianceCheckPrompt(ctx));
}

async function runLLM(ctx: LLMContext, systemPrompt: string, userPrompt: string): Promise<string> {
  const llm = getProvider();
  let result: LLMResponse;

  try {
    result = await llm.complete(systemPrompt, userPrompt);
  } catch (err) {
    logger.error({ err }, 'LLM call failed');
    throw err;
  }

  // Persist audit log
  const storage = getStorage();
  await storage.saveLLMLog({
    id: generateId(),
    athleteId: config.STRAVA_ATHLETE_ID,
    contextType: ctx.contextType,
    model: result.model,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    cacheReadTokens: result.cacheReadTokens,
    cacheCreationTokens: result.cacheCreationTokens,
    response: result.content,
    createdAt: new Date(),
  });

  logger.info(
    { contextType: ctx.contextType, tokens: result.inputTokens + result.outputTokens },
    'LLM response generated',
  );

  return result.content;
}
