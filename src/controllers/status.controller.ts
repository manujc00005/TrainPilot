import { Router } from 'express';
import { runJob } from '../jobs/scheduler.js';
import type { JobName } from '../jobs/scheduler.js';
import { logger } from '../utils/logger.js';

export const statusRouter = Router();

statusRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

statusRouter.post('/run/:job', async (req, res, next) => {
  const job = req.params.job as JobName;
  const dry = req.query['dry'] === 'true';

  try {
    await runJob(job, dry);
    res.json({ job, dry, status: 'completed' });
  } catch (err) {
    logger.error({ job, err }, 'Manual job run failed');
    next(err);
  }
});
