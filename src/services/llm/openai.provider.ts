import OpenAI from 'openai';
import { config } from '../../config/index.js';
import type { LLMProvider, LLMResponse } from '../../types/llm.types.js';
import { logger } from '../../utils/logger.js';

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;

  constructor() {
    if (!config.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is required');
    this.client = new OpenAI({ apiKey: config.OPENAI_API_KEY });
  }

  async complete(systemPrompt: string, userPrompt: string): Promise<LLMResponse> {
    const response = await this.client.chat.completions.create({
      model: config.LLM_MODEL,
      max_tokens: 1024,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Empty response from OpenAI');

    const usage = response.usage;
    logger.debug(
      { model: response.model, inputTokens: usage?.prompt_tokens, outputTokens: usage?.completion_tokens },
      'LLM call complete',
    );

    return {
      content,
      model: response.model,
      inputTokens: usage?.prompt_tokens ?? 0,
      outputTokens: usage?.completion_tokens ?? 0,
      cacheReadTokens: 0,
      cacheCreationTokens: 0,
    };
  }
}
