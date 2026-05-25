import { logger } from '../lib/logger.js';

export async function checkUrl(url: string): Promise<{ ok: boolean; status: number }> {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    return { ok: res.ok, status: res.status };
  } catch (err) {
    logger.warn({ err, url }, '[sitemap] checkUrl failed');
    return { ok: false, status: 0 };
  }
}
