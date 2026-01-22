import { afterEach, describe, expect, it, vi } from 'vitest';

const neonMock = vi.fn(() => ({ sql: true }));
const drizzleMock = vi.fn(() => ({ marker: 'db' }));

vi.mock('@neondatabase/serverless', () => ({ neon: neonMock }));
vi.mock('drizzle-orm/neon-http', () => ({ drizzle: drizzleMock }));

const loadDb = async () => {
  vi.resetModules();
  return import('@/lib/db');
};

describe('db', () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;

  afterEach(() => {
    process.env.DATABASE_URL = originalDatabaseUrl;
    vi.clearAllMocks();
  });

  it('throws when DATABASE_URL is not set', async () => {
    delete process.env.DATABASE_URL;

    const { db } = await loadDb();

    expect(() => (db as { marker: string }).marker).toThrow('DATABASE_URL is not set');
    expect(neonMock).not.toHaveBeenCalled();
  });

  it('initializes once and reuses the drizzle instance', async () => {
    process.env.DATABASE_URL = 'postgres://example';

    const { db } = await loadDb();

    expect((db as { marker: string }).marker).toBe('db');
    expect((db as { marker: string }).marker).toBe('db');

    expect(neonMock).toHaveBeenCalledWith('postgres://example');
    expect(drizzleMock).toHaveBeenCalledTimes(1);
  });
});
