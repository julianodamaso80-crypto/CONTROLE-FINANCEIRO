import { Worker } from 'bullmq';
import { redis } from '../lib/redis.js';
import { logger } from '../lib/logger.js';
import { config } from '../config.js';
import { runDailyWritePipeline } from '../agents/_pipeline-write.js';

new Worker(
  'seo-write',
  async (job) => {
    const limit = Number(job.data?.limit ?? config.DAILY_ARTICLE_LIMIT + config.DAILY_ARTICLE_BONUS);
    logger.info({ jobId: job.id, limit }, '[write.worker] start daily pipeline');
    const result = await runDailyWritePipeline({ limit });
    return result;
  },
  { connection: redis, concurrency: 1 },
);
