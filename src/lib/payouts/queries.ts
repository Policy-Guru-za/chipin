import { and, desc, eq, gte, inArray, lte, sql, type SQL } from 'drizzle-orm';

import { db } from '@/lib/db';
import { contributions, dreamBoards, hosts, payoutItems, payouts } from '@/lib/db/schema';

export const getDreamBoardPayoutContext = async (dreamBoardId: string) => {
  const [board] = await db
    .select({
      id: dreamBoards.id,
      slug: dreamBoards.slug,
      childName: dreamBoards.childName,
      giftType: dreamBoards.giftType,
      giftData: dreamBoards.giftData,
      goalCents: dreamBoards.goalCents,
      payoutMethod: dreamBoards.payoutMethod,
      payoutEmail: dreamBoards.payoutEmail,
      overflowGiftData: dreamBoards.overflowGiftData,
      status: dreamBoards.status,
      hostEmail: hosts.email,
      hostId: hosts.id,
    })
    .from(dreamBoards)
    .leftJoin(hosts, eq(hosts.id, dreamBoards.hostId))
    .where(eq(dreamBoards.id, dreamBoardId))
    .limit(1);

  return board ?? null;
};

export const getContributionTotalsForDreamBoard = async (dreamBoardId: string) => {
  const [totals] = await db
    .select({
      raisedCents: sql<number>`COALESCE(SUM(${contributions.netCents}), 0)`.as('raised_cents'),
      platformFeeCents: sql<number>`COALESCE(SUM(${contributions.feeCents}), 0)`.as(
        'platform_fee_cents'
      ),
    })
    .from(contributions)
    .where(
      and(
        eq(contributions.dreamBoardId, dreamBoardId),
        eq(contributions.paymentStatus, 'completed')
      )
    );

  return (
    totals ?? {
      raisedCents: 0,
      platformFeeCents: 0,
    }
  );
};

export const listPayoutsForDreamBoard = async (dreamBoardId: string) =>
  db
    .select({
      id: payouts.id,
      type: payouts.type,
      status: payouts.status,
      netCents: payouts.netCents,
      createdAt: payouts.createdAt,
      completedAt: payouts.completedAt,
      dreamBoardId: payouts.dreamBoardId,
    })
    .from(payouts)
    .where(eq(payouts.dreamBoardId, dreamBoardId))
    .orderBy(desc(payouts.createdAt));

type PayoutRecord = typeof payouts.$inferSelect;
type PayoutStatus = PayoutRecord['status'];
type PayoutType = PayoutRecord['type'];

const getExpectedPayoutTypes = (board: {
  giftType: string;
  payoutMethod: PayoutType;
  raisedCents: number;
  goalCents: number;
}) => {
  if (board.giftType === 'philanthropy') {
    return ['philanthropy_donation'] as PayoutType[];
  }

  const expected: PayoutType[] = [board.payoutMethod];
  if (board.raisedCents > board.goalCents) {
    expected.push('philanthropy_donation');
  }

  return expected;
};

export const listDreamBoardsReadyForPayouts = async () => {
  const boards = await db
    .select({
      id: dreamBoards.id,
      slug: dreamBoards.slug,
      childName: dreamBoards.childName,
      giftType: dreamBoards.giftType,
      status: dreamBoards.status,
      payoutMethod: dreamBoards.payoutMethod,
      payoutEmail: dreamBoards.payoutEmail,
      goalCents: dreamBoards.goalCents,
      raisedCents: sql<number>`COALESCE(SUM(${contributions.netCents}), 0)`.as('raised_cents'),
      contributionCount: sql<number>`COUNT(${contributions.id})`.as('contribution_count'),
      hostEmail: hosts.email,
      updatedAt: dreamBoards.updatedAt,
    })
    .from(dreamBoards)
    .leftJoin(
      contributions,
      and(
        eq(contributions.dreamBoardId, dreamBoards.id),
        eq(contributions.paymentStatus, 'completed')
      )
    )
    .leftJoin(hosts, eq(hosts.id, dreamBoards.hostId))
    .where(inArray(dreamBoards.status, ['closed']))
    .groupBy(dreamBoards.id, hosts.email)
    .orderBy(desc(dreamBoards.updatedAt));

  if (!boards.length) return [];

  const boardIds = boards.map((board) => board.id);
  const payoutRows = await db
    .select({
      dreamBoardId: payouts.dreamBoardId,
      type: payouts.type,
    })
    .from(payouts)
    .where(inArray(payouts.dreamBoardId, boardIds));

  const payoutMap = new Map<string, Set<PayoutType>>();
  for (const row of payoutRows) {
    const existing = payoutMap.get(row.dreamBoardId) ?? new Set<PayoutType>();
    existing.add(row.type as PayoutType);
    payoutMap.set(row.dreamBoardId, existing);
  }

  return boards.filter((board) => {
    if (board.raisedCents <= 0) {
      return false;
    }

    const expected = getExpectedPayoutTypes({
      giftType: board.giftType,
      payoutMethod: board.payoutMethod as PayoutType,
      raisedCents: board.raisedCents,
      goalCents: board.goalCents,
    });
    const existing = payoutMap.get(board.id) ?? new Set<PayoutType>();

    return expected.some((type) => !existing.has(type));
  });
};

export const listPayoutsForAdmin = async (filters?: {
  statuses?: Array<PayoutStatus>;
  createdFrom?: Date;
  createdTo?: Date;
}) => {
  const baseQuery = db
    .select({
      id: payouts.id,
      type: payouts.type,
      status: payouts.status,
      netCents: payouts.netCents,
      grossCents: payouts.grossCents,
      feeCents: payouts.feeCents,
      createdAt: payouts.createdAt,
      completedAt: payouts.completedAt,
      dreamBoardId: dreamBoards.id,
      dreamBoardSlug: dreamBoards.slug,
      childName: dreamBoards.childName,
      payoutEmail: dreamBoards.payoutEmail,
      hostEmail: hosts.email,
    })
    .from(payouts)
    .leftJoin(dreamBoards, eq(dreamBoards.id, payouts.dreamBoardId))
    .leftJoin(hosts, eq(hosts.id, dreamBoards.hostId));

  const conditions: SQL[] = [];

  if (filters?.statuses?.length) {
    conditions.push(inArray(payouts.status, filters.statuses));
  }

  if (filters?.createdFrom) {
    conditions.push(gte(payouts.createdAt, filters.createdFrom));
  }

  if (filters?.createdTo) {
    conditions.push(lte(payouts.createdAt, filters.createdTo));
  }

  const filteredQuery = conditions.length ? baseQuery.where(and(...conditions)) : baseQuery;

  return filteredQuery.orderBy(desc(payouts.createdAt));
};

export const getPayoutDetail = async (payoutId: string) => {
  const [payout] = await db
    .select({
      id: payouts.id,
      type: payouts.type,
      status: payouts.status,
      netCents: payouts.netCents,
      grossCents: payouts.grossCents,
      feeCents: payouts.feeCents,
      recipientData: payouts.recipientData,
      externalRef: payouts.externalRef,
      errorMessage: payouts.errorMessage,
      createdAt: payouts.createdAt,
      completedAt: payouts.completedAt,
      dreamBoardId: dreamBoards.id,
      dreamBoardSlug: dreamBoards.slug,
      childName: dreamBoards.childName,
      payoutEmail: dreamBoards.payoutEmail,
      giftData: dreamBoards.giftData,
      overflowGiftData: dreamBoards.overflowGiftData,
      payoutMethod: dreamBoards.payoutMethod,
      giftType: dreamBoards.giftType,
      goalCents: dreamBoards.goalCents,
      statusLabel: dreamBoards.status,
      hostEmail: hosts.email,
    })
    .from(payouts)
    .leftJoin(dreamBoards, eq(dreamBoards.id, payouts.dreamBoardId))
    .leftJoin(hosts, eq(hosts.id, dreamBoards.hostId))
    .where(eq(payouts.id, payoutId))
    .limit(1);

  return payout ?? null;
};

export const listPayoutItemsForPayout = async (payoutId: string) =>
  db
    .select({
      id: payoutItems.id,
      type: payoutItems.type,
      amountCents: payoutItems.amountCents,
      metadata: payoutItems.metadata,
      createdAt: payoutItems.createdAt,
    })
    .from(payoutItems)
    .where(eq(payoutItems.payoutId, payoutId))
    .orderBy(desc(payoutItems.createdAt));
