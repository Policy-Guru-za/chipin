import { describe, expect, it } from 'vitest';

import {
  getRetentionCutoffs,
  NETWORK_METADATA_NULLS,
  RETENTION_ELIGIBLE_STATUSES,
  RETENTION_WINDOWS_DAYS,
} from '@/lib/retention/retention';

describe('retention cutoffs', () => {
  it('calculates retention windows in days', () => {
    const now = new Date('2026-01-22T00:00:00.000Z');
    const { ipCutoff, boardCutoff } = getRetentionCutoffs(now);

    const dayMs = 24 * 60 * 60 * 1000;
    const ipDeltaDays = Math.round((now.getTime() - ipCutoff.getTime()) / dayMs);
    const boardDeltaDays = Math.round((now.getTime() - boardCutoff.getTime()) / dayMs);

    expect(ipDeltaDays).toBe(RETENTION_WINDOWS_DAYS.ipAddress);
    expect(boardDeltaDays).toBe(RETENTION_WINDOWS_DAYS.boardGrace);
  });

  it('defines eligible board statuses for anonymization', () => {
    expect(RETENTION_ELIGIBLE_STATUSES).toEqual(['closed', 'paid_out', 'expired', 'cancelled']);
  });

  it('nulls network metadata fields', () => {
    expect(NETWORK_METADATA_NULLS).toEqual({ ipAddress: null, userAgent: null });
  });
});
