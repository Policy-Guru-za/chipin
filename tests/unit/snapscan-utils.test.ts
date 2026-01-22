import { afterEach, describe, expect, it } from 'vitest';

import {
  extractSnapScanReference,
  mapSnapScanStatus,
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
});
