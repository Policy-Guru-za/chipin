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

const isEnabledFlag = (value?: string) => value === 'true';

export const checkKarriAutomation = async (): Promise<HealthCheckResult> => {
  if (!isEnabledFlag(process.env.KARRI_AUTOMATION_ENABLED)) {
    return { ok: true, detail: 'disabled' };
  }
  if (!process.env.KARRI_BASE_URL || !process.env.KARRI_API_KEY) {
    return { ok: false, detail: 'KARRI_BASE_URL or KARRI_API_KEY is not set' };
  }
  if (!process.env.CARD_DATA_ENCRYPTION_KEY) {
    return { ok: false, detail: 'CARD_DATA_ENCRYPTION_KEY is not set' };
  }
  return { ok: true };
};

export const checkTakealotGiftCards = async (): Promise<HealthCheckResult> => {
  if (!isEnabledFlag(process.env.TAKEALOT_GIFTCARD_AUTOMATION_ENABLED)) {
    return { ok: true, detail: 'disabled' };
  }
  if (!process.env.TAKEALOT_GIFTCARD_API_URL || !process.env.TAKEALOT_GIFTCARD_API_KEY) {
    return {
      ok: false,
      detail: 'TAKEALOT_GIFTCARD_API_URL or TAKEALOT_GIFTCARD_API_KEY is not set',
    };
  }
  return { ok: true };
};

export const checkGivenGainAutomation = async (): Promise<HealthCheckResult> => {
  if (!isEnabledFlag(process.env.GIVENGAIN_AUTOMATION_ENABLED)) {
    return { ok: true, detail: 'disabled' };
  }
  if (!process.env.GIVENGAIN_API_URL || !process.env.GIVENGAIN_API_KEY) {
    return { ok: false, detail: 'GIVENGAIN_API_URL or GIVENGAIN_API_KEY is not set' };
  }
  return { ok: true };
};
