import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock logger
vi.mock('@/lib/observability/logger', () => ({
  log: vi.fn(),
}));

// Mock getClientIp
vi.mock('@/lib/utils/request', () => ({
  getClientIp: vi.fn(() => '127.0.0.1'),
}));

describe('POST /api/internal/analytics', () => {
  let postHandler: (request: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.resetModules();
    // Set development mode to bypass origin check
    vi.stubEnv('NODE_ENV', 'development');
    const routeModule = await import('@/app/api/internal/analytics/route');
    postHandler = routeModule.POST;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns 200 for valid web vitals payload', async () => {
    const request = new NextRequest('http://localhost/api/internal/analytics', {
      method: 'POST',
      body: JSON.stringify({
        name: 'LCP',
        value: 2500,
        rating: 'good',
        id: 'v1-123',
        page: '/home',
      }),
    });

    const response = await postHandler(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toEqual({ ok: true });
  });

  it('returns 400 for invalid metric name', async () => {
    const request = new NextRequest('http://localhost/api/internal/analytics', {
      method: 'POST',
      body: JSON.stringify({
        name: 'INVALID_METRIC',
        value: 100,
        rating: 'good',
        id: 'v1-123',
      }),
    });

    const response = await postHandler(request);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBe('Invalid payload');
  });

  it('returns 400 for missing required fields', async () => {
    const request = new NextRequest('http://localhost/api/internal/analytics', {
      method: 'POST',
      body: JSON.stringify({
        name: 'LCP',
        // missing value, rating, id
      }),
    });

    const response = await postHandler(request);
    expect(response.status).toBe(400);
  });

  it('returns 400 for invalid rating value', async () => {
    const request = new NextRequest('http://localhost/api/internal/analytics', {
      method: 'POST',
      body: JSON.stringify({
        name: 'FCP',
        value: 1000,
        rating: 'excellent', // invalid rating
        id: 'v1-123',
      }),
    });

    const response = await postHandler(request);
    expect(response.status).toBe(400);
  });

  it('returns 400 for malformed JSON', async () => {
    const request = new NextRequest('http://localhost/api/internal/analytics', {
      method: 'POST',
      body: 'not valid json',
    });

    const response = await postHandler(request);
    expect(response.status).toBe(400);
  });
});

describe('POST /api/internal/metrics', () => {
  let postHandler: (request: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.resetModules();
    vi.stubEnv('NODE_ENV', 'development');
    const routeModule = await import('@/app/api/internal/metrics/route');
    postHandler = routeModule.POST;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns 200 for valid custom metric payload', async () => {
    const request = new NextRequest('http://localhost/api/internal/metrics', {
      method: 'POST',
      body: JSON.stringify({
        name: 'contribution_completed',
        timestamp: Date.now(),
        properties: {
          dreamBoardId: 'db-123',
          amountCents: 10000,
          paymentMethod: 'payfast',
        },
      }),
    });

    const response = await postHandler(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toEqual({ ok: true });
  });

  it('returns 400 for invalid metric name', async () => {
    const request = new NextRequest('http://localhost/api/internal/metrics', {
      method: 'POST',
      body: JSON.stringify({
        name: 'invalid_event',
        timestamp: Date.now(),
      }),
    });

    const response = await postHandler(request);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBe('Invalid payload');
  });

  it('returns 400 for missing timestamp', async () => {
    const request = new NextRequest('http://localhost/api/internal/metrics', {
      method: 'POST',
      body: JSON.stringify({
        name: 'goal_reached',
        // missing timestamp
      }),
    });

    const response = await postHandler(request);
    expect(response.status).toBe(400);
  });

  it('accepts all valid metric names', async () => {
    const validNames = [
      'dream_board_created',
      'contribution_started',
      'contribution_completed',
      'goal_reached',
      'payment_method_selected',
      'wizard_step_completed',
      'share_link_clicked',
    ];

    for (const name of validNames) {
      const request = new NextRequest('http://localhost/api/internal/metrics', {
        method: 'POST',
        body: JSON.stringify({
          name,
          timestamp: Date.now(),
        }),
      });

      const response = await postHandler(request);
      expect(response.status).toBe(200);
    }
  });

  it('returns 400 for malformed JSON', async () => {
    const request = new NextRequest('http://localhost/api/internal/metrics', {
      method: 'POST',
      body: '{invalid json',
    });

    const response = await postHandler(request);
    expect(response.status).toBe(400);
  });
});
