import { and, desc, eq, lt, or, sql, type SQL } from 'drizzle-orm';

import type { PaginationCursor } from '@/lib/api/pagination';

import { db } from './index';
import { contributions, dreamBoards, payouts, webhookEndpoints } from './schema';

type DreamBoardStatus = typeof dreamBoards.$inferSelect.status;
type ContributionStatus = typeof contributions.$inferSelect.paymentStatus;
type PayoutType = typeof payouts.$inferSelect.type;

const dreamBoardApiFields = {
  id: dreamBoards.id,
  slug: dreamBoards.slug,
  childName: dreamBoards.childName,
  childPhotoUrl: dreamBoards.childPhotoUrl,
  birthdayDate: dreamBoards.birthdayDate,
  giftType: dreamBoards.giftType,
  giftData: dreamBoards.giftData,
  overflowGiftData: dreamBoards.overflowGiftData,
  goalCents: dreamBoards.goalCents,
  payoutMethod: dreamBoards.payoutMethod,
  message: dreamBoards.message,
  deadline: dreamBoards.deadline,
  status: dreamBoards.status,
  createdAt: dreamBoards.createdAt,
  updatedAt: dreamBoards.updatedAt,
  raisedCents: sql<number>`COALESCE(SUM(${contributions.netCents}), 0)`.as('raised_cents'),
  contributionCount: sql<number>`COUNT(${contributions.id})`.as('contribution_count'),
};

const applyCursor = (params: {
  cursor?: PaginationCursor | null;
  createdAtColumn:
    | typeof dreamBoards.createdAt
    | typeof contributions.createdAt
    | typeof payouts.createdAt;
  idColumn: typeof dreamBoards.id | typeof contributions.id | typeof payouts.id;
}) => {
  if (!params.cursor) return null;
  return or(
    lt(params.createdAtColumn, params.cursor.createdAt),
    and(eq(params.createdAtColumn, params.cursor.createdAt), lt(params.idColumn, params.cursor.id))
  );
};

export const listDreamBoardsForApi = async (params: {
  status?: string;
  limit: number;
  cursor?: PaginationCursor | null;
}) => {
  const conditions: SQL[] = [];
  if (params.status) {
    conditions.push(eq(dreamBoards.status, params.status as DreamBoardStatus));
  }

  const cursorCondition = applyCursor({
    cursor: params.cursor,
    createdAtColumn: dreamBoards.createdAt,
    idColumn: dreamBoards.id,
  });
  if (cursorCondition) {
    conditions.push(cursorCondition);
  }

  const baseQuery = db
    .select(dreamBoardApiFields)
    .from(dreamBoards)
    .leftJoin(
      contributions,
      and(
        eq(contributions.dreamBoardId, dreamBoards.id),
        eq(contributions.paymentStatus, 'completed')
      )
    )
    .groupBy(dreamBoards.id)
    .orderBy(desc(dreamBoards.createdAt), desc(dreamBoards.id))
    .limit(params.limit);

  return conditions.length ? baseQuery.where(and(...conditions)) : baseQuery;
};

export const listContributionsForApi = async (params: {
  dreamBoardId: string;
  status?: string;
  limit: number;
  cursor?: PaginationCursor | null;
}) => {
  const conditions: SQL[] = [eq(contributions.dreamBoardId, params.dreamBoardId)];
  if (params.status) {
    conditions.push(eq(contributions.paymentStatus, params.status as ContributionStatus));
  }

  const cursorCondition = applyCursor({
    cursor: params.cursor,
    createdAtColumn: contributions.createdAt,
    idColumn: contributions.id,
  });
  if (cursorCondition) {
    conditions.push(cursorCondition);
  }

  return db
    .select({
      id: contributions.id,
      dreamBoardId: contributions.dreamBoardId,
      contributorName: contributions.contributorName,
      message: contributions.message,
      amountCents: contributions.amountCents,
      feeCents: contributions.feeCents,
      netCents: contributions.netCents,
      paymentStatus: contributions.paymentStatus,
      createdAt: contributions.createdAt,
    })
    .from(contributions)
    .where(and(...conditions))
    .orderBy(desc(contributions.createdAt), desc(contributions.id))
    .limit(params.limit);
};

export const getContributionForApi = async (id: string) => {
  const [contribution] = await db
    .select({
      id: contributions.id,
      dreamBoardId: contributions.dreamBoardId,
      contributorName: contributions.contributorName,
      message: contributions.message,
      amountCents: contributions.amountCents,
      feeCents: contributions.feeCents,
      netCents: contributions.netCents,
      paymentStatus: contributions.paymentStatus,
      createdAt: contributions.createdAt,
    })
    .from(contributions)
    .where(eq(contributions.id, id))
    .limit(1);

  return contribution ?? null;
};

export const listPendingPayoutsForApi = async (params: {
  type?: string;
  limit: number;
  cursor?: PaginationCursor | null;
}) => {
  const conditions: SQL[] = [eq(payouts.status, 'pending')];
  if (params.type) {
    conditions.push(eq(payouts.type, params.type as PayoutType));
  }

  const cursorCondition = applyCursor({
    cursor: params.cursor,
    createdAtColumn: payouts.createdAt,
    idColumn: payouts.id,
  });
  if (cursorCondition) {
    conditions.push(cursorCondition);
  }

  return db
    .select({
      id: payouts.id,
      dreamBoardId: payouts.dreamBoardId,
      type: payouts.type,
      grossCents: payouts.grossCents,
      feeCents: payouts.feeCents,
      netCents: payouts.netCents,
      recipientData: payouts.recipientData,
      status: payouts.status,
      externalRef: payouts.externalRef,
      errorMessage: payouts.errorMessage,
      createdAt: payouts.createdAt,
      completedAt: payouts.completedAt,
    })
    .from(payouts)
    .where(and(...conditions))
    .orderBy(desc(payouts.createdAt), desc(payouts.id))
    .limit(params.limit);
};

export const getPayoutForApi = async (id: string) => {
  const [payout] = await db
    .select({
      id: payouts.id,
      dreamBoardId: payouts.dreamBoardId,
      type: payouts.type,
      grossCents: payouts.grossCents,
      feeCents: payouts.feeCents,
      netCents: payouts.netCents,
      recipientData: payouts.recipientData,
      status: payouts.status,
      externalRef: payouts.externalRef,
      errorMessage: payouts.errorMessage,
      createdAt: payouts.createdAt,
      completedAt: payouts.completedAt,
    })
    .from(payouts)
    .where(eq(payouts.id, id))
    .limit(1);

  return payout ?? null;
};

export const createWebhookEndpoint = async (params: {
  apiKeyId: string;
  url: string;
  events: string[];
  secret: string;
}) => {
  const [created] = await db
    .insert(webhookEndpoints)
    .values({
      apiKeyId: params.apiKeyId,
      url: params.url,
      events: params.events,
      secret: params.secret,
    })
    .returning({
      id: webhookEndpoints.id,
      url: webhookEndpoints.url,
      events: webhookEndpoints.events,
      isActive: webhookEndpoints.isActive,
      createdAt: webhookEndpoints.createdAt,
    });

  return created ?? null;
};

export const listWebhookEndpointsForApiKey = async (apiKeyId: string) =>
  db
    .select({
      id: webhookEndpoints.id,
      url: webhookEndpoints.url,
      events: webhookEndpoints.events,
      isActive: webhookEndpoints.isActive,
      createdAt: webhookEndpoints.createdAt,
    })
    .from(webhookEndpoints)
    .where(and(eq(webhookEndpoints.apiKeyId, apiKeyId), eq(webhookEndpoints.isActive, true)))
    .orderBy(desc(webhookEndpoints.createdAt));

export const deactivateWebhookEndpoint = async (params: { id: string; apiKeyId: string }) => {
  const [updated] = await db
    .update(webhookEndpoints)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(webhookEndpoints.id, params.id), eq(webhookEndpoints.apiKeyId, params.apiKeyId)))
    .returning({ id: webhookEndpoints.id });

  return updated ?? null;
};
