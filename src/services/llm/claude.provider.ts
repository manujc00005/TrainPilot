import Anthropic from '@anthropic-ai/sdk';
import { config } from '../../config/index.js';
import type { LLMProvider, LLMResponse } from '../../types/llm.types.js';
import { logger } from '../../utils/logger.js';

export class ClaudeProvider implements LLMProvider {
  private client: Anthropic;

  constructor() {
    if (!config.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is required');
    this.client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
  }

  async complete(systemPrompt: string, userPrompt: string): Promise<LLMResponse> {
    const response = await this.client.messages.create({
      model: config.LLM_MODEL,
      max_tokens: 1024,
      system: [
        {
          type: 'text',
          text: systemPrompt,
          // Cache the system prompt — it rarely changes, saves ~80% on input tokens
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: userPrompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') throw new Error('Unexpected response type from Claude');

    const usage = response.usage as Anthropic.Usage & {
      cache_read_input_tokens?: number;
      cache_creation_input_tokens?: number;
    };

    logger.debug(
      {
        model: response.model,
        inputTokens: usage.input_tokens,
        outputTokens: usage.output_tokens,
        cacheRead: usage.cache_read_input_tokens ?? 0,
        cacheCreation: usage.cache_creation_input_tokens ?? 0,
      },
      'LLM call complete',
    );

    return {
      content: content.text,
      model: response.model,
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      cacheReadTokens: usage.cache_read_input_tokens ?? 0,
      cacheCreationTokens: usage.cache_creation_input_tokens ?? 0,
    };
  }
}
