import { afterEach, describe, expect, it } from 'vitest';

import { getAvailablePaymentProviders } from '@/lib/payments';

describe('payment provider availability', () => {
  const originalEnv = {
    PAYFAST_MERCHANT_ID: process.env.PAYFAST_MERCHANT_ID,
    PAYFAST_MERCHANT_KEY: process.env.PAYFAST_MERCHANT_KEY,
    OZOW_CLIENT_ID: process.env.OZOW_CLIENT_ID,
    OZOW_CLIENT_SECRET: process.env.OZOW_CLIENT_SECRET,
    OZOW_SITE_CODE: process.env.OZOW_SITE_CODE,
    OZOW_BASE_URL: process.env.OZOW_BASE_URL,
    OZOW_WEBHOOK_SECRET: process.env.OZOW_WEBHOOK_SECRET,
    SNAPSCAN_SNAPCODE: process.env.SNAPSCAN_SNAPCODE,
    SNAPSCAN_WEBHOOK_AUTH_KEY: process.env.SNAPSCAN_WEBHOOK_AUTH_KEY,
  };

  afterEach(() => {
    process.env.PAYFAST_MERCHANT_ID = originalEnv.PAYFAST_MERCHANT_ID;
    process.env.PAYFAST_MERCHANT_KEY = originalEnv.PAYFAST_MERCHANT_KEY;
    process.env.OZOW_CLIENT_ID = originalEnv.OZOW_CLIENT_ID;
    process.env.OZOW_CLIENT_SECRET = originalEnv.OZOW_CLIENT_SECRET;
    process.env.OZOW_SITE_CODE = originalEnv.OZOW_SITE_CODE;
    process.env.OZOW_BASE_URL = originalEnv.OZOW_BASE_URL;
    process.env.OZOW_WEBHOOK_SECRET = originalEnv.OZOW_WEBHOOK_SECRET;
    process.env.SNAPSCAN_SNAPCODE = originalEnv.SNAPSCAN_SNAPCODE;
    process.env.SNAPSCAN_WEBHOOK_AUTH_KEY = originalEnv.SNAPSCAN_WEBHOOK_AUTH_KEY;
  });

  it('returns empty when no providers are configured', () => {
    process.env.PAYFAST_MERCHANT_ID = '';
    process.env.PAYFAST_MERCHANT_KEY = '';
    process.env.OZOW_CLIENT_ID = '';
    process.env.OZOW_CLIENT_SECRET = '';
    process.env.OZOW_SITE_CODE = '';
    process.env.OZOW_BASE_URL = '';
    process.env.SNAPSCAN_SNAPCODE = '';
    process.env.SNAPSCAN_WEBHOOK_AUTH_KEY = '';

    expect(getAvailablePaymentProviders()).toEqual([]);
  });

  it('returns payfast when only payfast is configured', () => {
    process.env.PAYFAST_MERCHANT_ID = '10000100';
    process.env.PAYFAST_MERCHANT_KEY = '46f0cd694581a';
    process.env.OZOW_CLIENT_ID = '';
    process.env.OZOW_CLIENT_SECRET = '';
    process.env.OZOW_SITE_CODE = '';
    process.env.OZOW_BASE_URL = '';
    process.env.SNAPSCAN_SNAPCODE = '';
    process.env.SNAPSCAN_WEBHOOK_AUTH_KEY = '';

    expect(getAvailablePaymentProviders()).toEqual(['payfast']);
  });

  it('includes ozow and snapscan when configured', () => {
    process.env.PAYFAST_MERCHANT_ID = '10000100';
    process.env.PAYFAST_MERCHANT_KEY = '46f0cd694581a';
    process.env.OZOW_CLIENT_ID = 'ozow-client';
    process.env.OZOW_CLIENT_SECRET = 'ozow-secret';
    process.env.OZOW_SITE_CODE = 'site';
    process.env.OZOW_BASE_URL = 'https://one.ozow.com/v1';
    process.env.OZOW_WEBHOOK_SECRET = 'ozow-webhook';
    process.env.SNAPSCAN_SNAPCODE = 'snapcode';
    process.env.SNAPSCAN_WEBHOOK_AUTH_KEY = 'snap-secret';

    expect(getAvailablePaymentProviders()).toEqual(['payfast', 'ozow', 'snapscan']);
  });

  it('excludes ozow when webhook secret is missing', () => {
    process.env.PAYFAST_MERCHANT_ID = '10000100';
    process.env.PAYFAST_MERCHANT_KEY = '46f0cd694581a';
    process.env.OZOW_CLIENT_ID = 'ozow-client';
    process.env.OZOW_CLIENT_SECRET = 'ozow-secret';
    process.env.OZOW_SITE_CODE = 'site';
    process.env.OZOW_BASE_URL = 'https://one.ozow.com/v1';
    process.env.OZOW_WEBHOOK_SECRET = '';
    process.env.SNAPSCAN_SNAPCODE = 'snapcode';
    process.env.SNAPSCAN_WEBHOOK_AUTH_KEY = 'snap-secret';

    expect(getAvailablePaymentProviders()).toEqual(['payfast', 'snapscan']);
  });
});
