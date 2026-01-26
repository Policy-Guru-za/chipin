import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const loadCreateHandler = async () => {
  vi.resetModules();
  return import('@/app/api/internal/api-keys/route');
};

const loadRotateHandler = async () => {
  vi.resetModules();
  return import('@/app/api/internal/api-keys/[id]/rotate/route');
};

const loadDeleteHandler = async () => {
  vi.resetModules();
  return import('@/app/api/internal/api-keys/[id]/route');
};

beforeEach(() => {
  process.env.INTERNAL_JOB_SECRET = 'secret';
});

afterEach(() => {
  delete process.env.INTERNAL_JOB_SECRET;
  vi.unmock('@/lib/api/keys');
  vi.unmock('@/lib/db/api-key-queries');
  vi.unmock('@/lib/audit');
  vi.resetModules();
});

describe('POST /api/internal/api-keys', () => {
  it('creates an api key', async () => {
    const createApiKeyRecord = vi.fn(async () => ({
      id: 'key-1',
      partnerId: 'partner-1',
      partnerName: 'Partner',
      scopes: ['dreamboards:read'],
      rateLimit: 1000,
      isActive: true,
      createdAt: new Date('2026-01-12T10:00:00.000Z'),
    }));

    vi.doMock('@/lib/db/api-key-queries', () => ({ createApiKeyRecord }));
    vi.doMock('@/lib/api/keys', () => ({
      resolveRateLimit: () => 1000,
      generateApiKeyToken: () => 'cpk_test_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      buildApiKeyRecord: () => ({ keyHash: 'hash', keyPrefix: 'cpk_test_' }),
    }));
    vi.doMock('@/lib/audit', () => ({ recordAuditEvent: vi.fn(async () => undefined) }));

    const { POST } = await loadCreateHandler();
    const response = await POST(
      new Request('http://localhost/api/internal/api-keys', {
        method: 'POST',
        headers: { authorization: 'Bearer secret' },
        body: JSON.stringify({
          partner_name: 'Partner',
          scopes: ['dreamboards:read'],
          environment: 'test',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.data.key).toBe('cpk_test_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
  });
});

describe('POST /api/internal/api-keys/[id]/rotate', () => {
  it('rotates an api key', async () => {
    const getApiKeyById = vi.fn(async () => ({
      id: 'key-1',
      partnerId: 'partner-1',
      partnerName: 'Partner',
      scopes: ['dreamboards:read'],
      rateLimit: 1000,
      isActive: true,
      keyPrefix: 'cpk_test_',
      createdAt: new Date('2026-01-12T10:00:00.000Z'),
    }));
    const createApiKeyRecord = vi.fn(async () => ({
      id: 'key-2',
      partnerId: 'partner-1',
      partnerName: 'Partner',
      scopes: ['dreamboards:read'],
      rateLimit: 1000,
      isActive: true,
      createdAt: new Date('2026-01-12T11:00:00.000Z'),
    }));
    const deactivateApiKey = vi.fn(async () => ({ id: 'key-1', isActive: false }));

    vi.doMock('@/lib/db/api-key-queries', () => ({
      getApiKeyById,
      createApiKeyRecord,
      deactivateApiKey,
    }));
    vi.doMock('@/lib/api/keys', () => ({
      resolveRateLimit: () => 1000,
      generateApiKeyToken: () => 'cpk_test_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      buildApiKeyRecord: () => ({ keyHash: 'hash', keyPrefix: 'cpk_test_' }),
    }));
    vi.doMock('@/lib/audit', () => ({ recordAuditEvent: vi.fn(async () => undefined) }));

    const { POST } = await loadRotateHandler();
    const response = await POST(
      new Request(
        'http://localhost/api/internal/api-keys/00000000-0000-4000-8000-000000000000/rotate',
        {
          method: 'POST',
          headers: { authorization: 'Bearer secret' },
          body: JSON.stringify({}),
        }
      ),
      { params: { id: '00000000-0000-4000-8000-000000000000' } }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.key).toBe('cpk_test_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
    expect(deactivateApiKey).toHaveBeenCalledWith('key-1');
  });
});

describe('DELETE /api/internal/api-keys/[id]', () => {
  it('revokes an api key', async () => {
    const getApiKeyById = vi.fn(async () => ({
      id: 'key-1',
      partnerId: 'partner-1',
      partnerName: 'Partner',
      scopes: ['dreamboards:read'],
      rateLimit: 1000,
      isActive: true,
      keyPrefix: 'cpk_test_',
      createdAt: new Date('2026-01-12T10:00:00.000Z'),
    }));
    const deactivateApiKey = vi.fn(async () => ({ id: 'key-1', isActive: false }));

    vi.doMock('@/lib/db/api-key-queries', () => ({ getApiKeyById, deactivateApiKey }));
    vi.doMock('@/lib/audit', () => ({ recordAuditEvent: vi.fn(async () => undefined) }));

    const { DELETE } = await loadDeleteHandler();
    const response = await DELETE(
      new Request('http://localhost/api/internal/api-keys/00000000-0000-4000-8000-000000000000', {
        method: 'DELETE',
        headers: { authorization: 'Bearer secret' },
      }),
      { params: { id: '00000000-0000-4000-8000-000000000000' } }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.id).toBe('00000000-0000-4000-8000-000000000000');
    expect(deactivateApiKey).toHaveBeenCalledWith('00000000-0000-4000-8000-000000000000');
  });
});
