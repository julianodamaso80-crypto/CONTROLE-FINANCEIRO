import './research.worker.js';
import './write.worker.js';
import './publish.worker.js';
import './analyze.worker.js';
import './reporting.worker.js';
import { logger } from '../lib/logger.js';

logger.info('[workers] all BullMQ workers booted');
