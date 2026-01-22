import { describe, expect, it } from 'vitest';

import {
  DEFAULT_WEBHOOK_TOLERANCE_MINUTES,
  extractTimestampValue,
  validateWebhookTimestamp,
} from '@/lib/payments/webhook-utils';

describe('webhook timestamp helpers', () => {
  it('accepts a recent timestamp string', () => {
    const now = new Date('2026-01-22T12:00:00.000Z');
    const result = validateWebhookTimestamp('2026-01-22T11:55:00.000Z', {
      now,
      toleranceMinutes: DEFAULT_WEBHOOK_TOLERANCE_MINUTES,
    });

    expect(result.ok).toBe(true);
  });

  it('rejects missing timestamp values', () => {
    const result = validateWebhookTimestamp(null, { now: new Date('2026-01-22T12:00:00.000Z') });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('missing');
    }
  });

  it('rejects timestamps outside the window', () => {
    const now = new Date('2026-01-22T12:00:00.000Z');
    const result = validateWebhookTimestamp('2026-01-22T11:00:00.000Z', {
      now,
      toleranceMinutes: 30,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('outside_window');
    }
  });

  it('accepts epoch seconds values', () => {
    const now = new Date('2026-01-22T12:00:00.000Z');
    const epochSeconds = Math.floor(new Date('2026-01-22T12:05:00.000Z').getTime() / 1000);
    const result = validateWebhookTimestamp(epochSeconds, { now, toleranceMinutes: 10 });

    expect(result.ok).toBe(true);
  });

  it('extracts timestamps from payload keys', () => {
    const payload = { createdAt: '2026-01-22T12:00:00Z', ignored: 'nope' };
    const value = extractTimestampValue(payload, ['timestamp', 'createdAt']);

    expect(value).toBe('2026-01-22T12:00:00Z');
  });

  it('skips empty timestamp strings when falling back', () => {
    const payload = { timestamp: '  ', payment_date: '2026-01-22T12:00:00Z' };
    const value = extractTimestampValue(payload, ['timestamp', 'payment_date']);

    expect(value).toBe('2026-01-22T12:00:00Z');
  });
});
