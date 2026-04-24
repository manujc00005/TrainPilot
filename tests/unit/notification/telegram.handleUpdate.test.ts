import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock config before importing the provider
vi.mock('../../../src/config/index.js', () => ({
  config: {
    TELEGRAM_BOT_TOKEN: 'fake-token',
    TELEGRAM_CHAT_ID: '12345',
  },
}));

// Mock axios so no real HTTP calls
vi.mock('axios');

import { TelegramProvider } from '../../../src/services/notification/telegram.provider.js';

function makeUpdate(text: string) {
  return {
    update_id: 1,
    message: {
      message_id: 1,
      chat: { id: 12345 },
      text,
      date: Math.floor(Date.now() / 1000),
    },
  };
}

describe('TelegramProvider.handleUpdate', () => {
  let provider: TelegramProvider;

  beforeEach(() => {
    provider = new TelegramProvider();
  });

  it('parses /fatiga 7 and returns fatigue message', async () => {
    const result = await provider.handleUpdate(makeUpdate('/fatiga 7'));
    expect(result).toEqual({ type: 'fatigue', score: '7' });
  });

  it('parses /fatiga 10 (boundary)', async () => {
    expect(await provider.handleUpdate(makeUpdate('/fatiga 10'))).toEqual({ type: 'fatigue', score: '10' });
  });

  it('parses /fatiga 1 (boundary)', async () => {
    expect(await provider.handleUpdate(makeUpdate('/fatiga 1'))).toEqual({ type: 'fatigue', score: '1' });
  });

  it('is case-insensitive', async () => {
    expect(await provider.handleUpdate(makeUpdate('/FATIGA 5'))).toEqual({ type: 'fatigue', score: '5' });
  });

  it('returns null for /fatiga 0 (out of range)', async () => {
    expect(await provider.handleUpdate(makeUpdate('/fatiga 0'))).toBeNull();
  });

  it('returns null for /fatiga 11 (out of range)', async () => {
    expect(await provider.handleUpdate(makeUpdate('/fatiga 11'))).toBeNull();
  });

  it('returns chat message for free text', async () => {
    const result = await provider.handleUpdate(makeUpdate('¿Debería descansar mañana?'));
    expect(result).toEqual({ type: 'chat', text: '¿Debería descansar mañana?' });
  });

  it('returns null for unknown slash commands', async () => {
    expect(await provider.handleUpdate(makeUpdate('/start'))).toBeNull();
    expect(await provider.handleUpdate(makeUpdate('/help'))).toBeNull();
  });

  it('returns null for empty message text', async () => {
    expect(await provider.handleUpdate({ update_id: 1, message: { message_id: 1, chat: { id: 1 }, date: 0 } })).toBeNull();
  });

  it('returns null for non-message updates (e.g. channel post)', async () => {
    expect(await provider.handleUpdate({ update_id: 1 })).toBeNull();
  });
});
