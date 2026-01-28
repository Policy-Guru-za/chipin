import { afterEach, describe, expect, it, vi } from 'vitest';

const loadHandler = async () => {
  vi.resetModules();
  return import('@/app/api/internal/webhooks/process/route');
};

const originalEnv = {
  INTERNAL_JOB_SECRET: process.env.INTERNAL_JOB_SECRET,
};

afterEach(() => {
  process.env.INTERNAL_JOB_SECRET = originalEnv.INTERNAL_JOB_SECRET;
  vi.unmock('@/lib/webhooks');
  vi.unmock('@/lib/auth/rate-limit');
  vi.clearAllMocks();
  vi.resetModules();
});

describe('POST /api/internal/webhooks/process', () => {
  it('processes the webhook queue', async () => {
    process.env.INTERNAL_JOB_SECRET = 'secret';

    const processWebhookQueue = vi.fn(async () => 3);
    vi.doMock('@/lib/webhooks', () => ({ processWebhookQueue }));
    vi.doMock('@/lib/auth/rate-limit', () => ({
      enforceRateLimit: vi.fn(async () => ({ allowed: true, retryAfterSeconds: 0 })),
    }));

    const { POST } = await loadHandler();
    const response = await POST(
      new Request('http://localhost/api/internal/webhooks/process', {
        method: 'POST',
        headers: { authorization: 'Bearer secret' },
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ processed: 3 });
    expect(processWebhookQueue).toHaveBeenCalled();
  });
});
