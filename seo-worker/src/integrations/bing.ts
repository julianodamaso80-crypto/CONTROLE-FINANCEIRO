import { config } from '../config.js';
import { logger } from '../lib/logger.js';

const BING_BASE = 'https://ssl.bing.com/webmaster/api.svc/json';

export async function submitUrl(articleUrl: string, siteUrl?: string): Promise<boolean> {
  if (!config.BING_API_KEY) return false;
  const target = siteUrl ?? config.BING_SITE_URL;
  if (!target) throw new Error('BING_SITE_URL not configured');

  try {
    const res = await fetch(`${BING_BASE}/SubmitUrl?apikey=${config.BING_API_KEY}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ siteUrl: target, url: articleUrl }),
    });
    return res.ok;
  } catch (err) {
    logger.warn({ err, articleUrl }, '[bing] submitUrl failed');
    return false;
  }
}

export async function submitSitemap(sitemapUrl: string, siteUrl?: string): Promise<boolean> {
  if (!config.BING_API_KEY) return false;
  const target = siteUrl ?? config.BING_SITE_URL;
  if (!target) throw new Error('BING_SITE_URL not configured');

  try {
    const res = await fetch(`${BING_BASE}/SubmitFeed?apikey=${config.BING_API_KEY}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ siteUrl: target, feedUrl: sitemapUrl }),
    });
    return res.ok;
  } catch (err) {
    logger.warn({ err, sitemapUrl }, '[bing] submitSitemap failed');
    return false;
  }
}
