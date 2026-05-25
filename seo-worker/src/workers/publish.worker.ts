import { Worker } from 'bullmq';
import { redis } from '../lib/redis.js';
import { logger } from '../lib/logger.js';
import { runPublisher } from '../agents/09-publisher.js';
import { runRecheckPendingIndexing } from '../agents/_pipeline-indexing.js';

new Worker(
  'seo-publish',
  async (job) => {
    if (job.name === 'recheck-pending-indexing') {
      logger.info({ jobId: job.id }, '[publish.worker] recheck pending indexing');
      return runRecheckPendingIndexing();
    }
    const articleId = String(job.data?.article_id ?? '');
    const skipReview = Boolean(job.data?.skip_human_review ?? false);
    logger.info({ jobId: job.id, articleId, skipReview }, '[publish.worker] publishing article');
    return runPublisher({ article_id: articleId, skip_human_review: skipReview });
  },
  { connection: redis, concurrency: 1 },
);
