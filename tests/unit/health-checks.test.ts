import { afterEach, describe, expect, it } from 'vitest';

import {
  checkGivenGainAutomation,
  checkKarriAutomation,
  checkTakealotGiftCards,
} from '@/lib/health/checks';

describe('health checks', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv } as NodeJS.ProcessEnv;
  });

  it('returns disabled when Karri automation is off', async () => {
    process.env.KARRI_AUTOMATION_ENABLED = 'false';
    const result = await checkKarriAutomation();
    expect(result.ok).toBe(true);
    expect(result.detail).toBe('disabled');
  });

  it('flags missing Karri configuration when enabled', async () => {
    process.env.KARRI_AUTOMATION_ENABLED = 'true';
    process.env.KARRI_BASE_URL = '';
    process.env.KARRI_API_KEY = '';
    const result = await checkKarriAutomation();
    expect(result.ok).toBe(false);
  });

  it('flags missing Karri encryption key when enabled', async () => {
    process.env.KARRI_AUTOMATION_ENABLED = 'true';
    process.env.KARRI_BASE_URL = 'https://karri.test';
    process.env.KARRI_API_KEY = 'token';
    delete process.env.CARD_DATA_ENCRYPTION_KEY;
    const result = await checkKarriAutomation();
    expect(result.ok).toBe(false);
  });

  it('confirms Karri automation when configured', async () => {
    process.env.KARRI_AUTOMATION_ENABLED = 'true';
    process.env.KARRI_BASE_URL = 'https://karri.test';
    process.env.KARRI_API_KEY = 'token';
    process.env.CARD_DATA_ENCRYPTION_KEY = 'secret';
    const result = await checkKarriAutomation();
    expect(result.ok).toBe(true);
  });

  it('flags missing Takealot gift card configuration', async () => {
    process.env.TAKEALOT_GIFTCARD_AUTOMATION_ENABLED = 'true';
    process.env.TAKEALOT_GIFTCARD_API_URL = '';
    process.env.TAKEALOT_GIFTCARD_API_KEY = '';
    const result = await checkTakealotGiftCards();
    expect(result.ok).toBe(false);
  });

  it('returns disabled when Takealot automation is off', async () => {
    process.env.TAKEALOT_GIFTCARD_AUTOMATION_ENABLED = 'false';
    const result = await checkTakealotGiftCards();
    expect(result.ok).toBe(true);
    expect(result.detail).toBe('disabled');
  });

  it('flags missing GivenGain configuration', async () => {
    process.env.GIVENGAIN_AUTOMATION_ENABLED = 'true';
    process.env.GIVENGAIN_API_URL = '';
    process.env.GIVENGAIN_API_KEY = '';
    const result = await checkGivenGainAutomation();
    expect(result.ok).toBe(false);
  });

  it('returns disabled when GivenGain automation is off', async () => {
    process.env.GIVENGAIN_AUTOMATION_ENABLED = 'false';
    const result = await checkGivenGainAutomation();
    expect(result.ok).toBe(true);
    expect(result.detail).toBe('disabled');
  });
});
