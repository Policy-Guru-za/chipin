import { afterEach, describe, expect, it, vi } from 'vitest';

import { createGivenGainDonation } from '@/lib/integrations/givengain';
import { topUpKarriCard } from '@/lib/integrations/karri';
import { issueTakealotGiftCard } from '@/lib/integrations/takealot-gift-cards';

describe('payout integrations', () => {
  const originalEnv = {
    KARRI_BASE_URL: process.env.KARRI_BASE_URL,
    KARRI_API_KEY: process.env.KARRI_API_KEY,
    TAKEALOT_GIFTCARD_API_URL: process.env.TAKEALOT_GIFTCARD_API_URL,
    TAKEALOT_GIFTCARD_API_KEY: process.env.TAKEALOT_GIFTCARD_API_KEY,
    GIVENGAIN_API_URL: process.env.GIVENGAIN_API_URL,
    GIVENGAIN_API_KEY: process.env.GIVENGAIN_API_KEY,
  };

  afterEach(() => {
    process.env.KARRI_BASE_URL = originalEnv.KARRI_BASE_URL;
    process.env.KARRI_API_KEY = originalEnv.KARRI_API_KEY;
    process.env.TAKEALOT_GIFTCARD_API_URL = originalEnv.TAKEALOT_GIFTCARD_API_URL;
    process.env.TAKEALOT_GIFTCARD_API_KEY = originalEnv.TAKEALOT_GIFTCARD_API_KEY;
    process.env.GIVENGAIN_API_URL = originalEnv.GIVENGAIN_API_URL;
    process.env.GIVENGAIN_API_KEY = originalEnv.GIVENGAIN_API_KEY;
    vi.unstubAllGlobals();
  });

  it('creates a Karri top-up', async () => {
    process.env.KARRI_BASE_URL = 'https://karri.test';
    process.env.KARRI_API_KEY = 'token';

    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ transactionId: 'K123', status: 'completed' }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await topUpKarriCard({
      cardNumber: '4111111111111111',
      amountCents: 5000,
      reference: 'payout-1',
      description: 'Maya gift',
    });

    expect(result.transactionId).toBe('K123');
    expect(result.status).toBe('completed');
    expect(fetchMock).toHaveBeenCalled();
  });

  it('issues a Takealot gift card', async () => {
    process.env.TAKEALOT_GIFTCARD_API_URL = 'https://takealot.test';
    process.env.TAKEALOT_GIFTCARD_API_KEY = 'token';

    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ giftCardCode: 'GC-123', status: 'completed' }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await issueTakealotGiftCard({
      amountCents: 5000,
      recipientEmail: 'host@chipin.co.za',
      reference: 'payout-2',
      message: 'Gift card',
    });

    expect(result.giftCardCode).toBe('GC-123');
    expect(result.status).toBe('completed');
    expect(fetchMock).toHaveBeenCalled();
  });

  it('creates a GivenGain donation', async () => {
    process.env.GIVENGAIN_API_URL = 'https://givengain.test';
    process.env.GIVENGAIN_API_KEY = 'token';

    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ donationId: 'DG-1', status: 'completed' }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await createGivenGainDonation({
      causeId: 'cause-1',
      amountCents: 3000,
      donorName: 'Maya',
      donorEmail: 'host@chipin.co.za',
      reference: 'payout-3',
      message: 'Thank you',
    });

    expect(result.donationId).toBe('DG-1');
    expect(result.status).toBe('completed');
    expect(fetchMock).toHaveBeenCalled();
  });
});
