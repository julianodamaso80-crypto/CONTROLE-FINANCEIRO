import { config } from '../config.js';
import { exec, query } from '../db/pg.js';
import { startAgentRun, finishAgentRun } from '../db/repositories/agent-runs.js';
import { logger } from '../lib/logger.js';

interface MetricsRow {
  article_id: string;
  slug: string;
  published_at: string | null;
  impressions: number;
  clicks: number;
  ctr: number;
  avg_position: number;
}

export async function runGscAnalyst(): Promise<{ created: number }> {
  const runId = await startAgentRun({ agent_id: '13-gsc-analyst', triggered_by: 'cron', input: {} });

  const rows = await query<MetricsRow>(
    `SELECT a.id AS article_id,
            a.slug,
            a.published_at,
            COALESCE(SUM(CASE WHEN m.source='gsc' THEN m.impressions ELSE 0 END), 0)::int AS impressions,
            COALESCE(SUM(CASE WHEN m.source='gsc' THEN m.clicks ELSE 0 END), 0)::int AS clicks,
            COALESCE(AVG(CASE WHEN m.source='gsc' THEN m.ctr END), 0)::float AS ctr,
            COALESCE(AVG(CASE WHEN m.source='gsc' THEN m.avg_position END), 0)::float AS avg_position
       FROM seo.articles a
  LEFT JOIN seo.metrics_daily m ON m.article_id = a.id AND m.date >= current_date - interval '28 days'
      WHERE a.company_id = $1 AND a.status = 'published'
      GROUP BY a.id`,
    [config.COMPANY_ID],
  );

  let created = 0;

  for (const r of rows) {
    if (r.impressions >= 200 && r.ctr < 0.02 && r.avg_position <= 15) {
      await insertRec(r.article_id, 4, 'improve_ctr',
        `CTR baixo (${(r.ctr * 100).toFixed(1)}%) com ${r.impressions} impressões e posição ${r.avg_position.toFixed(1)}`,
        'reescrever title + meta description');
      created++;
    }
    if (r.avg_position >= 8 && r.avg_position <= 20 && r.impressions >= 100) {
      await insertRec(r.article_id, 3, 'expand_content',
        `posição ${r.avg_position.toFixed(1)} com ${r.impressions} impressões`,
        'expandir conteúdo com 2 H2s extras + 1 dado oficial recente');
      created++;
    }
    if (r.published_at && Date.now() - new Date(r.published_at).getTime() > 14 * 24 * 3600 * 1000 && r.impressions === 0) {
      await insertRec(r.article_id, 5, 'fix_indexing',
        `0 impressões em 14+ dias após publicação`,
        'reenviar pra GSC + Bing + IndexNow, validar canonical e robots');
      created++;
    }
  }

  await finishAgentRun({ run_id: runId, output: { created } });
  logger.info({ created }, '[13-gsc-analyst] done');
  return { created };
}

async function insertRec(articleId: string, priority: number, type: string, reason: string, rec: string) {
  await exec(
    `INSERT INTO seo.recommendations (type, article_id, priority, recommendation, reason)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT DO NOTHING`,
    [type, articleId, priority, rec, reason],
  );
}
