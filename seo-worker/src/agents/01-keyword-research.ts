import { config } from '../config.js';
import { exec, query, queryOne } from '../db/pg.js';
import { keywordSuggestions } from '../integrations/dataforseo.js';
import { searchAnalytics } from '../integrations/gsc.js';
import { logger } from '../lib/logger.js';
import { startAgentRun, finishAgentRun } from '../db/repositories/agent-runs.js';
import { isInScope } from '../lib/scope-guard.js';
import type { Category, Intent } from './_types.js';

interface SeedRow {
  id: string;
  seed: string;
  category: Category;
  cluster_slug: string;
}

function classifyIntent(keyword: string): Intent {
  const k = keyword.toLowerCase();
  if (/\b(comprar|preço|quanto custa|grátis|gratuito|plano)\b/.test(k)) return 'transactional';
  if (/\b(melhor|vs|comparar|review|qual)\b/.test(k)) return 'commercial';
  if (/\b(login|entrar|site|oficial)\b/.test(k)) return 'navigational';
  return 'informational';
}

function classifyCategory(keyword: string): Category {
  const k = keyword.toLowerCase();
  if (/\bwhatsapp\b|\bbot\b|\bia\b|\binteligência artificial\b|\bautoma/.test(k)) return 'whatsapp-financeiro';
  if (/\bfamília|fam[íi]lia|orçamento|m[êe]todo 50|envelope|dom[ée]stic/.test(k)) return 'orcamento-familiar';
  if (/\bgast|despes|controle financeiro|planilha|aplicativ/.test(k)) return 'controle-de-gastos';
  return 'educacao-financeira';
}

export async function runKeywordResearch(opts: { triggered_by: string }): Promise<{ batchId: string; total: number }> {
  const runId = await startAgentRun({ agent_id: '01-keyword-research', triggered_by: opts.triggered_by, input: opts });

  const batch = await queryOne<{ id: string }>(
    `INSERT INTO seo.research_batches (company_id, triggered_by) VALUES ($1, $2) RETURNING id`,
    [config.COMPANY_ID, opts.triggered_by],
  );
  if (!batch) throw new Error('failed to create research_batch');

  const seeds = await query<SeedRow>(
    `SELECT id, seed, category, cluster_slug
       FROM seo.seed_keywords
      WHERE company_id = $1
      ORDER BY last_used_at NULLS FIRST
      LIMIT 20`,
    [config.COMPANY_ID],
  );

  const collected: { keyword: string; category: Category; volume: number | null; difficulty: number | null; intent: Intent; source: string }[] = [];

  for (const s of seeds) {
    if (!isInScope(s.seed).ok) continue;
    collected.push({
      keyword: s.seed,
      category: s.category,
      volume: null,
      difficulty: null,
      intent: classifyIntent(s.seed),
      source: 'manual',
    });
  }

  const seedTerms = seeds.map((s) => s.seed).slice(0, 8);
  if (seedTerms.length > 0) {
    const suggestions = await keywordSuggestions(seedTerms);
    for (const sug of suggestions) {
      if (!sug.keyword) continue;
      if (!isInScope(sug.keyword).ok) continue;
      collected.push({
        keyword: sug.keyword,
        category: classifyCategory(sug.keyword),
        volume: sug.search_volume,
        difficulty: sug.keyword_difficulty,
        intent: classifyIntent(sug.keyword),
        source: 'dataforseo',
      });
    }
  }

  if (config.GSC_SITE_URL && config.GOOGLE_REFRESH_TOKEN) {
    const today = new Date();
    const end = today.toISOString().slice(0, 10);
    const start = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const rows = await searchAnalytics({ startDate: start, endDate: end, dimensions: ['query'], rowLimit: 200 });
    for (const r of rows) {
      const q = r.keys?.[0];
      if (!q || !isInScope(q).ok) continue;
      collected.push({
        keyword: q,
        category: classifyCategory(q),
        volume: Math.round(r.impressions ?? 0),
        difficulty: null,
        intent: classifyIntent(q),
        source: 'gsc',
      });
    }
  }

  const dedup = new Map<string, typeof collected[number]>();
  for (const c of collected) {
    const key = c.keyword.trim().toLowerCase();
    const existing = dedup.get(key);
    if (!existing) dedup.set(key, c);
    else if ((c.volume ?? 0) > (existing.volume ?? 0)) dedup.set(key, c);
  }

  let inserted = 0;
  for (const c of dedup.values()) {
    const r = await exec(
      `INSERT INTO seo.keywords (company_id, keyword, category, source, search_volume, difficulty, intent, status, first_research_batch_id, last_research_batch_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $8)
       ON CONFLICT (company_id, keyword_normalized) DO UPDATE
         SET search_volume = COALESCE(EXCLUDED.search_volume, seo.keywords.search_volume),
             difficulty = COALESCE(EXCLUDED.difficulty, seo.keywords.difficulty),
             last_research_batch_id = EXCLUDED.last_research_batch_id`,
      [config.COMPANY_ID, c.keyword, c.category, c.source, c.volume, c.difficulty, c.intent, batch.id],
    );
    void r;
    inserted++;
    if (inserted >= config.WEEKLY_KEYWORD_LIMIT) break;
  }

  await exec(
    `UPDATE seo.seed_keywords SET last_used_at = now() WHERE id = ANY($1)`,
    [seeds.map((s) => s.id)],
  );

  await exec(`UPDATE seo.research_batches SET finished_at = now(), total_keywords = $1 WHERE id = $2`, [
    inserted,
    batch.id,
  ]);

  await finishAgentRun({ run_id: runId, output: { batchId: batch.id, total: inserted } });
  logger.info({ batchId: batch.id, inserted }, '[01-keyword-research] done');

  return { batchId: batch.id, total: inserted };
}
