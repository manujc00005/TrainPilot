import type { Request, Response, NextFunction } from 'express';
import { config } from '../config/index.js';

export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  const key = req.headers['x-api-key'] ?? req.query['api_key'];
  if (key !== config.API_KEY) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}
