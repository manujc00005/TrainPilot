import express from 'express';
import { config } from './config/index.js';
import { getStorage } from './services/storage/index.js';
import { startScheduler, stopScheduler } from './jobs/scheduler.js';
import { router } from './routes/index.js';
import { requestLogger } from './middleware/logger.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';
import { logger } from './utils/logger.js';
import { generateId } from './utils/hash.utils.js';

async function bootstrap() {
  // 1. Initialize storage (creates DB tables if they don't exist)
  const storage = getStorage();
  await storage.initialize();

  // 2. Seed goal from env vars if no active goal exists
  const existingGoal = await storage.getActiveGoal(config.STRAVA_ATHLETE_ID);
  if (!existingGoal) {
    await storage.saveGoal({
      id: generateId(),
      athleteId: config.STRAVA_ATHLETE_ID,
      sport: config.ATHLETE_SPORT,
      description: config.ATHLETE_GOAL,
      weeklyTargetHours: config.WEEKLY_TARGET_HOURS,
      fitnessLevel: config.ATHLETE_FITNESS_LEVEL,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    logger.info('Default training goal created from env vars');
  }

  // 3. Start Express
  const app = express();
  app.use(express.json());
  app.use(requestLogger);
  app.use('/api', router);
  app.use(errorHandler);

  const server = app.listen(config.PORT, () => {
    logger.info({ port: config.PORT }, 'strava-coach server started');
  });

  // 4. Start cron scheduler
  startScheduler();

  // 5. Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down...');
    stopScheduler();
    storage.close();
    server.close(() => process.exit(0));
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

bootstrap().catch((err) => {
  logger.error({ err }, 'Fatal error during startup');
  process.exit(1);
});
