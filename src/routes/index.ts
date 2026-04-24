import { Router } from 'express';
import { apiKeyAuth } from '../middleware/auth.middleware.js';
import { statusRouter } from '../controllers/status.controller.js';
import { webhookRouter } from '../controllers/webhook.controller.js';
import { planRouter } from '../controllers/plan.controller.js';

export const router = Router();

// Public — Telegram webhook must be unauthenticated (Telegram sends no API key)
router.use('/webhook', webhookRouter);

// Protected — require API key for everything else
router.use('/status', apiKeyAuth, statusRouter);
router.use('/plan', apiKeyAuth, planRouter);
