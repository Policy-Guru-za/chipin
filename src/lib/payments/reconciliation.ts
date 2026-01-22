export const RECONCILIATION_LOOKBACK_HOURS_KEY = 'RECONCILIATION_LOOKBACK_HOURS';
export const RECONCILIATION_MIN_AGE_MINUTES_KEY = 'RECONCILIATION_MIN_AGE_MINUTES';
export const RECONCILIATION_LONG_TAIL_HOURS_KEY = 'RECONCILIATION_LONG_TAIL_HOURS';

const DEFAULT_LOOKBACK_HOURS = 24;
const DEFAULT_MIN_AGE_MINUTES = 10;
const DEFAULT_LONG_TAIL_HOURS = 24 * 7;

export type ReconciliationWindow = {
  lookbackStart: Date;
  cutoff: Date;
};

export type ProviderStatus = 'completed' | 'failed' | 'processing' | 'unknown';

export type ReconciliationDecision =
  | { action: 'update'; status: 'completed' | 'failed' }
  | {
      action: 'mismatch';
      expectedTotal: number;
      receivedTotal: number | null;
      status: ProviderStatus;
    }
  | { action: 'skip'; reason: 'pending' | 'unknown' };

export const getReconciliationWindow = (now: Date = new Date()): ReconciliationWindow => {
  const lookbackHours = Number(process.env[RECONCILIATION_LOOKBACK_HOURS_KEY]);
  const minAgeMinutes = Number(process.env[RECONCILIATION_MIN_AGE_MINUTES_KEY]);

  const resolvedLookbackHours =
    Number.isFinite(lookbackHours) && lookbackHours > 0 ? lookbackHours : DEFAULT_LOOKBACK_HOURS;
  const resolvedMinAgeMinutes =
    Number.isFinite(minAgeMinutes) && minAgeMinutes > 0 ? minAgeMinutes : DEFAULT_MIN_AGE_MINUTES;

  return {
    lookbackStart: new Date(now.getTime() - resolvedLookbackHours * 60 * 60 * 1000),
    cutoff: new Date(now.getTime() - resolvedMinAgeMinutes * 60 * 1000),
  };
};

export const getExpectedTotal = (amountCents: number, feeCents: number) => amountCents + feeCents;

export const getLongTailStart = (now: Date = new Date()) => {
  const longTailHours = Number(process.env[RECONCILIATION_LONG_TAIL_HOURS_KEY]);
  const resolvedLongTailHours =
    Number.isFinite(longTailHours) && longTailHours > 0 ? longTailHours : DEFAULT_LONG_TAIL_HOURS;

  return new Date(now.getTime() - resolvedLongTailHours * 60 * 60 * 1000);
};

export const decideReconciliation = (
  status: ProviderStatus,
  expectedTotal: number,
  receivedTotal: number | null
): ReconciliationDecision => {
  if (status === 'completed') {
    if (receivedTotal === null || receivedTotal !== expectedTotal) {
      return { action: 'mismatch', expectedTotal, receivedTotal, status };
    }

    return { action: 'update', status: 'completed' };
  }

  if (status === 'failed') {
    return { action: 'update', status: 'failed' };
  }

  if (status === 'processing') {
    return { action: 'skip', reason: 'pending' };
  }

  return { action: 'skip', reason: 'unknown' };
};
