import { afterEach, describe, expect, it, vi } from 'vitest';

const mockLog = vi.fn();
const decryptSensitiveValue = vi.fn(() => 'secret');

const getPendingWebhookEvents = vi.fn();
const getActiveEndpointsForEvent = vi.fn();
const markEventDelivered = vi.fn();
const markEventFailed = vi.fn();

vi.mock('@/lib/observability/logger', () => ({ log: mockLog }));
vi.mock('@/lib/utils/encryption', () => ({ decryptSensitiveValue }));
vi.mock('@/lib/webhooks/queries', () => ({
  getPendingWebhookEvents,
  getActiveEndpointsForEvent,
  markEventDelivered,
  markEventFailed,
  createWebhookEvent: vi.fn(),
  getActiveApiKeysForPartner: vi.fn(async () => []),
}));

const buildEvent = () => ({
  id: 'evt-1',
  apiKeyId: 'key-1',
  eventType: 'contribution.received',
  payload: {
    id: 'evt-1',
    type: 'contribution.received',
    created_at: '2026-01-28T10:00:00Z',
    data: { contribution: { id: 'con-1' }, dream_board: { id: 'db-1' } },
  },
  status: 'pending',
  attempts: 0,
  lastAttemptAt: null,
  lastResponseCode: null,
  lastResponseBody: null,
  createdAt: new Date('2026-01-28T10:00:00Z'),
});

const buildEndpoint = (id: string) => ({
  id,
  apiKeyId: 'key-1',
  url: `https://hooks.test/${id}`,
  events: ['*'],
  secret: 'encrypted',
  isActive: true,
});

describe('webhook dispatcher', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('marks delivered when all endpoints succeed', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => 'ok',
    }));
    vi.stubGlobal('fetch', fetchMock);

    getPendingWebhookEvents.mockResolvedValueOnce([buildEvent()]);
    getActiveEndpointsForEvent.mockResolvedValueOnce([buildEndpoint('a'), buildEndpoint('b')]);

    const { processWebhookQueue } = await import('@/lib/webhooks/dispatcher');
    const processed = await processWebhookQueue(1);

    expect(processed).toBe(1);
    expect(markEventDelivered).toHaveBeenCalledWith('evt-1');
    expect(markEventFailed).not.toHaveBeenCalled();
  });

  it('marks failed when any endpoint fails', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, text: async () => 'ok' })
      .mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'fail' });
    vi.stubGlobal('fetch', fetchMock);

    getPendingWebhookEvents.mockResolvedValueOnce([buildEvent()]);
    getActiveEndpointsForEvent.mockResolvedValueOnce([buildEndpoint('a'), buildEndpoint('b')]);

    const { processWebhookQueue } = await import('@/lib/webhooks/dispatcher');
    const processed = await processWebhookQueue(1);

    expect(processed).toBe(1);
    expect(markEventFailed).toHaveBeenCalled();
    expect(markEventDelivered).not.toHaveBeenCalled();
  });
});
