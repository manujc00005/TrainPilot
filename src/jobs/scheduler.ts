import cron, { type ScheduledTask } from 'node-cron';
import { logger } from '../utils/logger.js';
import { runDailySync } from './daily-sync.job.js';
import { runDailyAnalysis } from './daily-analysis.job.js';
import { runWeeklyPlanning } from './weekly-planning.job.js';
import { runComplianceCheck } from './compliance-check.job.js';
import { runTokenRefresh } from './token-refresh.job.js';
import { runOnboarding } from './onboarding.job.js';

export type JobName = 'daily-sync' | 'daily-analysis' | 'weekly-planning' | 'compliance-check' | 'token-refresh' | 'onboarding';

const JOB_REGISTRY: Record<JobName, () => Promise<void>> = {
  'token-refresh': runTokenRefresh,
  'daily-sync': runDailySync,
  'daily-analysis': runDailyAnalysis,
  'weekly-planning': runWeeklyPlanning,
  'compliance-check': runComplianceCheck,
  'onboarding': runOnboarding,
};

const tasks: ScheduledTask[] = [];

export function startScheduler(): void {
  // Every 5 hours — keep token fresh
  tasks.push(
    cron.schedule('0 */5 * * *', safeRun('token-refresh')),
  );

  // 06:00 daily — fetch yesterday's activities
  tasks.push(
    cron.schedule('0 6 * * *', safeRun('daily-sync')),
  );

  // 06:30 daily — compute metrics + LLM analysis + send Telegram
  tasks.push(
    cron.schedule('30 6 * * *', safeRun('daily-analysis')),
  );

  // 20:00 daily — check if today's session was completed
  tasks.push(
    cron.schedule('0 20 * * *', safeRun('compliance-check')),
  );

  // 08:00 Sunday — generate next week's plan
  tasks.push(
    cron.schedule('0 8 * * 0', safeRun('weekly-planning')),
  );

  logger.info('Scheduler started (5 jobs registered)');
}

export function stopScheduler(): void {
  for (const task of tasks) task.stop();
  tasks.length = 0;
  logger.info('Scheduler stopped');
}

// Run any job on demand (used by /status/run/:job endpoint)
export async function runJob(name: JobName, dry = false): Promise<void> {
  const fn = JOB_REGISTRY[name];
  if (!fn) throw new Error(`Unknown job: ${name}`);
  if (dry) {
    logger.info({ job: name }, 'Dry run — skipping execution');
    return;
  }
  logger.info({ job: name }, 'Manual job trigger');
  await fn();
}

function safeRun(name: JobName): () => void {
  return () => {
    JOB_REGISTRY[name]().catch((err) => {
      logger.error({ job: name, err }, 'Job failed');
    });
  };
}
