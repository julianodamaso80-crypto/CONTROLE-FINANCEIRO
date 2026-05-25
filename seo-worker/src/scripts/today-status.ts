import { query, closePool } from '../db/pg.js';
import { config } from '../config.js';

interface CategoryRow { category: string; count: number }
interface ArticleRow { id: string; slug: string; title: string; status: string; review_status: string | null; word_count: number | null; created_at: string }
interface RunRow { agent_id: string; status: string; error: string | null; finished_at: string | null }

async function main() {
  const todayArticles = await query<ArticleRow>(
    `SELECT id, slug, title, status, review_status, word_count, created_at
       FROM seo.articles
      WHERE company_id = $1 AND created_at >= date_trunc('day', now())
      ORDER BY created_at DESC`,
    [config.COMPANY_ID],
  );

  const byCategory = await query<CategoryRow>(
    `SELECT category, COUNT(*)::int AS count
       FROM seo.articles
      WHERE company_id = $1 AND created_at >= date_trunc('day', now())
      GROUP BY category`,
    [config.COMPANY_ID],
  );

  const briefingsByCat = await query<CategoryRow>(
    `SELECT t.category, COUNT(*)::int AS count
       FROM seo.briefings b
       JOIN seo.topics t ON t.id = b.topic_id
      WHERE b.id NOT IN (SELECT briefing_id FROM seo.articles WHERE briefing_id IS NOT NULL)
        AND t.decision = 'APROVAR_ARTIGO_NOVO'
      GROUP BY t.category`,
  );

  const recentRuns = await query<RunRow>(
    `SELECT agent_id, status, error, finished_at FROM seo.agent_runs
      WHERE started_at >= date_trunc('day', now())
      ORDER BY started_at DESC
      LIMIT 30`,
  );

  // eslint-disable-next-line no-console
  console.log(JSON.stringify({
    today_articles: todayArticles.length,
    articles_today_by_category: byCategory,
    briefings_in_stock_by_category: briefingsByCat,
    today_articles_list: todayArticles,
    recent_runs: recentRuns,
  }, null, 2));

  await closePool();
}

main().catch(async (err) => {
  // eslint-disable-next-line no-console
  console.error('today-status failed', err);
  await closePool();
  process.exit(1);
});
