import crypto from 'crypto';

import { afterEach, describe, expect, it, vi } from 'vitest';

const loadHandler = async () => {
  vi.resetModules();
  return import('@/app/api/webhooks/snapscan/route');
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
  SNAPSCAN_WEBHOOK_AUTH_KEY: process.env.SNAPSCAN_WEBHOOK_AUTH_KEY,
};

afterEach(() => {
  process.env.SNAPSCAN_WEBHOOK_AUTH_KEY = originalEnv.SNAPSCAN_WEBHOOK_AUTH_KEY;
  vi.unmock('@/lib/auth/rate-limit');
  vi.unmock('@/lib/db/queries');
  vi.clearAllMocks();
  vi.resetModules();
});

describe('SnapScan webhook integration - success', () => {
  it('accepts a valid webhook payload', async () => {
    process.env.SNAPSCAN_WEBHOOK_AUTH_KEY = 'snap-secret';
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

    const payload = {
      id: 'SNAP-123',
      status: 'COMPLETED',
      amount: 5250,
      timestamp: new Date().toISOString(),
    };
    const rawBody = new URLSearchParams({
      payload: JSON.stringify(payload),
    }).toString();
    const signature = crypto
      .createHmac('sha256', process.env.SNAPSCAN_WEBHOOK_AUTH_KEY)
      .update(rawBody)
      .digest('hex');

    const { POST } = await loadHandler();
    const response = await POST(
      new Request('http://localhost/api/webhooks/snapscan', {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          authorization: `SnapScan signature=${signature}`,
        },
        body: rawBody,
      })
    );

    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.received).toBe(true);

    expect(getContributionByPaymentRef).toHaveBeenCalledWith('snapscan', 'SNAP-123');
    expect(updateContributionStatus).toHaveBeenCalledWith('contrib-1', 'completed');
    expect(markDreamBoardFundedIfNeeded).toHaveBeenCalledWith('board-1');
  });
});

describe('SnapScan webhook integration - errors', () => {
  it('rejects payloads without amounts', async () => {
    process.env.SNAPSCAN_WEBHOOK_AUTH_KEY = 'snap-secret';
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

    const payload = {
      id: 'SNAP-123',
      status: 'COMPLETED',
      timestamp: new Date().toISOString(),
    };
    const rawBody = new URLSearchParams({
      payload: JSON.stringify(payload),
    }).toString();
    const signature = crypto
      .createHmac('sha256', process.env.SNAPSCAN_WEBHOOK_AUTH_KEY)
      .update(rawBody)
      .digest('hex');

    const { POST } = await loadHandler();
    const response = await POST(
      new Request('http://localhost/api/webhooks/snapscan', {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          authorization: `SnapScan signature=${signature}`,
        },
        body: rawBody,
      })
    );

    expect(response.status).toBe(400);
    expect(updateContributionStatus).not.toHaveBeenCalled();
    expect(markDreamBoardFundedIfNeeded).not.toHaveBeenCalled();
  });

  it('rejects requests when rate limited', async () => {
    process.env.SNAPSCAN_WEBHOOK_AUTH_KEY = 'snap-secret';
    mockRateLimit(false);

    const payload = {
      id: 'SNAP-123',
      status: 'COMPLETED',
      amount: 5250,
      timestamp: new Date().toISOString(),
    };
    const rawBody = new URLSearchParams({
      payload: JSON.stringify(payload),
    }).toString();
    const signature = crypto
      .createHmac('sha256', process.env.SNAPSCAN_WEBHOOK_AUTH_KEY)
      .update(rawBody)
      .digest('hex');

    const { POST } = await loadHandler();
    const response = await POST(
      new Request('http://localhost/api/webhooks/snapscan', {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          authorization: `SnapScan signature=${signature}`,
        },
        body: rawBody,
      })
    );

    expect(response.status).toBe(429);
  });

  it('accepts payloads without a timestamp', async () => {
    process.env.SNAPSCAN_WEBHOOK_AUTH_KEY = 'snap-secret';
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

    const payload = {
      id: 'SNAP-123',
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

    const { POST } = await loadHandler();
    const response = await POST(
      new Request('http://localhost/api/webhooks/snapscan', {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          authorization: `SnapScan signature=${signature}`,
        },
        body: rawBody,
      })
    );

    expect(response.status).toBe(200);
  });
});
