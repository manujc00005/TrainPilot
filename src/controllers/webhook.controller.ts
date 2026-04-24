import { Router } from 'express';
import { getStorage } from '../services/storage/index.js';
import { TelegramProvider } from '../services/notification/telegram.provider.js';
import type { TelegramUpdate } from '../services/notification/telegram.provider.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export const webhookRouter = Router();

// Telegram webhook — receives user messages (e.g. /fatiga 7)
webhookRouter.post('/telegram', async (req, res) => {
  const update = req.body as TelegramUpdate;

  try {
    const provider = new TelegramProvider();
    const score = await provider.handleUpdate(update);

    if (score) {
      const storage = getStorage();
      await storage.saveSubjectiveFatigue(config.STRAVA_ATHLETE_ID, new Date(), parseInt(score));
      logger.info({ score }, 'Subjective fatigue recorded');
    }
  } catch (err) {
    logger.error({ err }, 'Telegram webhook error');
  }

  // Always return 200 to Telegram to avoid retries
  res.sendStatus(200);
});
