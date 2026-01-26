import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const loadHandler = async () => {
  vi.resetModules();
  return import('@/app/api/v1/webhooks/route');
};

const loadDeleteHandler = async () => {
  vi.resetModules();
  return import('@/app/api/v1/webhooks/[id]/route');
};

const mockAuth = () => {
  vi.doMock('@/lib/api/handler', () => ({
    enforceApiAuth: vi.fn(async () => ({
      ok: true,
      context: {
        requestId: 'req-4',
        apiKey: { id: 'api-key-4', partnerId: 'partner-1', rateLimit: 1000 },
        rateLimitHeaders: new Headers(),
      },
    })),
  }));
};

beforeEach(() => {
  process.env.CARD_DATA_ENCRYPTION_KEY = 'test-secret';
});

afterEach(() => {
  delete process.env.CARD_DATA_ENCRYPTION_KEY;
  vi.unmock('@/lib/api/handler');
  vi.unmock('@/lib/db/api-queries');
  vi.unmock('@/lib/db/queries');
  vi.resetModules();
});

describe('POST /api/v1/webhooks', () => {
  it('creates a webhook endpoint', async () => {
    mockAuth();

    const createWebhookEndpoint = vi.fn(async () => ({
      id: 'wh-1',
      url: 'https://partner.example/webhooks',
      events: ['contribution.received'],
      isActive: true,
      createdAt: new Date('2026-01-12T10:00:00.000Z'),
    }));
    const markApiKeyUsed = vi.fn(async () => undefined);

    vi.doMock('@/lib/db/api-queries', () => ({
      createWebhookEndpoint,
      listWebhookEndpointsForApiKey: vi.fn(),
    }));
    vi.doMock('@/lib/db/queries', () => ({ markApiKeyUsed }));

    const { POST } = await loadHandler();
    const response = await POST(
      new Request('http://localhost/api/v1/webhooks', {
        method: 'POST',
        body: JSON.stringify({
          url: 'https://partner.example/webhooks',
          events: ['contribution.received'],
          secret: 'whsec_test_secret',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.data.id).toBe('wh-1');
    expect(markApiKeyUsed).toHaveBeenCalledWith('api-key-4');
  });
});

describe('GET /api/v1/webhooks', () => {
  it('lists webhook endpoints', async () => {
    mockAuth();

    const listWebhookEndpointsForApiKey = vi.fn(async () => [
      {
        id: 'wh-1',
        url: 'https://partner.example/webhooks',
        events: ['contribution.received'],
        isActive: true,
        createdAt: new Date('2026-01-12T10:00:00.000Z'),
      },
    ]);
    const markApiKeyUsed = vi.fn(async () => undefined);

    vi.doMock('@/lib/db/api-queries', () => ({ listWebhookEndpointsForApiKey }));
    vi.doMock('@/lib/db/queries', () => ({ markApiKeyUsed }));

    const { GET } = await loadHandler();
    const response = await GET(new Request('http://localhost/api/v1/webhooks'));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toHaveLength(1);
    expect(payload.data[0].id).toBe('wh-1');
    expect(markApiKeyUsed).toHaveBeenCalledWith('api-key-4');
  });
});

describe('DELETE /api/v1/webhooks/[id]', () => {
  it('deactivates a webhook endpoint', async () => {
    mockAuth();

    const deactivateWebhookEndpoint = vi.fn(async () => ({ id: 'wh-1' }));
    const markApiKeyUsed = vi.fn(async () => undefined);

    vi.doMock('@/lib/db/api-queries', () => ({ deactivateWebhookEndpoint }));
    vi.doMock('@/lib/db/queries', () => ({ markApiKeyUsed }));

    const { DELETE } = await loadDeleteHandler();
    const response = await DELETE(
      new Request('http://localhost/api/v1/webhooks/00000000-0000-4000-8000-000000000000'),
      { params: { id: '00000000-0000-4000-8000-000000000000' } }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.id).toBe('wh-1');
  });
});
