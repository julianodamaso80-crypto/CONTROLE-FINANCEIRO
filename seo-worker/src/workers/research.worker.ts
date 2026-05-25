import { Worker } from 'bullmq';
import { redis } from '../lib/redis.js';
import { logger } from '../lib/logger.js';
import { runKeywordResearch } from '../agents/01-keyword-research.js';
import { runSeoStrategist } from '../agents/02-seo-strategist.js';
import { runBriefing } from '../agents/04-briefing.js';

new Worker(
  'seo-research',
  async (job) => {
    logger.info({ jobId: job.id, name: job.name }, '[research.worker] start');
    const batch = await runKeywordResearch({ triggered_by: String(job.data?.triggered_by ?? 'unknown') });
    const decisions = await runSeoStrategist({ batch_id: batch.batchId });
    const briefings = await runBriefing({ topic_ids: decisions.approvedTopicIds });
    return { batch, decisions: decisions.summary, briefings: briefings.length };
  },
  { connection: redis, concurrency: 1 },
);
