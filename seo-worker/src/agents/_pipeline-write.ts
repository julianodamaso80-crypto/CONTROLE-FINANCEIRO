import { config } from '../config.js';
import { query, queryOne } from '../db/pg.js';
import { logger } from '../lib/logger.js';
import { queueResearch, queuePublish } from '../queue.js';
import { runWriter } from './05-writer.js';
import { runLegalReviewer } from './06-legal-reviewer.js';
import { runOnPageSeo } from './07-onpage-seo.js';
import { runDesignRepurpose } from './08-design-repurpose.js';
import type { Category } from './_types.js';

const REQUIRED_SLOTS: Category[] = ['controle-de-gastos', 'orcamento-familiar', 'whatsapp-financeiro'];
const BONUS_SLOT: Category = 'educacao-financeira';
const MIN_BRIEFINGS_PER_CATEGORY = 2;

interface PendingBriefing {
  briefing_id: string;
  category: Category;
  topic_id: string;
}

async function getPendingBriefings(): Promise<PendingBriefing[]> {
  return query<PendingBriefing>(
    `SELECT b.id AS briefing_id, t.category, t.id AS topic_id
       FROM seo.briefings b
       JOIN seo.topics t ON t.id = b.topic_id
      WHERE b.id NOT IN (SELECT briefing_id FROM seo.articles WHERE briefing_id IS NOT NULL)
        AND t.decision = 'APROVAR_ARTIGO_NOVO'
      ORDER BY b.created_at ASC`,
  );
}

async function checkRefillNeeded(): Promise<boolean> {
  const rows = await query<{ category: Category; count: number }>(
    `SELECT t.category, COUNT(*)::int AS count
       FROM seo.briefings b
       JOIN seo.topics t ON t.id = b.topic_id
      WHERE b.id NOT IN (SELECT briefing_id FROM seo.articles WHERE briefing_id IS NOT NULL)
        AND t.decision = 'APROVAR_ARTIGO_NOVO'
      GROUP BY t.category`,
  );

  const counts = new Map(rows.map((r) => [r.category, r.count]));
  for (const cat of REQUIRED_SLOTS) {
    const c = counts.get(cat) ?? 0;
    if (c < MIN_BRIEFINGS_PER_CATEGORY) {
      logger.warn({ category: cat, count: c }, '[pipeline-write] refill needed for category');
      return true;
    }
  }
  return false;
}

async function publishedTodayByCategory(): Promise<Record<string, number>> {
  const rows = await query<{ category: string; count: number }>(
    `SELECT category, COUNT(*)::int AS count
       FROM seo.articles
      WHERE company_id = $1
        AND created_at >= date_trunc('day', now())
        AND status IN ('in_review','awaiting_pr_merge','published')
      GROUP BY category`,
    [config.COMPANY_ID],
  );
  const out: Record<string, number> = {};
  for (const r of rows) out[r.category] = r.count;
  return out;
}

export async function runDailyWritePipeline(opts: { limit: number }): Promise<{
  written: number;
  refill_triggered: boolean;
  details: { briefingId: string; articleId: string | null; status: string }[];
}> {
  const refillNeeded = await checkRefillNeeded();
  if (refillNeeded) {
    await queueResearch.add('refill', { triggered_by: 'auto-refill' });
  }

  const todayByCat = await publishedTodayByCategory();
  const pending = await getPendingBriefings();

  const orderedSlots: Category[] = [];
  for (const cat of REQUIRED_SLOTS) {
    if ((todayByCat[cat] ?? 0) < 1) orderedSlots.push(cat);
  }
  while (orderedSlots.length < opts.limit) orderedSlots.push(BONUS_SLOT);

  const details: { briefingId: string; articleId: string | null; status: string }[] = [];
  let written = 0;

  for (const slot of orderedSlots) {
    if (written >= opts.limit) break;

    const briefing = pending.find((b) => b.category === slot) ?? pending.find((b) => b.category === BONUS_SLOT);
    if (!briefing) {
      logger.warn({ slot }, '[pipeline-write] no briefing for slot, skipping');
      details.push({ briefingId: '', articleId: null, status: 'no-briefing' });
      continue;
    }

    pending.splice(pending.indexOf(briefing), 1);

    try {
      const writerResult = await runWriter(briefing.briefing_id);
      if ('skipped' in writerResult) {
        details.push({ briefingId: briefing.briefing_id, articleId: null, status: `skipped: ${writerResult.reason}` });
        continue;
      }

      const review = await runLegalReviewer(writerResult.articleId);
      if (review.status === 'REPROVADO') {
        details.push({ briefingId: briefing.briefing_id, articleId: writerResult.articleId, status: 'REPROVADO' });
        continue;
      }

      await runOnPageSeo(writerResult.articleId);
      await runDesignRepurpose(writerResult.articleId);

      if (config.AUTO_PUBLISH_ENABLED) {
        await queuePublish.add('manual-publish', {
          article_id: writerResult.articleId,
          skip_human_review: true,
          triggered_by: 'pipeline-write',
        });
      }

      written++;
      details.push({ briefingId: briefing.briefing_id, articleId: writerResult.articleId, status: review.status });
    } catch (err) {
      logger.error({ err, briefingId: briefing.briefing_id }, '[pipeline-write] slot failed');
      details.push({ briefingId: briefing.briefing_id, articleId: null, status: `error: ${String(err).slice(0, 200)}` });
    }
  }

  logger.info({ written, refillNeeded, details }, '[pipeline-write] done');
  void queryOne;
  return { written, refill_triggered: refillNeeded, details };
}
