import { Queue } from 'bullmq';
import { redis } from './lib/redis.js';

const baseOpts = {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: { count: 200, age: 7 * 24 * 3600 },
    removeOnFail: { count: 1000, age: 30 * 24 * 3600 },
    attempts: 3,
    backoff: { type: 'exponential' as const, delay: 5000 },
  },
};

export const queueResearch = new Queue('seo-research', baseOpts);
export const queueWrite = new Queue('seo-write', baseOpts);
export const queuePublish = new Queue('seo-publish', baseOpts);
export const queueAnalyze = new Queue('seo-analyze', baseOpts);
export const queueReporting = new Queue('seo-reporting', baseOpts);
