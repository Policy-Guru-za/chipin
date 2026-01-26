import type { listContributionsForReconciliation } from '@/lib/db/queries';

import { markDreamBoardFundedIfNeeded, updateContributionStatus } from '@/lib/db/queries';
import { sendEmail } from '@/lib/integrations/email';
import { log } from '@/lib/observability/logger';
import {
  decideReconciliation,
  getExpectedTotal,
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

export type ReconciliationMismatch = {
  provider: PendingContribution['paymentProvider'];
  paymentRef: string;
  expectedTotal: number;
  receivedTotal: number | null;
  status: ProviderStatus;
};

export type ReconciliationPassResult = {
  scanned: number;
  updated: number;
  failed: number;
  unresolved: number;
  mismatches: ReconciliationMismatch[];
};

type ReconciliationContext = {
  now: Date;
  requestId?: string;
  phase: 'primary' | 'long_tail';
  mismatches: ReconciliationMismatch[];
  updated: number;
  failed: number;
  unresolved: number;
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

const createReconciliationContext = (params: {
  now: Date;
  requestId?: string;
  phase: 'primary' | 'long_tail';
}): ReconciliationContext => ({
  now: params.now,
  requestId: params.requestId,
  phase: params.phase,
  mismatches: [],
  updated: 0,
  failed: 0,
  unresolved: 0,
});

const recordMismatch = (context: ReconciliationContext, mismatch: ReconciliationMismatch) => {
  context.mismatches.push(mismatch);
  log(
    'warn',
    'reconciliation.mismatch',
    {
      provider: mismatch.provider,
      paymentRef: mismatch.paymentRef,
      expectedTotal: mismatch.expectedTotal,
      receivedTotal: mismatch.receivedTotal,
      status: mismatch.status,
      phase: context.phase,
    },
    context.requestId
  );
};

const applyReconciliationDecision = async (
  context: ReconciliationContext,
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
      context.updated += 1;
    } else {
      context.failed += 1;
    }
    return;
  }

  if (decision.action === 'mismatch') {
    recordMismatch(context, {
      provider: contribution.paymentProvider,
      paymentRef: contribution.paymentRef,
      expectedTotal: decision.expectedTotal,
      receivedTotal: decision.receivedTotal,
      status: decision.status,
    });
    context.unresolved += 1;
    return;
  }

  context.unresolved += 1;
};

const recordPayfastPending = (pending: PendingContribution[], context: ReconciliationContext) => {
  for (const contribution of pending) {
    const ageMinutes = Math.round(
      (context.now.getTime() - contribution.createdAt.getTime()) / (60 * 1000)
    );
    log(
      'warn',
      'reconciliation.payfast_pending',
      {
        contributionId: contribution.id,
        paymentRef: contribution.paymentRef,
        status: contribution.paymentStatus,
        ageMinutes,
        phase: context.phase,
      },
      context.requestId
    );
    context.unresolved += 1;
  }
};

const buildReferenceMap = <T>(items: T[], getKey: (item: T) => string | null) => {
  const map = new Map<string, T>();
  items.forEach((item) => {
    const key = getKey(item);
    if (key) {
      map.set(key, item);
    }
  });
  return map;
};

const reconcileOzowPending = async (
  pending: PendingContribution[],
  context: ReconciliationContext
) => {
  if (pending.length === 0) return;
  const earliest = getEarliestDate(pending);
  log(
    'info',
    'reconciliation.ozow_paging_started',
    {
      phase: context.phase,
      fromDate: earliest.toISOString(),
      toDate: context.now.toISOString(),
      pendingCount: pending.length,
    },
    context.requestId
  );

  try {
    const { transactions, pagesFetched, pagingComplete } = await listOzowTransactionsPaged({
      fromDate: earliest.toISOString(),
      toDate: context.now.toISOString(),
    });
    log(
      'info',
      'reconciliation.ozow_paging_completed',
      {
        phase: context.phase,
        pagesFetched,
        transactionCount: transactions.length,
        pagingComplete,
      },
      context.requestId
    );

    if (!pagingComplete) {
      log(
        'warn',
        'reconciliation.ozow_paging_incomplete',
        { phase: context.phase, pagesFetched },
        context.requestId
      );
    }

    const transactionMap = buildReferenceMap(transactions, (transaction) =>
      extractOzowTransactionReference(transaction)
    );

    for (const contribution of pending) {
      const transaction = transactionMap.get(contribution.paymentRef);
      if (!transaction) {
        log(
          'warn',
          'reconciliation.ozow_missing',
          { paymentRef: contribution.paymentRef, phase: context.phase },
          context.requestId
        );
        context.unresolved += 1;
        continue;
      }

      const status = mapOzowTransactionStatus(transaction.status ?? null);
      const total = parseOzowTransactionAmountCents(transaction);
      await applyReconciliationDecision(context, contribution, status, total);
    }
  } catch (error) {
    log(
      'error',
      'reconciliation.ozow_fetch_failed',
      { error: error instanceof Error ? error.message : 'unknown_error', phase: context.phase },
      context.requestId
    );
    context.unresolved += pending.length;
  }
};

const reconcileSnapscanPending = async (
  pending: PendingContribution[],
  context: ReconciliationContext
) => {
  if (pending.length === 0) return;
  const earliest = getEarliestDate(pending);
  log(
    'info',
    'reconciliation.snapscan_batch_started',
    {
      phase: context.phase,
      fromDate: earliest.toISOString(),
      toDate: context.now.toISOString(),
      pendingCount: pending.length,
    },
    context.requestId
  );

  try {
    const payload = await listSnapScanPayments({
      startDate: earliest.toISOString(),
      endDate: context.now.toISOString(),
      status: 'completed,pending,error',
    });
    const payments = extractSnapScanPayments(payload);
    log(
      'info',
      'reconciliation.snapscan_batch_completed',
      { phase: context.phase, paymentCount: payments.length },
      context.requestId
    );

    const paymentMap = buildReferenceMap(payments, (payment) => payment.merchantReference ?? null);

    for (const contribution of pending) {
      const payment = paymentMap.get(contribution.paymentRef);
      if (!payment) {
        log(
          'warn',
          'reconciliation.snapscan_missing',
          { paymentRef: contribution.paymentRef, phase: context.phase },
          context.requestId
        );
        context.unresolved += 1;
        continue;
      }

      const status = mapSnapScanPaymentStatus(payment.status ?? null);
      const total = parseSnapScanPaymentAmountCents(payment);
      await applyReconciliationDecision(context, contribution, status, total);
    }
  } catch (error) {
    log(
      'error',
      'reconciliation.snapscan_fetch_failed',
      { error: error instanceof Error ? error.message : 'unknown_error', phase: context.phase },
      context.requestId
    );
    context.unresolved += pending.length;
  }
};

export const reconcilePending = async (params: {
  pending: PendingContribution[];
  now: Date;
  requestId?: string;
  phase: 'primary' | 'long_tail';
}): Promise<ReconciliationPassResult> => {
  const context = createReconciliationContext(params);
  const pendingByProvider = groupPendingByProvider(params.pending);

  recordPayfastPending(pendingByProvider.payfast, context);
  await reconcileOzowPending(pendingByProvider.ozow, context);
  await reconcileSnapscanPending(pendingByProvider.snapscan, context);

  return {
    scanned: params.pending.length,
    updated: context.updated,
    failed: context.failed,
    unresolved: context.unresolved,
    mismatches: context.mismatches,
  };
};

const buildMismatchEmail = (mismatches: ReconciliationMismatch[]) => {
  const listItems = mismatches
    .map(
      (item) =>
        `<li><strong>${item.provider}</strong> ${item.paymentRef} — expected ${item.expectedTotal}, received ${item.receivedTotal ?? 'n/a'} (${item.status}).</li>`
    )
    .join('');
  return `<p>Reconciliation mismatches detected:</p><ul>${listItems}</ul>`;
};

export const sendMismatchAlert = async (
  mismatches: ReconciliationMismatch[],
  requestId?: string
) => {
  const alertsEnabled = process.env.RECONCILIATION_ALERTS_ENABLED === 'true';
  const alertEmail = process.env.RECONCILIATION_ALERT_EMAIL;
  if (!alertsEnabled || !alertEmail || mismatches.length === 0) {
    return;
  }

  try {
    await sendEmail({
      to: alertEmail,
      subject: 'ChipIn reconciliation mismatches',
      html: buildMismatchEmail(mismatches),
    });
  } catch (error) {
    log(
      'error',
      'reconciliation.alert_failed',
      { error: error instanceof Error ? error.message : 'unknown_error' },
      requestId
    );
  }
};

export const createEmptyReconciliationResult = (): ReconciliationPassResult => ({
  scanned: 0,
  updated: 0,
  failed: 0,
  unresolved: 0,
  mismatches: [],
});

export const buildReconciliationResponse = (params: {
  primary: ReconciliationPassResult;
  longTail: ReconciliationPassResult;
  lookbackStart: Date;
  cutoff: Date;
  longTailStart: Date;
}) => {
  const { primary, longTail, lookbackStart, cutoff, longTailStart } = params;
  return {
    scanned: primary.scanned + longTail.scanned,
    updated: primary.updated + longTail.updated,
    failed: primary.failed + longTail.failed,
    mismatches: primary.mismatches.length + longTail.mismatches.length,
    unresolved: primary.unresolved + longTail.unresolved,
    window: {
      lookbackStart: lookbackStart.toISOString(),
      cutoff: cutoff.toISOString(),
      longTailStart: longTailStart.toISOString(),
    },
    longTail: {
      scanned: longTail.scanned,
      updated: longTail.updated,
      failed: longTail.failed,
      mismatches: longTail.mismatches.length,
      unresolved: longTail.unresolved,
    },
  };
};
