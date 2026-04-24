/**
 * Integration test — sends a real message to the configured Telegram chat.
 * Requires TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env.
 *
 * Run with:  npm run test:integration
 */
import { describe, it, expect } from 'vitest';
import { config as loadEnv } from 'dotenv';

loadEnv();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const hasCredentials = Boolean(BOT_TOKEN && CHAT_ID);

describe.skipIf(!hasCredentials)('TelegramProvider — real API', () => {
  // Import after env is loaded so config validation passes
  it('sends a custom message and returns without error', async () => {
    const { TelegramProvider } = await import('../../../src/services/notification/telegram.provider.js');

    const provider = new TelegramProvider();

    await expect(
      provider.send({
        type: 'custom',
        text: '🤖 *Test de integración* — strava-coach conectado correctamente.',
        athleteId: process.env.STRAVA_ATHLETE_ID ?? 'test',
      }),
    ).resolves.not.toThrow();
  });

  it('sends a daily_analysis message with header formatting', async () => {
    const { TelegramProvider } = await import('../../../src/services/notification/telegram.provider.js');

    const provider = new TelegramProvider();

    await expect(
      provider.send({
        type: 'daily_analysis',
        text: 'Semana en curso: 3 sesiones, 28km.\nFatiga: normal. Sigue el plan.',
        athleteId: process.env.STRAVA_ATHLETE_ID ?? 'test',
      }),
    ).resolves.not.toThrow();
  });

  it('splits and sends a message longer than 4000 chars', async () => {
    const { TelegramProvider } = await import('../../../src/services/notification/telegram.provider.js');

    const provider = new TelegramProvider();
    const longText = 'Línea de prueba de longitud.\n'.repeat(160); // ~4800 chars

    await expect(
      provider.send({
        type: 'custom',
        text: longText,
        athleteId: process.env.STRAVA_ATHLETE_ID ?? 'test',
      }),
    ).resolves.not.toThrow();
  });
});

describe.skipIf(hasCredentials)('TelegramProvider — credentials missing', () => {
  it('skips integration tests (set TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID in .env to run)', () => {
    expect(true).toBe(true);
  });
});
