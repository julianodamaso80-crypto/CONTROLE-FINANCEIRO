import { Worker } from 'bullmq';
import { redis } from '../lib/redis.js';
import { logger } from '../lib/logger.js';
import { runGscAnalyst } from '../agents/13-gsc-analyst.js';
import { runContentUpdater } from '../agents/14-content-updater.js';

new Worker(
  'seo-analyze',
  async (job) => {
    logger.info({ jobId: job.id }, '[analyze.worker] start weekly analyze');
    const recs = await runGscAnalyst();
    const updates = await runContentUpdater();
    return { recs, updates };
  },
  { connection: redis, concurrency: 1 },
);
