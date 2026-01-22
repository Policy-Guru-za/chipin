import { afterEach, describe, expect, it, vi } from 'vitest';

const createPayfastPayment = vi.fn(() => ({
  redirectUrl: 'https://payfast.example/redirect',
  fields: [['merchant_id', '10000100']],
}));
const createOzowPayment = vi.fn(async () => ({
  redirectUrl: 'https://ozow.example/redirect',
  providerReference: 'ozow-ref',
}));
const createSnapScanPayment = vi.fn(() => ({
  qrUrl: 'https://snapscan.example/qr',
  qrImageUrl: 'https://snapscan.example/qr.svg',
}));
const isOzowConfigured = vi.fn(() => true);
const isSnapScanConfigured = vi.fn(() => true);

vi.mock('@/lib/payments/payfast', () => ({
  createPayfastPayment,
}));
vi.mock('@/lib/payments/ozow', () => ({
  createOzowPayment,
  isOzowConfigured,
}));
vi.mock('@/lib/payments/snapscan', () => ({
  createSnapScanPayment,
  isSnapScanConfigured,
}));

const loadModule = async () => {
  vi.resetModules();
  return import('@/lib/payments');
};

describe('createPaymentIntent', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const baseParams = {
    amountCents: 12500,
    reference: 'CONTRIB-123',
    description: 'Contribution',
    returnUrl: 'https://chipin.example/return',
    cancelUrl: 'https://chipin.example/cancel',
    notifyUrl: 'https://chipin.example/webhook',
    customerEmail: 'friend@example.com',
  };

  it('builds payfast form intents', async () => {
    const { createPaymentIntent } = await loadModule();
    const intent = await createPaymentIntent('payfast', baseParams);

    expect(intent.mode).toBe('form');
    expect(intent.provider).toBe('payfast');
    expect(intent.redirectUrl).toContain('payfast.example');
    expect(createPayfastPayment).toHaveBeenCalled();
  });

  it('builds ozow redirect intents', async () => {
    const { createPaymentIntent } = await loadModule();
    const intent = await createPaymentIntent('ozow', baseParams);

    expect(intent.mode).toBe('redirect');
    expect(intent.provider).toBe('ozow');
    expect(intent.redirectUrl).toContain('ozow.example');
    expect(createOzowPayment).toHaveBeenCalled();
  });

  it('builds snapscan QR intents', async () => {
    const { createPaymentIntent } = await loadModule();
    const intent = await createPaymentIntent('snapscan', baseParams);

    expect(intent.mode).toBe('qr');
    expect(intent.provider).toBe('snapscan');
    expect(intent.qrImageUrl).toContain('snapscan.example');
    expect(createSnapScanPayment).toHaveBeenCalled();
  });
});
