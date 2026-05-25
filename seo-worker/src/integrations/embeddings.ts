import { pipeline, env } from '@xenova/transformers';
import { logger } from '../lib/logger.js';

env.allowLocalModels = false;
env.useBrowserCache = false;

let extractor: Awaited<ReturnType<typeof pipeline>> | null = null;

async function getExtractor() {
  if (extractor) return extractor;
  logger.info('[embeddings] loading multilingual-e5-small (first call may take ~30s)');
  extractor = await pipeline('feature-extraction', 'Xenova/multilingual-e5-small');
  return extractor;
}

export async function embed(text: string): Promise<number[]> {
  const ext = await getExtractor();
  const out = await ext(text, { pooling: 'mean', normalize: true });
  return Array.from(out.data as Float32Array);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function toPgVector(arr: number[]): string {
  return `[${arr.join(',')}]`;
}
