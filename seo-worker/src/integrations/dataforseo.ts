import { config } from '../config.js';
import { logger } from '../lib/logger.js';
import { exec, query } from '../db/pg.js';

const BASE = 'https://api.dataforseo.com/v3';

interface DataForSeoKeywordResult {
  keyword: string;
  search_volume: number | null;
  keyword_difficulty: number | null;
  cpc: number | null;
  competition: number | null;
}

async function getTodayCost(): Promise<number> {
  const rows = await query<{ total: number }>(
    `SELECT COALESCE(SUM(cost_usd), 0)::float AS total FROM seo.dataforseo_calls
     WHERE called_at >= date_trunc('day', now())`,
  );
  return rows[0]?.total ?? 0;
}

async function record(endpoint: string, body: unknown, cost: number, cached: boolean) {
  await exec(
    `INSERT INTO seo.dataforseo_calls (endpoint, request_body, cost_usd, cached) VALUES ($1, $2, $3, $4)`,
    [endpoint, body, cost, cached],
  );
}

export async function keywordSuggestions(seeds: string[]): Promise<DataForSeoKeywordResult[]> {
  if (!config.DATAFORSEO_LOGIN || !config.DATAFORSEO_PASSWORD) return [];

  const todayCost = await getTodayCost();
  if (todayCost >= config.DATAFORSEO_DAILY_BUDGET_USD) {
    logger.warn({ todayCost, limit: config.DATAFORSEO_DAILY_BUDGET_USD }, '[dataforseo] daily budget exceeded');
    return [];
  }

  const auth = Buffer.from(`${config.DATAFORSEO_LOGIN}:${config.DATAFORSEO_PASSWORD}`).toString('base64');
  const body = seeds.map((seed) => ({
    keyword: seed,
    location_code: 2076,
    language_code: 'pt',
    limit: 20,
  }));

  try {
    const res = await fetch(`${BASE}/dataforseo_labs/google/keyword_suggestions/live`, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as { cost?: number; tasks?: Array<{ result?: Array<{ items?: DataForSeoKeywordResult[] }> }> };
    const cost = json.cost ?? 0;
    await record('keyword_suggestions', body, cost, false);

    const items: DataForSeoKeywordResult[] = [];
    for (const task of json.tasks ?? []) {
      for (const result of task.result ?? []) {
        for (const item of result.items ?? []) {
          items.push(item);
        }
      }
    }
    return items;
  } catch (err) {
    logger.error({ err }, '[dataforseo] keyword_suggestions failed');
    return [];
  }
}
