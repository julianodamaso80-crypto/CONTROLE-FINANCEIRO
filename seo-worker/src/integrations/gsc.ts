import { google } from 'googleapis';
import { getOAuthClient } from './google-auth.js';
import { config } from '../config.js';
import { logger } from '../lib/logger.js';

export interface GscQueryRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export async function searchAnalytics(opts: {
  startDate: string;
  endDate: string;
  dimensions?: string[];
  rowLimit?: number;
  siteUrl?: string;
}): Promise<GscQueryRow[]> {
  const auth = getOAuthClient();
  const webmasters = google.webmasters({ version: 'v3', auth });
  const siteUrl = opts.siteUrl ?? config.GSC_SITE_URL;
  if (!siteUrl) throw new Error('GSC_SITE_URL not configured');

  try {
    const res = await webmasters.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: opts.startDate,
        endDate: opts.endDate,
        dimensions: opts.dimensions ?? ['query'],
        rowLimit: opts.rowLimit ?? 1000,
      },
    });
    return (res.data.rows ?? []) as GscQueryRow[];
  } catch (err) {
    logger.warn({ err }, '[gsc] searchAnalytics failed');
    return [];
  }
}

export async function submitSitemap(sitemapUrl: string, siteUrl?: string): Promise<boolean> {
  const auth = getOAuthClient();
  const webmasters = google.webmasters({ version: 'v3', auth });
  const target = siteUrl ?? config.GSC_SITE_URL;
  if (!target) throw new Error('GSC_SITE_URL not configured');
  try {
    await webmasters.sitemaps.submit({ siteUrl: target, feedpath: sitemapUrl });
    return true;
  } catch (err) {
    logger.warn({ err, sitemapUrl }, '[gsc] submitSitemap failed');
    return false;
  }
}

export async function urlInspection(_articleUrl: string, _siteUrl?: string): Promise<unknown> {
  return { note: 'URL inspection requires Indexing API setup; defer to sitemap + manual GSC inspection' };
}
