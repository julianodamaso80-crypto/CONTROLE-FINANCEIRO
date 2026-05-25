import Fastify from 'fastify';
import { config } from './config.js';
import { logger } from './lib/logger.js';
import { healthRoutes } from './routes/health.js';
import { runsRoutes } from './routes/runs.js';
import './scheduler.js';
import './workers/index.js';

const app = Fastify({ logger: false });

await app.register(healthRoutes);
await app.register(runsRoutes);

try {
  await app.listen({ port: config.PORT, host: '0.0.0.0' });
  logger.info({ port: config.PORT, env: config.NODE_ENV }, '[server] seo-worker started');
} catch (err) {
  logger.error({ err }, '[server] failed to start');
  process.exit(1);
}
