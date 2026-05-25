import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec, closePool } from '../db/pg.js';
import { logger } from '../lib/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const migrationsDir = path.resolve(__dirname, '..', '..', 'migrations');
  const files = (await fs.readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    logger.info({ file }, '[apply-migrations] running');
    const sql = await fs.readFile(path.join(migrationsDir, file), 'utf-8');
    await exec(sql);
    logger.info({ file }, '[apply-migrations] applied');
  }

  await closePool();
  logger.info({ total: files.length }, '[apply-migrations] done');
}

main().catch(async (err) => {
  logger.error({ err }, '[apply-migrations] failed');
  await closePool();
  process.exit(1);
});
