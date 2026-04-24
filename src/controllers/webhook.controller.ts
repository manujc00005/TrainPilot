import { Router } from 'express';
import { getStorage } from '../services/storage/index.js';
import { handleWebhookUpdate, sendNotification } from '../services/notification/notification.service.js';
import { generateChatResponse } from '../services/llm/llm.service.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export const webhookRouter = Router();

webhookRouter.post('/inbound', async (req, res) => {
  // Always respond immediately — both Telegram and Meta retry on slow responses
  res.sendStatus(200);

  const athleteId = config.STRAVA_ATHLETE_ID;

  try {
    const inbound = await handleWebhookUpdate(req.body);
    if (!inbound) return;

    const storage = getStorage();

    if (inbound.type === 'fatigue') {
      await storage.saveSubjectiveFatigue(athleteId, new Date(), parseInt(inbound.score));
      logger.info({ score: inbound.score }, 'Subjective fatigue recorded');
      return;
    }

    if (inbound.type === 'chat') {
      await handleChatMessage(inbound.text, athleteId);
    }
  } catch (err) {
    logger.error({ err }, 'Webhook inbound error');
  }
});

// Meta (WhatsApp) webhook verification
webhookRouter.get('/inbound', (req, res) => {
  const { 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
  if (token === config.API_KEY && challenge) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

async function handleChatMessage(userMessage: string, athleteId: string): Promise<void> {
  const storage = getStorage();
  const [goal, baseline, recentWeeks, recentActivities] = await Promise.all([
    storage.getActiveGoal(athleteId),
    storage.getBaseline(athleteId),
    storage.getRecentWeeklyMetrics(12, athleteId),
    storage.getActivitiesByDateRange(
      new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      new Date(),
      athleteId,
    ),
  ]);

  if (!goal) {
    logger.warn('Chat message received but no active goal — cannot respond');
    return;
  }

  logger.info({ message: userMessage.slice(0, 60) }, 'Chat message received');

  const reply = await generateChatResponse(
    userMessage,
    goal,
    recentWeeks,
    recentActivities,
    baseline?.summaryText,
  );

  await sendNotification({ type: 'custom', text: reply, athleteId });

  logger.info('Chat response sent');
}
