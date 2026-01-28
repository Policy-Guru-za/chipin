import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WEBHOOK_RETRY_MINUTES } from '@/lib/constants/webhooks';
import { buildWebhookHeaders, generateWebhookSignature } from '@/lib/webhooks';

describe('webhook signatures', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-28T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('builds headers using the provided event id', () => {
    const payload = JSON.stringify({ id: 'evt-1' });
    const secret = 'secret';
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = generateWebhookSignature(payload, secret, timestamp);
    const headers = buildWebhookHeaders(payload, secret, 'evt-1');

    expect(headers['X-ChipIn-Signature']).toBe(`t=${timestamp},v1=${signature}`);
    expect(headers['X-ChipIn-Event-Id']).toBe('evt-1');
  });

  it('matches the documented retry schedule', () => {
    expect(WEBHOOK_RETRY_MINUTES).toEqual([0, 1, 5, 30, 120, 720, 1440]);
  });
});
