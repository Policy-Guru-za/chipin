import { NextRequest, NextResponse } from 'next/server';

import {
  listContributionsForReconciliation,
  listContributionsForLongTailReconciliation,
} from '@/lib/db/queries';
import { log } from '@/lib/observability/logger';
import { getLongTailStart, getReconciliationWindow } from '@/lib/payments/reconciliation';
import {
  buildReconciliationResponse,
  createEmptyReconciliationResult,
  reconcilePending,
  sendMismatchAlert,
  type ReconciliationPassResult,
} from '@/lib/payments/reconciliation-job';

const isAuthorized = (request: NextRequest) => {
  const secret = process.env.INTERNAL_JOB_SECRET;
  if (!secret) return false;
  const authHeader = request.headers.get('authorization');
  return authHeader === `Bearer ${secret}`;
};

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') ?? undefined;
  if (!process.env.INTERNAL_JOB_SECRET) {
    log('error', 'payments.reconcile_missing_secret', undefined, requestId);
    return NextResponse.json({ error: 'misconfigured' }, { status: 503 });
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const { lookbackStart, cutoff } = getReconciliationWindow(now);
  const pending = await listContributionsForReconciliation(lookbackStart, cutoff);
  const primaryResult = await reconcilePending({
    pending,
    now,
    requestId,
    phase: 'primary',
  });

  const longTailStart = getLongTailStart(now);
  let longTailResult: ReconciliationPassResult = createEmptyReconciliationResult();

  if (longTailStart < lookbackStart) {
    const longTailPending = await listContributionsForLongTailReconciliation(
      longTailStart,
      lookbackStart,
      cutoff
    );
    if (longTailPending.length > 0) {
      log('info', 'reconciliation.long_tail_scan', { scanned: longTailPending.length }, requestId);
      longTailResult = await reconcilePending({
        pending: longTailPending,
        now,
        requestId,
        phase: 'long_tail',
      });
    }
  } else {
    log(
      'warn',
      'reconciliation.long_tail_skipped',
      {
        reason: 'window_too_small',
        longTailStart: longTailStart.toISOString(),
        lookbackStart: lookbackStart.toISOString(),
      },
      requestId
    );
  }

  const mismatches = [...primaryResult.mismatches, ...longTailResult.mismatches];
  await sendMismatchAlert(mismatches, requestId);

  return NextResponse.json(
    buildReconciliationResponse({
      primary: primaryResult,
      longTail: longTailResult,
      lookbackStart,
      cutoff,
      longTailStart,
    })
  );
}
