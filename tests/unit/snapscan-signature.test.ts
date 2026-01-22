import crypto from 'crypto';

import { afterEach, describe, expect, it } from 'vitest';

import {
  extractSnapScanReference,
  mapSnapScanStatus,
  parseSnapScanAmountCents,
  parseSnapScanPayload,
  verifySnapScanSignature,
} from '@/lib/payments/snapscan';

describe('SnapScan webhook helpers', () => {
  const originalEnv = {
    SNAPSCAN_WEBHOOK_AUTH_KEY: process.env.SNAPSCAN_WEBHOOK_AUTH_KEY,
  };

  afterEach(() => {
    process.env.SNAPSCAN_WEBHOOK_AUTH_KEY = originalEnv.SNAPSCAN_WEBHOOK_AUTH_KEY;
  });

  it('verifies HMAC signatures and parses payloads', () => {
    process.env.SNAPSCAN_WEBHOOK_AUTH_KEY = 'snap-secret';

    const payload = {
      id: 'CONTRIB-ABC123',
      status: 'COMPLETED',
      amount: 5250,
    };
    const rawBody = new URLSearchParams({
      payload: JSON.stringify(payload),
    }).toString();
    const signature = crypto
      .createHmac('sha256', process.env.SNAPSCAN_WEBHOOK_AUTH_KEY)
      .update(rawBody)
      .digest('hex');

    expect(verifySnapScanSignature(rawBody, `SnapScan signature=${signature}`)).toBe(true);

    const parsed = parseSnapScanPayload(rawBody);
    expect(parsed.payload).toEqual(payload);
    expect(extractSnapScanReference(parsed.payload!)).toBe(payload.id);
    expect(parseSnapScanAmountCents(parsed.payload!)).toBe(5250);
    expect(mapSnapScanStatus(parsed.payload!)).toBe('completed');
  });
});
