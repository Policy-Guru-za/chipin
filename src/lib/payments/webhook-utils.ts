export type TimestampValidationResult =
  | { ok: true; timestamp: Date }
  | { ok: false; reason: 'missing' | 'invalid' | 'outside_window' };

export type TimestampValidationOptions = {
  now?: Date;
  toleranceMinutes?: number;
};

export const DEFAULT_WEBHOOK_TOLERANCE_MINUTES = 30;
export const WEBHOOK_TOLERANCE_ENV_KEY = 'WEBHOOK_TIMESTAMP_TOLERANCE_MINUTES';

export const getWebhookToleranceMinutes = () => {
  const raw = process.env[WEBHOOK_TOLERANCE_ENV_KEY];
  if (!raw) return DEFAULT_WEBHOOK_TOLERANCE_MINUTES;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_WEBHOOK_TOLERANCE_MINUTES;
  }
  return parsed;
};

const hasTimezone = (value: string) => /Z$|[+-]\d{2}:?\d{2}$/.test(value);

const parseTimestampValue = (value: string | number) => {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    const normalized = value < 1_000_000_000_000 ? value * 1000 : value;
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d{10}$/.test(trimmed)) {
    const date = new Date(Number(trimmed) * 1000);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (/^\d{13}$/.test(trimmed)) {
    const date = new Date(Number(trimmed));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const normalized = trimmed.includes('T') ? trimmed : trimmed.replace(' ', 'T');
  const withZone = hasTimezone(normalized) ? normalized : `${normalized}Z`;
  const date = new Date(withZone);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const extractTimestampValue = (payload: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const candidate = payload[key];
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate;
    }
    if (typeof candidate === 'number' && Number.isFinite(candidate)) {
      return candidate;
    }
  }

  return null;
};

export const validateWebhookTimestamp = (
  value: string | number | null | undefined,
  options: TimestampValidationOptions = {}
): TimestampValidationResult => {
  if (value === null || value === undefined || value === '') {
    return { ok: false, reason: 'missing' };
  }

  const parsed = parseTimestampValue(value);
  if (!parsed) {
    return { ok: false, reason: 'invalid' };
  }

  const now = options.now ?? new Date();
  const toleranceMinutes = options.toleranceMinutes ?? getWebhookToleranceMinutes();
  const toleranceMs = toleranceMinutes * 60 * 1000;
  const diffMs = Math.abs(now.getTime() - parsed.getTime());

  if (diffMs > toleranceMs) {
    return { ok: false, reason: 'outside_window' };
  }

  return { ok: true, timestamp: parsed };
};
