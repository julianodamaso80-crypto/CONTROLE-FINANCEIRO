import { logger } from '../lib/logger.js';
import { config } from '../config.js';

const FALLBACK_COVERS = [
  'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&q=80',
  'https://images.unsplash.com/photo-1579621970795-87facc2f976d?w=1200&q=80',
  'https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=1200&q=80',
  'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1200&q=80',
  'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&q=80',
];

export interface CoverImage {
  url: string;
  ratios: { '1:1': string; '4:3': string; '16:9': string };
  source: 'gemini' | 'unsplash' | 'fallback';
}

function pickFallback(slug: string): string {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) hash = (hash + slug.charCodeAt(i)) | 0;
  return FALLBACK_COVERS[Math.abs(hash) % FALLBACK_COVERS.length];
}

export async function generateCover(opts: {
  slug: string;
  title: string;
  category: string;
}): Promise<CoverImage> {
  void config;
  const base = pickFallback(opts.slug);
  logger.info({ slug: opts.slug }, '[image-gen] using Unsplash fallback (Gemini Image disabled for v1)');
  return {
    url: base,
    ratios: {
      '1:1': `${base}&w=800&h=800&fit=crop`,
      '4:3': `${base}&w=1200&h=900&fit=crop`,
      '16:9': `${base}&w=1200&h=675&fit=crop`,
    },
    source: 'unsplash',
  };
}
