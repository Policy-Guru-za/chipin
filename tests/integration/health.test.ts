import { afterEach, describe, expect, it, vi } from 'vitest';

const loadLiveHandler = async () => {
  vi.resetModules();
  return import('@/app/health/live/route');
};

const loadReadyHandler = async () => {
  vi.resetModules();
  return import('@/app/health/ready/route');
};

const envSnapshot = () => ({
  DATABASE_URL: process.env.DATABASE_URL,
  KV_REST_API_URL: process.env.KV_REST_API_URL,
  KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN,
  BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
});

const restoreEnv = (snapshot: Record<string, string | undefined>) => {
  process.env.DATABASE_URL = snapshot.DATABASE_URL;
  process.env.KV_REST_API_URL = snapshot.KV_REST_API_URL;
  process.env.KV_REST_API_TOKEN = snapshot.KV_REST_API_TOKEN;
  process.env.BLOB_READ_WRITE_TOKEN = snapshot.BLOB_READ_WRITE_TOKEN;
};

describe('health endpoints', () => {
  const originalEnv = envSnapshot();

  afterEach(() => {
    restoreEnv(originalEnv);
    vi.unmock('@/lib/health/checks');
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns 200 for /health/live', async () => {
    const { GET } = await loadLiveHandler();
    const response = await GET(new Request('http://localhost/health/live'));

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.status).toBe('ok');
    expect(payload.timestamp).toBeDefined();
  });

  it('returns 503 for /health/ready when env is missing', async () => {
    delete process.env.DATABASE_URL;
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    delete process.env.BLOB_READ_WRITE_TOKEN;

    const { GET } = await loadReadyHandler();
    const response = await GET(new Request('http://localhost/health/ready'));

    expect(response.status).toBe(503);
    const payload = await response.json();
    expect(payload.status).toBe('not_ready');
    expect(payload.checks.db.ok).toBe(false);
    expect(payload.checks.kv.ok).toBe(false);
    expect(payload.checks.blob.ok).toBe(false);
  });

  it('returns 200 for /health/ready when adapters are healthy', async () => {
    vi.doMock('@/lib/health/checks', () => ({
      checkDb: vi.fn(async () => ({ ok: true })),
      checkKv: vi.fn(async () => ({ ok: true })),
      checkBlobToken: vi.fn(async () => ({ ok: true })),
    }));

    const { GET } = await loadReadyHandler();
    const response = await GET(new Request('http://localhost/health/ready'));

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.status).toBe('ready');
  });
});
