import { afterEach, describe, expect, it, vi } from 'vitest';

const loadHandler = async () => {
  vi.resetModules();
  return import('@/app/api/webhooks/ozow/route');
};

const mockRateLimit = (allowed: boolean) => {
  vi.doMock('@/lib/auth/rate-limit', () => ({
    enforceRateLimit: vi.fn(async () => ({
      allowed,
      retryAfterSeconds: allowed ? undefined : 120,
    })),
  }));
};

describe('Ozow webhook integration', () => {
  afterEach(() => {
    vi.unmock('@/lib/auth/rate-limit');
    vi.unmock('@/lib/db/queries');
    vi.unmock('@/lib/payments/ozow');
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('accepts a valid webhook payload', async () => {
    const contribution = {
      id: 'contrib-1',
      dreamBoardId: 'board-1',
      amountCents: 5000,
      feeCents: 250,
      paymentStatus: 'pending',
    };

    mockRateLimit(true);

    const getContributionByPaymentRef = vi.fn(async () => contribution);
    const updateContributionStatus = vi.fn(async () => undefined);
    const markDreamBoardFundedIfNeeded = vi.fn(async () => undefined);

    vi.doMock('@/lib/db/queries', () => ({
      getContributionByPaymentRef,
      updateContributionStatus,
      markDreamBoardFundedIfNeeded,
    }));

    vi.doMock('@/lib/payments/ozow', async () => {
      const actual =
        await vi.importActual<typeof import('@/lib/payments/ozow')>('@/lib/payments/ozow');
      return {
        ...actual,
        verifyOzowWebhook: vi.fn(() => ({
          data: {
            merchantReference: 'OZOW-123',
            status: 'PAID',
            amount: { value: 52.5 },
          },
        })),
      };
    });

    const { POST } = await loadHandler();
    const response = await POST(
      new Request('http://localhost/api/webhooks/ozow', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      })
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.received).toBe(true);

    expect(getContributionByPaymentRef).toHaveBeenCalledWith('ozow', 'OZOW-123');
    expect(updateContributionStatus).toHaveBeenCalledWith('contrib-1', 'completed');
    expect(markDreamBoardFundedIfNeeded).toHaveBeenCalledWith('board-1');
  });

  it('rejects payloads without amounts', async () => {
    const contribution = {
      id: 'contrib-1',
      dreamBoardId: 'board-1',
      amountCents: 5000,
      feeCents: 250,
      paymentStatus: 'pending',
    };

    mockRateLimit(true);

    const getContributionByPaymentRef = vi.fn(async () => contribution);
    const updateContributionStatus = vi.fn(async () => undefined);
    const markDreamBoardFundedIfNeeded = vi.fn(async () => undefined);

    vi.doMock('@/lib/db/queries', () => ({
      getContributionByPaymentRef,
      updateContributionStatus,
      markDreamBoardFundedIfNeeded,
    }));

    vi.doMock('@/lib/payments/ozow', async () => {
      const actual =
        await vi.importActual<typeof import('@/lib/payments/ozow')>('@/lib/payments/ozow');
      return {
        ...actual,
        verifyOzowWebhook: vi.fn(() => ({
          data: {
            merchantReference: 'OZOW-123',
            status: 'PAID',
          },
        })),
      };
    });

    const { POST } = await loadHandler();
    const response = await POST(
      new Request('http://localhost/api/webhooks/ozow', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      })
    );

    expect(response.status).toBe(400);
    expect(updateContributionStatus).not.toHaveBeenCalled();
    expect(markDreamBoardFundedIfNeeded).not.toHaveBeenCalled();
  });

  it('rejects requests when rate limited', async () => {
    mockRateLimit(false);

    const { POST } = await loadHandler();
    const response = await POST(
      new Request('http://localhost/api/webhooks/ozow', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      })
    );

    expect(response.status).toBe(429);
  });
});
