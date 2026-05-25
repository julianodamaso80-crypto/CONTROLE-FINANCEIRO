import cron from 'node-cron';
import { config } from './config.js';
import { logger } from './lib/logger.js';
import { queueResearch, queueWrite, queueAnalyze, queueReporting, queuePublish } from './queue.js';

const TZ = config.TZ;

cron.schedule(
  '0 6 * * 1',
  () => {
    logger.info('[cron] weekly research');
    void queueResearch.add('weekly', { triggered_by: 'cron:weekly' });
  },
  { timezone: TZ },
);

cron.schedule(
  '0 9 * * *',
  () => {
    logger.info('[cron] daily write');
    void queueWrite.add('daily', {
      triggered_by: 'cron:daily',
      limit: config.DAILY_ARTICLE_LIMIT + config.DAILY_ARTICLE_BONUS,
    });
  },
  { timezone: TZ },
);

cron.schedule(
  '0 7 * * 2',
  () => {
    logger.info('[cron] weekly analyze');
    void queueAnalyze.add('weekly-analyze', { triggered_by: 'cron:analyze' });
  },
  { timezone: TZ },
);

cron.schedule(
  '0 3 * * *',
  () => {
    logger.info('[cron] daily reporting');
    void queueReporting.add('daily-metrics', { triggered_by: 'cron:reporting' });
  },
  { timezone: TZ },
);

cron.schedule(
  '*/15 * * * *',
  () => {
    void queuePublish.add('recheck-pending-indexing', { triggered_by: 'cron:15min' });
  },
  { timezone: TZ },
);

logger.info({ tz: TZ }, '[scheduler] cron jobs registered');
