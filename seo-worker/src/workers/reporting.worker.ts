import { Worker } from 'bullmq';
import { redis } from '../lib/redis.js';
import { logger } from '../lib/logger.js';
import { runReporting } from '../agents/15-reporting.js';

new Worker(
  'seo-reporting',
  async (job) => {
    logger.info({ jobId: job.id }, '[reporting.worker] start');
    return runReporting();
  },
  { connection: redis, concurrency: 1 },
);
