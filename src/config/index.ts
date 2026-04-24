import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

loadEnv();

const schema = z.object({
  PORT: z.coerce.number().default(3000),
  API_KEY: z.string().min(1),

  STRAVA_CLIENT_ID: z.string().min(1),
  STRAVA_CLIENT_SECRET: z.string().min(1),
  STRAVA_ACCESS_TOKEN: z.string().min(1),
  STRAVA_REFRESH_TOKEN: z.string().min(1),
  STRAVA_ATHLETE_ID: z.string().min(1),

  LLM_PROVIDER: z.enum(['claude', 'openai']).default('claude'),
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  LLM_MODEL: z.string().default('claude-sonnet-4-6'),

  NOTIFICATION_PROVIDER: z.enum(['telegram', 'whatsapp']).default('telegram'),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_RECIPIENT: z.string().optional(),

  STORAGE_BACKEND: z.enum(['sqlite', 'postgres']).default('sqlite'),
  SQLITE_PATH: z.string().default('./data/strava-coach.db'),
  DATABASE_URL: z.string().optional(),

  ATHLETE_SPORT: z.enum(['running', 'cycling', 'triathlon']).default('running'),
  ATHLETE_GOAL: z.string().default('Improve general fitness'),
  ATHLETE_FITNESS_LEVEL: z.enum(['beginner', 'intermediate', 'advanced']).default('intermediate'),
  WEEKLY_TARGET_HOURS: z.coerce.number().default(8),
});

function validate() {
  const result = schema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid configuration:\n${missing}`);
  }
  return result.data;
}

export const config = validate();

export type AppConfig = typeof config;
