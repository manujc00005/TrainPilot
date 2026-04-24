import { Router } from 'express';
import { getStorage } from '../services/storage/index.js';
import { config } from '../config/index.js';
import { generateId } from '../utils/hash.utils.js';
import type { TrainingGoal } from '../types/plan.types.js';

export const planRouter = Router();

planRouter.get('/goal', async (_req, res, next) => {
  try {
    const storage = getStorage();
    const goal = await storage.getActiveGoal(config.STRAVA_ATHLETE_ID);
    res.json(goal ?? { error: 'No active goal' });
  } catch (err) {
    next(err);
  }
});

planRouter.post('/goal', async (req, res, next) => {
  try {
    const body = req.body as Partial<TrainingGoal>;
    const goal: TrainingGoal = {
      id: generateId(),
      athleteId: config.STRAVA_ATHLETE_ID,
      sport: body.sport ?? config.ATHLETE_SPORT,
      description: body.description ?? config.ATHLETE_GOAL,
      targetDate: body.targetDate ? new Date(body.targetDate) : undefined,
      weeklyTargetHours: body.weeklyTargetHours ?? config.WEEKLY_TARGET_HOURS,
      fitnessLevel: body.fitnessLevel ?? config.ATHLETE_FITNESS_LEVEL,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const storage = getStorage();
    await storage.saveGoal(goal);
    res.status(201).json(goal);
  } catch (err) {
    next(err);
  }
});

planRouter.get('/sessions/:weekStart', async (req, res, next) => {
  try {
    const storage = getStorage();
    const sessions = await storage.getPlannedSessionsByWeek(
      new Date(req.params.weekStart),
      config.STRAVA_ATHLETE_ID,
    );
    res.json(sessions);
  } catch (err) {
    next(err);
  }
});
