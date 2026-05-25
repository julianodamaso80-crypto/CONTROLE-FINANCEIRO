import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText } from 'ai';
import { config, resolveLlmModel } from '../config.js';
import { logger } from '../lib/logger.js';

const openrouter = config.OPENROUTER_API_KEY
  ? createOpenRouter({ apiKey: config.OPENROUTER_API_KEY })
  : null;

export interface LlmResult {
  text: string;
  cost_usd: number;
  tokens_in: number;
  tokens_out: number;
}

export async function complete(opts: {
  tier: 'main' | 'light';
  system: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  max_tokens: number;
  temperature?: number;
  timeout_ms?: number;
}): Promise<LlmResult> {
  if (!openrouter) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }

  const { model } = resolveLlmModel(opts.tier);

  try {
    const result = await generateText({
      model: openrouter(model),
      system: opts.system,
      messages: opts.messages,
      maxTokens: opts.max_tokens,
      temperature: opts.temperature ?? 0.7,
      abortSignal: AbortSignal.timeout(opts.timeout_ms ?? 120_000),
    });

    const cost_usd =
      (result.usage.promptTokens / 1_000_000) * 0.075 +
      (result.usage.completionTokens / 1_000_000) * 0.3;

    return {
      text: result.text,
      cost_usd,
      tokens_in: result.usage.promptTokens,
      tokens_out: result.usage.completionTokens,
    };
  } catch (err) {
    logger.error({ err, model }, '[llm] completion failed');
    throw err;
  }
}

export function extractJsonBlock(text: string): unknown {
  const fence = text.match(/```(?:json)?\s*\n([\s\S]+?)\n```/);
  const candidate = fence ? fence[1] : text;
  const start = candidate.indexOf('{');
  const arrayStart = candidate.indexOf('[');
  const idx =
    start === -1 ? arrayStart : arrayStart === -1 ? start : Math.min(start, arrayStart);
  if (idx === -1) throw new Error('no JSON block found');
  const slice = candidate.slice(idx);
  return JSON.parse(slice);
}
