import { google } from 'googleapis';
import { config } from '../config.js';
import { exec, query } from '../db/pg.js';
import { getOAuthClient } from '../integrations/google-auth.js';
import { searchAnalytics } from '../integrations/gsc.js';
import { startAgentRun, finishAgentRun } from '../db/repositories/agent-runs.js';
import { logger } from '../lib/logger.js';

interface Ga4Row {
  pagePath: string;
  sessions: number;
  engagedSessions: number;
  engagementRate: number;
  avgEngagementTimeSec: number;
  conversions: number;
}

async function fetchGa4(): Promise<Ga4Row[]> {
  if (!config.GA4_PROPERTY_ID || !config.GOOGLE_REFRESH_TOKEN) return [];
  try {
    const auth = getOAuthClient();
    const analyticsdata = google.analyticsdata({ version: 'v1beta', auth });
    const res = await analyticsdata.properties.runReport({
      property: `properties/${config.GA4_PROPERTY_ID}`,
      requestBody: {
        dateRanges: [{ startDate: 'yesterday', endDate: 'yesterday' }],
        dimensions: [{ name: 'pagePath' }],
        metrics: [
          { name: 'sessions' },
          { name: 'engagedSessions' },
          { name: 'engagementRate' },
          { name: 'averageSessionDuration' },
          { name: 'conversions' },
        ],
        dimensionFilter: { filter: { fieldName: 'pagePath', stringFilter: { matchType: 'BEGINS_WITH', value: '/blog/' } } },
      },
    });
    return (res.data.rows ?? []).map((r) => ({
      pagePath: r.dimensionValues?.[0]?.value ?? '',
      sessions: Number(r.metricValues?.[0]?.value ?? 0),
      engagedSessions: Number(r.metricValues?.[1]?.value ?? 0),
      engagementRate: Number(r.metricValues?.[2]?.value ?? 0),
      avgEngagementTimeSec: Number(r.metricValues?.[3]?.value ?? 0),
      conversions: Number(r.metricValues?.[4]?.value ?? 0),
    }));
  } catch (err) {
    logger.warn({ err }, '[15-reporting] GA4 fetch failed');
    return [];
  }
}

export async function runReporting(): Promise<{ gsc: number; ga4: number }> {
  const runId = await startAgentRun({ agent_id: '15-reporting', triggered_by: 'cron', input: {} });

  const articles = await query<{ id: string; url: string; slug: string }>(
    `SELECT id, url, slug FROM seo.articles WHERE company_id = $1 AND status='published'`,
    [config.COMPANY_ID],
  );
  const byUrl = new Map(articles.map((a) => [a.url, a.id] as const));
  const bySlug = new Map(articles.map((a) => [`/blog/${a.slug}`, a.id] as const));

  const yesterday = new Date(Date.now() - 24 * 3600 * 1000).toISOString().slice(0, 10);
  const gscRows = await searchAnalytics({ startDate: yesterday, endDate: yesterday, dimensions: ['page'], rowLimit: 500 });

  let gscCount = 0;
  for (const r of gscRows) {
    const page = r.keys?.[0];
    if (!page) continue;
    const articleId = byUrl.get(page);
    if (!articleId) continue;
    await exec(
      `INSERT INTO seo.metrics_daily (article_id, url, date, source, impressions, clicks, ctr, avg_position)
       VALUES ($1, $2, $3, 'gsc', $4, $5, $6, $7)
       ON CONFLICT (article_id, url, date, source) DO UPDATE
         SET impressions = EXCLUDED.impressions,
             clicks = EXCLUDED.clicks,
             ctr = EXCLUDED.ctr,
             avg_position = EXCLUDED.avg_position`,
      [articleId, page, yesterday, r.impressions, r.clicks, r.ctr, r.position],
    );
    gscCount++;
  }

  const ga4Rows = await fetchGa4();
  let ga4Count = 0;
  for (const r of ga4Rows) {
    const articleId = bySlug.get(r.pagePath);
    if (!articleId) continue;
    const url = `${config.SITE_URL}${r.pagePath}`;
    await exec(
      `INSERT INTO seo.metrics_daily (article_id, url, date, source, ga4_sessions, ga4_engaged_sessions, ga4_engagement_rate, ga4_avg_engagement_time_sec, ga4_conversions)
       VALUES ($1, $2, $3, 'ga4', $4, $5, $6, $7, $8)
       ON CONFLICT (article_id, url, date, source) DO UPDATE
         SET ga4_sessions = EXCLUDED.ga4_sessions,
             ga4_engaged_sessions = EXCLUDED.ga4_engaged_sessions,
             ga4_engagement_rate = EXCLUDED.ga4_engagement_rate,
             ga4_avg_engagement_time_sec = EXCLUDED.ga4_avg_engagement_time_sec,
             ga4_conversions = EXCLUDED.ga4_conversions`,
      [articleId, url, yesterday, r.sessions, r.engagedSessions, r.engagementRate, r.avgEngagementTimeSec, r.conversions],
    );
    ga4Count++;
  }

  await finishAgentRun({ run_id: runId, output: { gsc: gscCount, ga4: ga4Count } });
  return { gsc: gscCount, ga4: ga4Count };
}
