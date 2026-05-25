import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../config.js';
import { queueResearch, queueWrite, queueAnalyze, queueReporting, queuePublish } from '../queue.js';

async function bearerAuth(req: FastifyRequest, reply: FastifyReply) {
  const auth = req.headers.authorization;
  const expected = `Bearer ${config.TRIGGER_SECRET}`;
  if (!auth || auth !== expected) {
    return reply.code(401).send({ error: 'unauthorized' });
  }
}

export async function runsRoutes(app: FastifyInstance) {
  app.post('/runs/weekly', { preHandler: bearerAuth }, async (req, reply) => {
    const body = (req.body as Record<string, unknown>) ?? {};
    const job = await queueResearch.add('manual-weekly', { ...body, triggered_by: 'manual' });
    return reply.code(202).send({ enqueued: 'seo-research', jobId: job.id });
  });

  app.post('/runs/daily', { preHandler: bearerAuth }, async (req, reply) => {
    const body = (req.body as Record<string, unknown>) ?? {};
    const job = await queueWrite.add('manual-daily', { ...body, triggered_by: 'manual' });
    return reply.code(202).send({ enqueued: 'seo-write', jobId: job.id });
  });

  app.post('/runs/publish', { preHandler: bearerAuth }, async (req, reply) => {
    const body = (req.body as Record<string, unknown>) ?? {};
    const job = await queuePublish.add('manual-publish', { ...body, triggered_by: 'manual' });
    return reply.code(202).send({ enqueued: 'seo-publish', jobId: job.id });
  });

  app.post('/runs/analyze', { preHandler: bearerAuth }, async (_req, reply) => {
    const job = await queueAnalyze.add('manual-analyze', { triggered_by: 'manual' });
    return reply.code(202).send({ enqueued: 'seo-analyze', jobId: job.id });
  });

  app.post('/runs/reporting', { preHandler: bearerAuth }, async (_req, reply) => {
    const job = await queueReporting.add('manual-reporting', { triggered_by: 'manual' });
    return reply.code(202).send({ enqueued: 'seo-reporting', jobId: job.id });
  });
}
