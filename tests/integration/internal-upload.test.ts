import { afterEach, describe, expect, it, vi } from 'vitest';

const loadHandler = async () => {
  vi.resetModules();
  return import('@/app/api/internal/upload/route');
};

const createFile = () => new File([new Uint8Array(10)], 'photo.jpg', { type: 'image/jpeg' });

afterEach(() => {
  vi.unmock('@/lib/auth/session');
  vi.unmock('@/lib/integrations/blob');
  vi.resetModules();
});

describe('POST /api/internal/upload', () => {
  it('returns unauthorized without a session', async () => {
    vi.doMock('@/lib/auth/session', () => ({ getSession: vi.fn(async () => null) }));

    const { POST } = await loadHandler();
    const response = await POST(
      new Request('http://localhost/api/internal/upload', { method: 'POST' })
    );

    expect(response.status).toBe(401);
  });

  it('uploads a child photo when valid', async () => {
    vi.doMock('@/lib/auth/session', () => ({
      getSession: vi.fn(async () => ({ hostId: 'host-1', email: 'host@example.com' })),
    }));

    const uploadChildPhoto = vi.fn(async () => ({ url: 'https://blob.example/photo.jpg' }));
    vi.doMock('@/lib/integrations/blob', async () => {
      const actual =
        await vi.importActual<typeof import('@/lib/integrations/blob')>('@/lib/integrations/blob');
      return { ...actual, uploadChildPhoto };
    });

    const formData = new FormData();
    formData.set('file', createFile());

    const { POST } = await loadHandler();
    const response = await POST(
      new Request('http://localhost/api/internal/upload', {
        method: 'POST',
        body: formData,
      })
    );

    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.url).toBe('https://blob.example/photo.jpg');
    expect(uploadChildPhoto).toHaveBeenCalled();
  });

  it('returns a validation error when upload fails', async () => {
    vi.doMock('@/lib/auth/session', () => ({
      getSession: vi.fn(async () => ({ hostId: 'host-1', email: 'host@example.com' })),
    }));

    vi.doMock('@/lib/integrations/blob', async () => {
      const actual =
        await vi.importActual<typeof import('@/lib/integrations/blob')>('@/lib/integrations/blob');
      return {
        ...actual,
        uploadChildPhoto: vi.fn(async () => {
          throw new actual.UploadChildPhotoError('invalid_type', 'Invalid file type');
        }),
      };
    });

    const formData = new FormData();
    formData.set('file', createFile());

    const { POST } = await loadHandler();
    const response = await POST(
      new Request('http://localhost/api/internal/upload', {
        method: 'POST',
        body: formData,
      })
    );

    const payload = await response.json();
    expect(response.status).toBe(400);
    expect(payload.error).toBe('invalid_type');
  });
});
