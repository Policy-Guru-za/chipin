import { kv } from '@vercel/kv';
import { sql } from 'drizzle-orm';

import { db } from '@/lib/db';

export type HealthCheckResult = {
  ok: boolean;
  detail?: string;
};

const errorDetail = (error: unknown) => {
  if (process.env.NODE_ENV === 'production') return 'unavailable';
  if (error instanceof Error) return error.message;
  return 'Unknown error';
};

export const checkDb = async (): Promise<HealthCheckResult> => {
  if (!process.env.DATABASE_URL) {
    return { ok: false, detail: 'DATABASE_URL is not set' };
  }

  try {
    await db.execute(sql`select 1`);
    return { ok: true };
  } catch (error) {
    return { ok: false, detail: errorDetail(error) };
  }
};

export const checkKv = async (): Promise<HealthCheckResult> => {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return { ok: false, detail: 'KV_REST_API_URL or KV_REST_API_TOKEN is not set' };
  }

  try {
    await kv.get('health:ping');
    return { ok: true };
  } catch (error) {
    return { ok: false, detail: errorDetail(error) };
  }
};

export const checkBlobToken = async (): Promise<HealthCheckResult> => {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return { ok: false, detail: 'BLOB_READ_WRITE_TOKEN is not set' };
  }

  return { ok: true };
};
