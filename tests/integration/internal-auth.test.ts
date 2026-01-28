import { afterEach, describe, expect, it, vi } from 'vitest';

const loadMagicLinkHandler = async () => {
  vi.resetModules();
  return import('@/app/api/internal/auth/magic-link/route');
};

const loadVerifyHandler = async () => {
  vi.resetModules();
  return import('@/app/api/internal/auth/verify/route');
};

const loadMeHandler = async () => {
  vi.resetModules();
  return import('@/app/api/internal/auth/me/route');
};

afterEach(() => {
  vi.unmock('@/lib/auth/magic-link');
  vi.unmock('@/lib/auth/session');
  vi.unmock('@/lib/db/queries');
  vi.resetModules();
});

describe('POST /api/internal/auth/magic-link', () => {
  it('returns 429 when rate limited', async () => {
    vi.doMock('@/lib/auth/magic-link', () => ({
      sendMagicLink: vi.fn(async () => ({
        ok: false,
        reason: 'rate_limited',
        retryAfterSeconds: 120,
      })),
    }));

    const { POST } = await loadMagicLinkHandler();
    const response = await POST(
      new Request('http://localhost/api/internal/auth/magic-link', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'host@example.com' }),
      })
    );

    const payload = await response.json();
    expect(response.status).toBe(429);
    expect(payload.error).toBe('rate_limited');
  });

  it('returns ok when magic link is sent', async () => {
    vi.doMock('@/lib/auth/magic-link', () => ({
      sendMagicLink: vi.fn(async () => ({ ok: true })),
    }));

    const { POST } = await loadMagicLinkHandler();
    const response = await POST(
      new Request('http://localhost/api/internal/auth/magic-link', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'host@example.com' }),
      })
    );

    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
  });
});

describe('GET /api/internal/auth/verify', () => {
  it('creates a session when token is valid', async () => {
    const verifyMagicLink = vi.fn(async () => 'host@example.com');
    const createSession = vi.fn(async () => undefined);
    const ensureHostForEmail = vi.fn(async () => ({ id: 'host-1', email: 'host@example.com' }));

    vi.doMock('@/lib/auth/magic-link', () => ({ verifyMagicLink }));
    vi.doMock('@/lib/auth/session', () => ({ createSession }));
    vi.doMock('@/lib/db/queries', () => ({ ensureHostForEmail }));

    const { GET } = await loadVerifyHandler();
    const response = await GET(
      new Request(`http://localhost/api/internal/auth/verify?token=${'a'.repeat(32)}`)
    );

    expect(response.status).toBe(200);
    expect(verifyMagicLink).toHaveBeenCalled();
    expect(createSession).toHaveBeenCalledWith('host-1', 'host@example.com');
  });
});

describe('GET /api/internal/auth/me', () => {
  it('returns unauthorized when no session exists', async () => {
    vi.doMock('@/lib/auth/session', () => ({ getSession: vi.fn(async () => null) }));

    const { GET } = await loadMeHandler();
    const response = await GET();

    expect(response.status).toBe(401);
  });
});
