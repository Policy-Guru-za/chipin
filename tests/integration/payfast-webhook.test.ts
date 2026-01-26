import crypto from 'crypto';

import { afterEach, describe, expect, it, vi } from 'vitest';

const encodePayfast = (value: string) =>
  encodeURIComponent(value)
    .replace(/%20/g, '+')
    .replace(/%[0-9a-f]{2}/gi, (match) => match.toUpperCase());

const buildParamString = (fields: Array<[string, string]>) =>
  fields.map(([key, value]) => `${key}=${encodePayfast(value)}`).join('&');

const generateSignature = (fields: Array<[string, string]>, passphrase?: string) => {
  const paramString = buildParamString(fields);
  const signatureString = passphrase
    ? `${paramString}&passphrase=${encodePayfast(passphrase)}`
    : paramString;
  return crypto.createHash('md5').update(signatureString).digest('hex');
};

const buildItnBody = (fields: Array<[string, string]>, passphrase?: string) => {
  const signature = generateSignature(fields, passphrase);
  return `${buildParamString(fields)}&signature=${encodePayfast(signature)}`;
};

const loadHandler = async () => {
  vi.resetModules();
  return import('@/app/api/webhooks/payfast/route');
};

const mockRateLimit = (allowed: boolean) => {
  vi.doMock('@/lib/auth/rate-limit', () => ({
    enforceRateLimit: vi.fn(async () => ({
      allowed,
      retryAfterSeconds: allowed ? undefined : 120,
    })),
  }));
};

const originalEnv = {
  PAYFAST_MERCHANT_ID: process.env.PAYFAST_MERCHANT_ID,
  PAYFAST_MERCHANT_KEY: process.env.PAYFAST_MERCHANT_KEY,
  PAYFAST_PASSPHRASE: process.env.PAYFAST_PASSPHRASE,
  PAYFAST_SANDBOX: process.env.PAYFAST_SANDBOX,
  NODE_ENV: process.env.NODE_ENV,
};

afterEach(() => {
  process.env.PAYFAST_MERCHANT_ID = originalEnv.PAYFAST_MERCHANT_ID;
  process.env.PAYFAST_MERCHANT_KEY = originalEnv.PAYFAST_MERCHANT_KEY;
  process.env.PAYFAST_PASSPHRASE = originalEnv.PAYFAST_PASSPHRASE;
  process.env.PAYFAST_SANDBOX = originalEnv.PAYFAST_SANDBOX;
  process.env.NODE_ENV = originalEnv.NODE_ENV;
  vi.unmock('@/lib/auth/rate-limit');
  vi.unmock('@/lib/db/queries');
  vi.unmock('@/lib/payments/payfast');
  vi.clearAllMocks();
  vi.resetModules();
});

describe('PayFast webhook integration - success', () => {
  it('accepts a valid ITN payload and updates contribution state', async () => {
    process.env.PAYFAST_MERCHANT_ID = '10000100';
    process.env.PAYFAST_MERCHANT_KEY = '46f0cd694581a';
    process.env.PAYFAST_PASSPHRASE = 'test-passphrase';
    process.env.PAYFAST_SANDBOX = 'true';
    process.env.NODE_ENV = 'test';
    mockRateLimit(true);

    const contribution = {
      id: 'contrib-1',
      dreamBoardId: 'board-1',
      amountCents: 5000,
      feeCents: 250,
      paymentStatus: 'pending',
    };

    const getContributionByPaymentRef = vi.fn(async () => contribution);
    const updateContributionStatus = vi.fn(async () => undefined);
    const markDreamBoardFundedIfNeeded = vi.fn(async () => undefined);

    vi.doMock('@/lib/db/queries', () => ({
      getContributionByPaymentRef,
      updateContributionStatus,
      markDreamBoardFundedIfNeeded,
    }));

    vi.doMock('@/lib/payments/payfast', async () => {
      const actual =
        await vi.importActual<typeof import('@/lib/payments/payfast')>('@/lib/payments/payfast');
      return {
        ...actual,
        validatePayfastItn: vi.fn(async () => true),
      };
    });

    const fields: Array<[string, string]> = [
      ['merchant_id', process.env.PAYFAST_MERCHANT_ID],
      ['merchant_key', process.env.PAYFAST_MERCHANT_KEY],
      ['m_payment_id', 'pay-123'],
      ['pf_payment_id', 'pf-456'],
      ['payment_status', 'COMPLETE'],
      ['timestamp', new Date().toISOString()],
      ['amount_gross', '52.50'],
    ];

    const rawBody = buildItnBody(fields, process.env.PAYFAST_PASSPHRASE);
    const { POST } = await loadHandler();
    const response = await POST(
      new Request('http://localhost/api/webhooks/payfast', {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          'x-real-ip': '197.97.145.144',
        },
        body: rawBody,
      })
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.received).toBe(true);

    expect(getContributionByPaymentRef).toHaveBeenCalledWith('payfast', 'pay-123');
    expect(updateContributionStatus).toHaveBeenCalledWith('contrib-1', 'completed');
    expect(markDreamBoardFundedIfNeeded).toHaveBeenCalledWith('board-1');
  });
});

describe('PayFast webhook integration - errors', () => {
  it('rejects requests when rate limited', async () => {
    mockRateLimit(false);

    const { POST } = await loadHandler();
    const response = await POST(
      new Request('http://localhost/api/webhooks/payfast', {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          'x-real-ip': '197.97.145.144',
        },
        body: '',
      })
    );

    expect(response.status).toBe(429);
  });

  it('accepts payloads without a timestamp', async () => {
    process.env.PAYFAST_MERCHANT_ID = '10000100';
    process.env.PAYFAST_MERCHANT_KEY = '46f0cd694581a';
    process.env.PAYFAST_PASSPHRASE = 'test-passphrase';
    process.env.PAYFAST_SANDBOX = 'true';
    process.env.NODE_ENV = 'test';
    mockRateLimit(true);

    const contribution = {
      id: 'contrib-1',
      dreamBoardId: 'board-1',
      amountCents: 5000,
      feeCents: 250,
      paymentStatus: 'pending',
    };

    const getContributionByPaymentRef = vi.fn(async () => contribution);
    const updateContributionStatus = vi.fn(async () => undefined);
    const markDreamBoardFundedIfNeeded = vi.fn(async () => undefined);

    vi.doMock('@/lib/db/queries', () => ({
      getContributionByPaymentRef,
      updateContributionStatus,
      markDreamBoardFundedIfNeeded,
    }));

    vi.doMock('@/lib/payments/payfast', async () => {
      const actual =
        await vi.importActual<typeof import('@/lib/payments/payfast')>('@/lib/payments/payfast');
      return {
        ...actual,
        validatePayfastItn: vi.fn(async () => true),
      };
    });

    const fields: Array<[string, string]> = [
      ['merchant_id', process.env.PAYFAST_MERCHANT_ID],
      ['merchant_key', process.env.PAYFAST_MERCHANT_KEY],
      ['m_payment_id', 'pay-123'],
      ['pf_payment_id', 'pf-456'],
      ['payment_status', 'COMPLETE'],
      ['amount_gross', '52.50'],
    ];

    const rawBody = buildItnBody(fields, process.env.PAYFAST_PASSPHRASE);
    const { POST } = await loadHandler();
    const response = await POST(
      new Request('http://localhost/api/webhooks/payfast', {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          'x-real-ip': '197.97.145.144',
        },
        body: rawBody,
      })
    );

    expect(response.status).toBe(200);
  });
});
