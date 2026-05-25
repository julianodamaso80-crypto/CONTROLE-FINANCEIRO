import { config } from '../config.js';
import { logger } from '../lib/logger.js';

export async function submit(urls: string[]): Promise<boolean> {
  if (!config.INDEXNOW_KEY || urls.length === 0) return false;
  const firstUrl = urls[0];
  const host = new URL(firstUrl).host;

  const body = {
    host,
    key: config.INDEXNOW_KEY,
    keyLocation: `https://${host}/${config.INDEXNOW_KEY}.txt`,
    urlList: urls,
  };

  try {
    const res = await fetch('https://api.indexnow.org/IndexNow', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.status >= 200 && res.status < 300;
  } catch (err) {
    logger.warn({ err, urls: urls.length }, '[indexnow] submit failed');
    return false;
  }
}
