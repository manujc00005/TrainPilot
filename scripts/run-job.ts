/**
 * CLI runner — executes any job directly without starting the HTTP server.
 * Usage: tsx scripts/run-job.ts <job-name>
 *
 * Available jobs:
 *   onboarding | daily-sync | daily-analysis | weekly-planning | compliance-check | token-refresh
 */
import { config as loadEnv } from 'dotenv';
loadEnv();

import { runOnboarding } from '../src/jobs/onboarding.job.js';
import { runDailySync } from '../src/jobs/daily-sync.job.js';
import { runDailyAnalysis } from '../src/jobs/daily-analysis.job.js';
import { runWeeklyPlanning } from '../src/jobs/weekly-planning.job.js';
import { runComplianceCheck } from '../src/jobs/compliance-check.job.js';
import { runTokenRefresh } from '../src/jobs/token-refresh.job.js';

const JOBS: Record<string, () => Promise<void>> = {
  'onboarding': runOnboarding,
  'daily-sync': runDailySync,
  'daily-analysis': runDailyAnalysis,
  'weekly-planning': runWeeklyPlanning,
  'compliance-check': runComplianceCheck,
  'token-refresh': runTokenRefresh,
};

const jobName = process.argv[2];

if (!jobName || !JOBS[jobName]) {
  console.error(`Usage: tsx scripts/run-job.ts <job>\nAvailable: ${Object.keys(JOBS).join(' | ')}`);
  process.exit(1);
}

console.log(`▶ Running job: ${jobName}`);
JOBS[jobName]()
  .then(() => {
    console.log(`✓ Job "${jobName}" completed`);
    process.exit(0);
  })
  .catch((err) => {
    console.error(`✗ Job "${jobName}" failed:`, err);
    process.exit(1);
  });
