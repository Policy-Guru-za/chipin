import { describe, expect, it } from 'vitest';

import {
  mapPayfastStatus,
  parsePayfastAmountCents,
  validatePayfastMerchant,
} from '../../src/lib/payments/payfast';

describe('PayFast ITN helpers', () => {
  it('validates merchant credentials from payload', () => {
    process.env.PAYFAST_MERCHANT_ID = '10000100';
    process.env.PAYFAST_MERCHANT_KEY = '46f0cd694581a';

    expect(
      validatePayfastMerchant({
        merchant_id: '10000100',
        merchant_key: '46f0cd694581a',
      })
    ).toBe(true);

    expect(
      validatePayfastMerchant({
        merchant_id: 'wrong',
        merchant_key: '46f0cd694581a',
      })
    ).toBe(false);
  });

  it('parses PayFast amount values into cents', () => {
    expect(parsePayfastAmountCents('206.00')).toBe(20600);
    expect(parsePayfastAmountCents('invalid')).toBeNull();
  });

  it('maps PayFast statuses to contribution status', () => {
    expect(mapPayfastStatus('COMPLETE')).toBe('completed');
    expect(mapPayfastStatus('FAILED')).toBe('failed');
    expect(mapPayfastStatus('CANCELLED')).toBe('failed');
    expect(mapPayfastStatus('PENDING')).toBe('processing');
  });
});
