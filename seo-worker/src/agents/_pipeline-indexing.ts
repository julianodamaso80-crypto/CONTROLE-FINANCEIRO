import { config } from '../config.js';
import { exec, query } from '../db/pg.js';
import { logger } from '../lib/logger.js';
import { checkUrl } from '../integrations/sitemap.js';
import { runSitemap } from './10-sitemap.js';
import { runGoogleIndexing } from './11-google-indexing.js';
import { runBingIndexNow } from './12-bing-indexnow.js';

export async function runRecheckPendingIndexing(): Promise<{ promoted: number; indexed: number }> {
  const awaiting = await query<{ id: string; slug: string; url: string }>(
    `SELECT id, slug, url FROM seo.articles
      WHERE company_id = $1 AND status = 'awaiting_pr_merge'
      ORDER BY updated_at ASC
      LIMIT 20`,
    [config.COMPANY_ID],
  );

  let promoted = 0;
  for (const a of awaiting) {
    const r = await checkUrl(a.url);
    if (r.ok) {
      await exec(
        `UPDATE seo.articles SET status='published', published_at = COALESCE(published_at, now()) WHERE id = $1`,
        [a.id],
      );
      promoted++;
      logger.info({ articleId: a.id, slug: a.slug }, '[indexing] promoted to published');
    }
  }

  const toIndex = await query<{ id: string; url: string }>(
    `SELECT a.id, a.url FROM seo.articles a
      WHERE a.company_id = $1
        AND a.status = 'published'
        AND a.published_at >= now() - interval '24 hours'
        AND NOT EXISTS (
          SELECT 1 FROM seo.indexing_log l
           WHERE l.article_id = a.id AND l.channel = 'indexnow'
        )
      LIMIT 10`,
    [config.COMPANY_ID],
  );

  let indexed = 0;
  for (const a of toIndex) {
    try {
      await runSitemap(a.id, a.url);
      await runGoogleIndexing(a.id, a.url);
      await runBingIndexNow(a.id, a.url);
      indexed++;
    } catch (err) {
      logger.warn({ err, articleId: a.id }, '[indexing] failed for one article');
    }
  }

  return { promoted, indexed };
}
