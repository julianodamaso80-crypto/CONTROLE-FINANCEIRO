import { credentialsSnapshot } from '../config.js';
import { query, closePool } from '../db/pg.js';
import { logger } from '../lib/logger.js';

async function main() {
  const creds = credentialsSnapshot();

  let dbOk = false;
  let schemaTables: string[] = [];
  let clustersCount = 0;
  let dataSourcesCount = 0;
  let seedsCount = 0;
  try {
    const r = await query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'seo' ORDER BY table_name`,
    );
    schemaTables = r.map((x) => x.table_name);
    dbOk = true;

    const c = await query<{ count: number }>(`SELECT COUNT(*)::int AS count FROM seo.clusters`);
    clustersCount = c[0]?.count ?? 0;
    const d = await query<{ count: number }>(`SELECT COUNT(*)::int AS count FROM seo.data_sources`);
    dataSourcesCount = d[0]?.count ?? 0;
    const s = await query<{ count: number }>(`SELECT COUNT(*)::int AS count FROM seo.seed_keywords`);
    seedsCount = s[0]?.count ?? 0;
  } catch (err) {
    logger.warn({ err }, '[doctor] db check failed');
  }

  const report = {
    credentials: creds,
    db: { connected: dbOk, schema_tables: schemaTables.length, tables: schemaTables },
    seo_data: {
      clusters: clustersCount,
      data_sources: dataSourcesCount,
      seed_keywords: seedsCount,
    },
  };

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(report, null, 2));

  await closePool();
}

main().catch(async (err) => {
  logger.error({ err }, '[doctor] failed');
  await closePool();
  process.exit(1);
});
