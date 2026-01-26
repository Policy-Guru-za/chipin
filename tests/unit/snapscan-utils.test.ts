import { afterEach, describe, expect, it } from 'vitest';

import {
  extractSnapScanReference,
  extractSnapScanPayments,
  mapSnapScanPaymentStatus,
  mapSnapScanStatus,
  parseSnapScanPaymentAmountCents,
  parseSnapScanAmountCents,
  parseSnapScanPayload,
  verifySnapScanSignature,
} from '@/lib/payments/snapscan';

describe('SnapScan parsing helpers', () => {
  const originalEnv = {
    SNAPSCAN_WEBHOOK_AUTH_KEY: process.env.SNAPSCAN_WEBHOOK_AUTH_KEY,
  };

  afterEach(() => {
    process.env.SNAPSCAN_WEBHOOK_AUTH_KEY = originalEnv.SNAPSCAN_WEBHOOK_AUTH_KEY;
  });

  it('handles missing signatures and invalid payloads', () => {
    process.env.SNAPSCAN_WEBHOOK_AUTH_KEY = 'snap-secret';
    expect(verifySnapScanSignature('payload=oops', null)).toBe(false);

    const invalid = new URLSearchParams({ payload: '{not json}' }).toString();
    expect(parseSnapScanPayload(invalid).payload).toBeNull();
  });

  it('extracts references and amounts', () => {
    const payload = { reference: 'SNAP-REF', amount: '75.50', status: 'FAILED' };
    expect(extractSnapScanReference(payload)).toBe('SNAP-REF');
    expect(parseSnapScanAmountCents(payload)).toBe(7550);
    expect(mapSnapScanStatus(payload)).toBe('failed');
  });

  it('parses payment list responses and statuses', () => {
    const listPayload = {
      data: [{ merchantReference: 'SNAP-REF', status: 'Completed', requiredAmount: 5250 }],
    };

    const payments = extractSnapScanPayments(listPayload);
    expect(payments).toHaveLength(1);
    expect(mapSnapScanPaymentStatus(payments[0].status)).toBe('completed');
    expect(parseSnapScanPaymentAmountCents(payments[0])).toBe(5250);
    expect(mapSnapScanPaymentStatus('error')).toBe('failed');
    expect(mapSnapScanPaymentStatus('pending')).toBe('processing');
  });

  it('handles numeric and invalid amounts', () => {
    expect(parseSnapScanAmountCents({ amount: 2500 })).toBe(2500);
    expect(parseSnapScanAmountCents({ amount: 25.5 })).toBe(2550);
    expect(parseSnapScanAmountCents({ amount: '100' })).toBe(100);
    expect(parseSnapScanAmountCents({ amount: 'oops' })).toBeNull();
  });

  it('extracts payments from arrays and empty payloads', () => {
    expect(extractSnapScanPayments([{ id: 1 }])).toHaveLength(1);
    expect(extractSnapScanPayments({})).toHaveLength(0);
  });
});
