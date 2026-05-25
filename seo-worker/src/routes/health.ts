import type { FastifyInstance } from 'fastify';
import { credentialsSnapshot } from '../config.js';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/healthz', async () => ({ ok: true, uptime: process.uptime() }));
  app.get('/credentials', async () => credentialsSnapshot());
}
