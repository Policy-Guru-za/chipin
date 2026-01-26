import * as Sentry from '@sentry/nextjs';
import { eq, sql } from 'drizzle-orm';

import { recordAuditEvent, type AuditActor } from '@/lib/audit';
import { db } from '@/lib/db';
import { dreamBoards, payoutItems, payouts } from '@/lib/db/schema';
import { log } from '@/lib/observability/logger';

import { calculatePayoutTotals } from './calculation';
import {
  getContributionTotalsForDreamBoard,
  getDreamBoardPayoutContext,
  listPayoutsForDreamBoard,
} from './queries';

type PayoutRecipientData = Record<string, unknown>;

type PayoutRecord = typeof payouts.$inferSelect;
type PayoutItemRecord = typeof payoutItems.$inferSelect;
type PayoutType = PayoutRecord['type'];
type PayoutItemType = PayoutItemRecord['type'];

const normalizeRecipientData = (payload: unknown): PayoutRecipientData => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {};
  }
  return payload as PayoutRecipientData;
};

const getRecipientDataForGift = (params: {
  payoutEmail: string;
  childName: string;
  payoutMethod: string;
  giftType: string;
  giftData?: Record<string, unknown> | null;
  karriCardNumber?: string | null;
}) => ({
  ...(params.payoutMethod === 'karri_card_topup'
    ? (() => {
        if (!params.karriCardNumber) {
          throw new Error('Karri card number is missing');
        }
        return {
          cardNumberEncrypted: params.karriCardNumber,
          cardholderName: params.childName,
        };
      })()
    : {
        email: params.payoutEmail,
        giftData: params.giftData ?? null,
        productUrl: params.giftData?.productUrl ?? null,
      }),
  payoutMethod: params.payoutMethod,
  giftType: params.giftType,
  childName: params.childName,
});

const getRecipientDataForOverflow = (params: {
  payoutEmail: string;
  childName: string;
  overflowGiftData?: Record<string, unknown> | null;
}) => ({
  email: params.payoutEmail,
  donorEmail: params.payoutEmail,
  donorName: params.childName,
  causeId: params.overflowGiftData?.causeId ?? null,
  childName: params.childName,
  overflowGiftData: params.overflowGiftData ?? null,
});

const ensureBoardReady = (status: string) => {
  const readyStatuses = ['closed'] as const;
  if (!readyStatuses.includes(status as (typeof readyStatuses)[number])) {
    throw new Error('Dream Board is not ready for payout');
  }
};

const getAdjustedCalculation = (
  giftType: string,
  calculation: ReturnType<typeof calculatePayoutTotals>
) =>
  giftType === 'philanthropy'
    ? {
        ...calculation,
        giftCents: calculation.raisedCents,
        overflowCents: 0,
      }
    : calculation;

const buildPayoutPlans = (params: {
  board: Awaited<ReturnType<typeof getDreamBoardPayoutContext>>;
  calculation: ReturnType<typeof calculatePayoutTotals>;
  existingTypes: Set<PayoutType>;
}): Array<{
  type: PayoutType;
  itemType: PayoutItemType;
  amountCents: number;
  recipientData: PayoutRecipientData;
}> => {
  const { board, calculation, existingTypes } = params;
  if (!board) return [];

  const payoutPlans: Array<{
    type: PayoutType;
    itemType: PayoutItemType;
    amountCents: number;
    recipientData: PayoutRecipientData;
  }> = [];

  if (calculation.giftCents > 0 && !existingTypes.has(board.payoutMethod)) {
    payoutPlans.push({
      type: board.payoutMethod,
      itemType: 'gift',
      amountCents: calculation.giftCents,
      recipientData: getRecipientDataForGift({
        payoutEmail: board.payoutEmail,
        childName: board.childName,
        payoutMethod: board.payoutMethod,
        giftType: board.giftType,
        giftData: board.giftData as Record<string, unknown> | null,
        karriCardNumber: board.karriCardNumber,
      }),
    });
  }

  if (calculation.overflowCents > 0 && !existingTypes.has('philanthropy_donation')) {
    payoutPlans.push({
      type: 'philanthropy_donation',
      itemType: 'overflow',
      amountCents: calculation.overflowCents,
      recipientData: getRecipientDataForOverflow({
        payoutEmail: board.payoutEmail,
        childName: board.childName,
        overflowGiftData: board.overflowGiftData as Record<string, unknown> | null,
      }),
    });
  }

  return payoutPlans;
};

export async function createPayoutsForDreamBoard(params: {
  dreamBoardId: string;
  actor: AuditActor;
}) {
  const board = await getDreamBoardPayoutContext(params.dreamBoardId);
  if (!board) {
    throw new Error('Dream Board not found');
  }

  ensureBoardReady(board.status);

  const totals = await getContributionTotalsForDreamBoard(board.id);
  const calculation = calculatePayoutTotals({
    raisedCents: totals.raisedCents,
    goalCents: board.goalCents,
    platformFeeCents: totals.platformFeeCents,
  });

  if (calculation.raisedCents === 0) {
    return { created: [], calculation, skipped: true };
  }

  const adjustedCalculation = getAdjustedCalculation(board.giftType, calculation);

  const existing = await listPayoutsForDreamBoard(board.id);
  const existingTypes = new Set(existing.map((payout) => payout.type));
  const payoutPlans = buildPayoutPlans({
    board,
    calculation: adjustedCalculation,
    existingTypes,
  });

  if (!payoutPlans.length) {
    return { created: [], calculation: adjustedCalculation, skipped: true };
  }

  const createdPayouts: Array<{ id: string; type: string }> = [];

  try {
    await db.transaction(async (tx) => {
      for (const plan of payoutPlans) {
        const [created] = await tx
          .insert(payouts)
          .values({
            partnerId: board.partnerId,
            dreamBoardId: board.id,
            type: plan.type,
            grossCents: plan.amountCents,
            feeCents: 0,
            netCents: plan.amountCents,
            recipientData: plan.recipientData,
          })
          .onConflictDoNothing({
            target: [payouts.dreamBoardId, payouts.type],
          })
          .returning({ id: payouts.id, type: payouts.type });

        if (!created) {
          continue;
        }

        await tx.insert(payoutItems).values({
          payoutId: created.id,
          dreamBoardId: board.id,
          type: plan.itemType,
          amountCents: plan.amountCents,
          metadata: { calculation: adjustedCalculation },
        });

        await recordAuditEvent({
          actor: params.actor,
          action: 'payout.created',
          target: { type: 'payout', id: created.id },
          metadata: {
            dreamBoardId: board.id,
            payoutType: plan.type,
            amountCents: plan.amountCents,
          },
          database: tx,
        });

        createdPayouts.push(created);
      }
    });
  } catch (error) {
    log('error', 'payout_create_failed', {
      dreamBoardId: board.id,
      message: error instanceof Error ? error.message : 'unknown_error',
    });
    Sentry.captureException(error);
    throw error;
  }

  return {
    created: createdPayouts,
    calculation: adjustedCalculation,
    skipped: createdPayouts.length === 0,
  };
}

export async function completePayout(params: {
  payoutId: string;
  externalRef: string;
  actor: AuditActor;
  completedAt?: Date;
}) {
  const [payout] = await db
    .select({
      id: payouts.id,
      status: payouts.status,
      dreamBoardId: payouts.dreamBoardId,
      type: payouts.type,
    })
    .from(payouts)
    .where(eq(payouts.id, params.payoutId))
    .limit(1);

  if (!payout) {
    throw new Error('Payout not found');
  }

  if (payout.status === 'completed') {
    return payout;
  }

  const completedAt = params.completedAt ?? new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(payouts)
      .set({
        status: 'completed',
        externalRef: params.externalRef,
        errorMessage: null,
        completedAt,
      })
      .where(eq(payouts.id, payout.id));

    await recordAuditEvent({
      actor: params.actor,
      action: 'payout.completed',
      target: { type: 'payout', id: payout.id },
      metadata: {
        externalRef: params.externalRef,
        payoutType: payout.type,
      },
      database: tx,
    });

    const [summary] = await tx
      .select({
        total: sql<number>`COUNT(${payouts.id})`.as('total'),
        completed:
          sql<number>`COUNT(${payouts.id}) FILTER (WHERE ${payouts.status} = 'completed')`.as(
            'completed'
          ),
      })
      .from(payouts)
      .where(eq(payouts.dreamBoardId, payout.dreamBoardId));

    if (summary?.total && summary.total === summary.completed) {
      await tx
        .update(dreamBoards)
        .set({ status: 'paid_out', updatedAt: new Date() })
        .where(eq(dreamBoards.id, payout.dreamBoardId));
    }
  });

  return payout;
}

export async function failPayout(params: {
  payoutId: string;
  errorMessage: string;
  actor: AuditActor;
}) {
  const [payout] = await db
    .select({ id: payouts.id, status: payouts.status, dreamBoardId: payouts.dreamBoardId })
    .from(payouts)
    .where(eq(payouts.id, params.payoutId))
    .limit(1);

  if (!payout) {
    throw new Error('Payout not found');
  }

  if (payout.status === 'failed') {
    return payout;
  }

  await db.transaction(async (tx) => {
    await tx
      .update(payouts)
      .set({ status: 'failed', errorMessage: params.errorMessage, completedAt: null })
      .where(eq(payouts.id, payout.id));

    await recordAuditEvent({
      actor: params.actor,
      action: 'payout.failed',
      target: { type: 'payout', id: payout.id },
      metadata: { reason: params.errorMessage },
      database: tx,
    });
  });

  return payout;
}

export async function addPayoutNote(params: { payoutId: string; note: string; actor: AuditActor }) {
  await recordAuditEvent({
    actor: params.actor,
    action: 'payout.note',
    target: { type: 'payout', id: params.payoutId },
    metadata: { note: params.note },
  });
}

export async function updatePayoutRecipientData(params: {
  payoutId: string;
  data: Record<string, unknown>;
  actor: AuditActor;
  action?: string;
  metadata?: Record<string, unknown>;
}) {
  const [payout] = await db
    .select({ id: payouts.id, recipientData: payouts.recipientData })
    .from(payouts)
    .where(eq(payouts.id, params.payoutId))
    .limit(1);

  if (!payout) {
    throw new Error('Payout not found');
  }

  const mergedRecipientData = {
    ...normalizeRecipientData(payout.recipientData),
    ...params.data,
  };

  await db.transaction(async (tx) => {
    await tx
      .update(payouts)
      .set({ recipientData: mergedRecipientData })
      .where(eq(payouts.id, payout.id));

    await recordAuditEvent({
      actor: params.actor,
      action: params.action ?? 'payout.recipient.updated',
      target: { type: 'payout', id: payout.id },
      metadata: params.metadata ?? params.data,
      database: tx,
    });
  });

  return mergedRecipientData;
}

export async function addPayoutReceipt(params: {
  payoutId: string;
  type: 'receipt' | 'certificate';
  url: string;
  contentType: string;
  filename: string;
  encrypted: boolean;
  actor: AuditActor;
}) {
  const prefix = params.type === 'receipt' ? 'receipt' : 'certificate';
  const field = `${prefix}Url`;
  return updatePayoutRecipientData({
    payoutId: params.payoutId,
    data: {
      [field]: params.url,
      [`${prefix}ContentType`]: params.contentType,
      [`${prefix}Filename`]: params.filename,
      [`${prefix}Encrypted`]: params.encrypted,
    },
    actor: params.actor,
    action: 'payout.receipt.uploaded',
    metadata: { type: params.type, url: params.url },
  });
}
