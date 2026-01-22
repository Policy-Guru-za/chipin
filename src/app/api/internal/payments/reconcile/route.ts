import { NextRequest, NextResponse } from 'next/server';

import {
  listContributionsForReconciliation,
  listContributionsForLongTailReconciliation,
  markDreamBoardFundedIfNeeded,
  updateContributionStatus,
} from '@/lib/db/queries';
import { sendEmail } from '@/lib/integrations/email';
import { log } from '@/lib/observability/logger';
import {
  decideReconciliation,
  getExpectedTotal,
  getLongTailStart,
  getReconciliationWindow,
  type ProviderStatus,
} from '@/lib/payments/reconciliation';
import {
  extractOzowTransactionReference,
  listOzowTransactionsPaged,
  mapOzowTransactionStatus,
  parseOzowTransactionAmountCents,
} from '@/lib/payments/ozow';
import {
  extractSnapScanPayments,
  listSnapScanPayments,
  mapSnapScanPaymentStatus,
  parseSnapScanPaymentAmountCents,
} from '@/lib/payments/snapscan';

type PendingContribution = Awaited<ReturnType<typeof listContributionsForReconciliation>>[number];

type ReconciliationMismatch = {
  provider: PendingContribution['paymentProvider'];
  paymentRef: string;
  expectedTotal: number;
  receivedTotal: number | null;
  status: ProviderStatus;
};

type ReconciliationPassResult = {
  scanned: number;
  updated: number;
  failed: number;
  unresolved: number;
  mismatches: ReconciliationMismatch[];
};

const groupPendingByProvider = (pending: PendingContribution[]) =>
  pending.reduce<Record<PendingContribution['paymentProvider'], PendingContribution[]>>(
    (acc, contribution) => {
      acc[contribution.paymentProvider] = acc[contribution.paymentProvider] ?? [];
      acc[contribution.paymentProvider].push(contribution);
      return acc;
    },
    { payfast: [], ozow: [], snapscan: [] }
  );

const getEarliestDate = (pending: PendingContribution[]) =>
  pending.reduce(
    (min, contribution) => (contribution.createdAt < min ? contribution.createdAt : min),
    pending[0].createdAt
  );

const reconcilePending = async (params: {
  pending: PendingContribution[];
  now: Date;
  requestId?: string;
  phase: 'primary' | 'long_tail';
}): Promise<ReconciliationPassResult> => {
  const { pending, now, requestId, phase } = params;
  const mismatches: ReconciliationMismatch[] = [];
  let updated = 0;
  let failed = 0;
  let unresolved = 0;

  const recordMismatch = (mismatch: ReconciliationMismatch) => {
    mismatches.push(mismatch);
    log(
      'warn',
      'reconciliation.mismatch',
      {
        provider: mismatch.provider,
        paymentRef: mismatch.paymentRef,
        expectedTotal: mismatch.expectedTotal,
        receivedTotal: mismatch.receivedTotal,
        status: mismatch.status,
        phase,
      },
      requestId
    );
  };

  const handleDecision = async (
    contribution: PendingContribution,
    status: ProviderStatus,
    total: number | null
  ) => {
    const expectedTotal = getExpectedTotal(contribution.amountCents, contribution.feeCents);
    const decision = decideReconciliation(status, expectedTotal, total);

    if (decision.action === 'update') {
      await updateContributionStatus(contribution.id, decision.status);
      if (decision.status === 'completed') {
        await markDreamBoardFundedIfNeeded(contribution.dreamBoardId);
        updated += 1;
      } else {
        failed += 1;
      }
      return;
    }

    if (decision.action === 'mismatch') {
      recordMismatch({
        provider: contribution.paymentProvider,
        paymentRef: contribution.paymentRef,
        expectedTotal: decision.expectedTotal,
        receivedTotal: decision.receivedTotal,
        status: decision.status,
      });
      unresolved += 1;
      return;
    }

    unresolved += 1;
  };

  const pendingByProvider = groupPendingByProvider(pending);

  for (const contribution of pendingByProvider.payfast) {
    const ageMinutes = Math.round((now.getTime() - contribution.createdAt.getTime()) / (60 * 1000));
    log(
      'warn',
      'reconciliation.payfast_pending',
      {
        contributionId: contribution.id,
        paymentRef: contribution.paymentRef,
        status: contribution.paymentStatus,
        ageMinutes,
        phase,
      },
      requestId
    );
    unresolved += 1;
  }

  if (pendingByProvider.ozow.length > 0) {
    const earliest = getEarliestDate(pendingByProvider.ozow);
    log(
      'info',
      'reconciliation.ozow_paging_started',
      {
        phase,
        fromDate: earliest.toISOString(),
        toDate: now.toISOString(),
        pendingCount: pendingByProvider.ozow.length,
      },
      requestId
    );

    try {
      const { transactions, pagesFetched, pagingComplete } = await listOzowTransactionsPaged({
        fromDate: earliest.toISOString(),
        toDate: now.toISOString(),
      });
      log(
        'info',
        'reconciliation.ozow_paging_completed',
        {
          phase,
          pagesFetched,
          transactionCount: transactions.length,
          pagingComplete,
        },
        requestId
      );

      if (!pagingComplete) {
        log('warn', 'reconciliation.ozow_paging_incomplete', { phase, pagesFetched }, requestId);
      }

      const transactionMap = new Map<string, (typeof transactions)[number]>();

      transactions.forEach((transaction) => {
        const reference = extractOzowTransactionReference(transaction);
        if (reference) {
          transactionMap.set(reference, transaction);
        }
      });

      for (const contribution of pendingByProvider.ozow) {
        const transaction = transactionMap.get(contribution.paymentRef);
        if (!transaction) {
          log(
            'warn',
            'reconciliation.ozow_missing',
            { paymentRef: contribution.paymentRef, phase },
            requestId
          );
          unresolved += 1;
          continue;
        }

        const status = mapOzowTransactionStatus(transaction.status ?? null);
        const total = parseOzowTransactionAmountCents(transaction);
        await handleDecision(contribution, status, total);
      }
    } catch (error) {
      log(
        'error',
        'reconciliation.ozow_fetch_failed',
        { error: error instanceof Error ? error.message : 'unknown_error', phase },
        requestId
      );
      unresolved += pendingByProvider.ozow.length;
    }
  }

  if (pendingByProvider.snapscan.length > 0) {
    const earliest = getEarliestDate(pendingByProvider.snapscan);
    log(
      'info',
      'reconciliation.snapscan_batch_started',
      {
        phase,
        fromDate: earliest.toISOString(),
        toDate: now.toISOString(),
        pendingCount: pendingByProvider.snapscan.length,
      },
      requestId
    );

    try {
      const payload = await listSnapScanPayments({
        startDate: earliest.toISOString(),
        endDate: now.toISOString(),
        status: 'completed,pending,error',
      });
      const payments = extractSnapScanPayments(payload);
      log(
        'info',
        'reconciliation.snapscan_batch_completed',
        { phase, paymentCount: payments.length },
        requestId
      );
      const paymentMap = new Map<string, (typeof payments)[number]>();

      payments.forEach((payment) => {
        if (payment.merchantReference) {
          paymentMap.set(payment.merchantReference, payment);
        }
      });

      for (const contribution of pendingByProvider.snapscan) {
        const payment = paymentMap.get(contribution.paymentRef);
        if (!payment) {
          log(
            'warn',
            'reconciliation.snapscan_missing',
            { paymentRef: contribution.paymentRef, phase },
            requestId
          );
          unresolved += 1;
          continue;
        }

        const status = mapSnapScanPaymentStatus(payment.status ?? null);
        const total = parseSnapScanPaymentAmountCents(payment);
        await handleDecision(contribution, status, total);
      }
    } catch (error) {
      log(
        'error',
        'reconciliation.snapscan_fetch_failed',
        { error: error instanceof Error ? error.message : 'unknown_error', phase },
        requestId
      );
      unresolved += pendingByProvider.snapscan.length;
    }
  }

  return {
    scanned: pending.length,
    updated,
    failed,
    unresolved,
    mismatches,
  };
};

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
  let longTailResult: ReconciliationPassResult = {
    scanned: 0,
    updated: 0,
    failed: 0,
    unresolved: 0,
    mismatches: [],
  };

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
  const updated = primaryResult.updated + longTailResult.updated;
  const failed = primaryResult.failed + longTailResult.failed;
  const unresolved = primaryResult.unresolved + longTailResult.unresolved;
  const scanned = primaryResult.scanned + longTailResult.scanned;

  const alertsEnabled = process.env.RECONCILIATION_ALERTS_ENABLED === 'true';
  const alertEmail = process.env.RECONCILIATION_ALERT_EMAIL;
  if (alertsEnabled && alertEmail && mismatches.length > 0) {
    const listItems = mismatches
      .map(
        (item) =>
          `<li><strong>${item.provider}</strong> ${item.paymentRef} — expected ${item.expectedTotal}, received ${item.receivedTotal ?? 'n/a'} (${item.status}).</li>`
      )
      .join('');
    const html = `<p>Reconciliation mismatches detected:</p><ul>${listItems}</ul>`;

    try {
      await sendEmail({
        to: alertEmail,
        subject: 'ChipIn reconciliation mismatches',
        html,
      });
    } catch (error) {
      log(
        'error',
        'reconciliation.alert_failed',
        { error: error instanceof Error ? error.message : 'unknown_error' },
        requestId
      );
    }
  }

  return NextResponse.json({
    scanned,
    updated,
    failed,
    mismatches: mismatches.length,
    unresolved,
    window: {
      lookbackStart: lookbackStart.toISOString(),
      cutoff: cutoff.toISOString(),
      longTailStart: longTailStart.toISOString(),
    },
    longTail: {
      scanned: longTailResult.scanned,
      updated: longTailResult.updated,
      failed: longTailResult.failed,
      mismatches: longTailResult.mismatches.length,
      unresolved: longTailResult.unresolved,
    },
  });
}
