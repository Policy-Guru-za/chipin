import { and, desc, eq, gte, inArray, lt, ne, sql } from 'drizzle-orm';

import type { PaymentProvider } from '@/lib/payments';
import { isValidUuid } from '@/lib/utils/validation';

import { db } from './index';
import { apiKeys, contributions, dreamBoards, hosts } from './schema';

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export async function getHostByEmail(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const [host] = await db
    .select({ id: hosts.id, email: hosts.email, name: hosts.name })
    .from(hosts)
    .where(eq(hosts.email, normalizedEmail))
    .limit(1);

  return host ?? null;
}

export async function ensureHostForEmail(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const existing = await getHostByEmail(normalizedEmail);
  if (existing) {
    return existing;
  }

  await db
    .insert(hosts)
    .values({ email: normalizedEmail })
    .onConflictDoNothing({ target: hosts.email });

  const [created] = await db
    .select({ id: hosts.id, email: hosts.email, name: hosts.name })
    .from(hosts)
    .where(eq(hosts.email, normalizedEmail))
    .limit(1);

  if (!created) {
    throw new Error('Unable to create host');
  }

  return created;
}

export async function getDreamBoardById(id: string, hostId: string) {
  const [board] = await db
    .select({
      id: dreamBoards.id,
      slug: dreamBoards.slug,
      childName: dreamBoards.childName,
      childPhotoUrl: dreamBoards.childPhotoUrl,
      giftData: dreamBoards.giftData,
      goalCents: dreamBoards.goalCents,
      status: dreamBoards.status,
      deadline: dreamBoards.deadline,
    })
    .from(dreamBoards)
    .where(and(eq(dreamBoards.id, id), eq(dreamBoards.hostId, hostId)))
    .limit(1);

  return board ?? null;
}

export async function getDreamBoardSlugById(id: string) {
  const [board] = await db
    .select({ slug: dreamBoards.slug })
    .from(dreamBoards)
    .where(eq(dreamBoards.id, id))
    .limit(1);

  return board?.slug ?? null;
}

export async function getDreamBoardBySlug(slug: string, partnerId?: string) {
  const [board] = await db
    .select({
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
    })
    .from(dreamBoards)
    .leftJoin(
      contributions,
      and(
        eq(contributions.dreamBoardId, dreamBoards.id),
        eq(contributions.paymentStatus, 'completed')
      )
    )
    .where(
      partnerId
        ? and(eq(dreamBoards.slug, slug), eq(dreamBoards.partnerId, partnerId))
        : eq(dreamBoards.slug, slug)
    )
    .groupBy(dreamBoards.id)
    .limit(1);

  return board ?? null;
}

export const getDreamBoardByPublicId = async (identifier: string, partnerId?: string) => {
  if (!isValidUuid(identifier)) {
    return getDreamBoardBySlug(identifier, partnerId);
  }

  const [board] = await db
    .select({
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
    })
    .from(dreamBoards)
    .leftJoin(
      contributions,
      and(
        eq(contributions.dreamBoardId, dreamBoards.id),
        eq(contributions.paymentStatus, 'completed')
      )
    )
    .where(
      partnerId
        ? and(eq(dreamBoards.id, identifier), eq(dreamBoards.partnerId, partnerId))
        : eq(dreamBoards.id, identifier)
    )
    .groupBy(dreamBoards.id)
    .limit(1);

  return board ?? null;
};

export async function listDreamBoardsForHost(hostId: string) {
  return db
    .select({
      id: dreamBoards.id,
      slug: dreamBoards.slug,
      childName: dreamBoards.childName,
      childPhotoUrl: dreamBoards.childPhotoUrl,
      giftType: dreamBoards.giftType,
      giftData: dreamBoards.giftData,
      goalCents: dreamBoards.goalCents,
      status: dreamBoards.status,
      deadline: dreamBoards.deadline,
      raisedCents: sql<number>`COALESCE(SUM(${contributions.netCents}), 0)`.as('raised_cents'),
      contributionCount: sql<number>`COUNT(${contributions.id})`.as('contribution_count'),
    })
    .from(dreamBoards)
    .leftJoin(
      contributions,
      and(
        eq(contributions.dreamBoardId, dreamBoards.id),
        eq(contributions.paymentStatus, 'completed')
      )
    )
    .where(eq(dreamBoards.hostId, hostId))
    .groupBy(dreamBoards.id)
    .orderBy(desc(dreamBoards.createdAt));
}

export async function getDreamBoardDetailForHost(id: string, hostId: string) {
  const [board] = await db
    .select({
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
      raisedCents: sql<number>`COALESCE(SUM(${contributions.netCents}), 0)`.as('raised_cents'),
      contributionCount: sql<number>`COUNT(${contributions.id})`.as('contribution_count'),
    })
    .from(dreamBoards)
    .leftJoin(
      contributions,
      and(
        eq(contributions.dreamBoardId, dreamBoards.id),
        eq(contributions.paymentStatus, 'completed')
      )
    )
    .where(and(eq(dreamBoards.id, id), eq(dreamBoards.hostId, hostId)))
    .groupBy(dreamBoards.id)
    .limit(1);

  return board ?? null;
}

export async function listContributionsForDreamBoard(
  dreamBoardId: string,
  options: { limit?: number; offset?: number } = {}
) {
  const limit = options.limit ?? 100;
  const offset = options.offset ?? 0;

  return db
    .select({
      id: contributions.id,
      contributorName: contributions.contributorName,
      message: contributions.message,
      amountCents: contributions.amountCents,
      feeCents: contributions.feeCents,
      netCents: contributions.netCents,
      paymentStatus: contributions.paymentStatus,
      createdAt: contributions.createdAt,
    })
    .from(contributions)
    .where(eq(contributions.dreamBoardId, dreamBoardId))
    .orderBy(desc(contributions.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function listRecentContributors(dreamBoardId: string, limit = 6) {
  return db
    .select({
      contributorName: contributions.contributorName,
      netCents: contributions.netCents,
    })
    .from(contributions)
    .where(
      and(
        eq(contributions.dreamBoardId, dreamBoardId),
        eq(contributions.paymentStatus, 'completed')
      )
    )
    .orderBy(desc(contributions.createdAt))
    .limit(limit);
}

export async function getContributionByPaymentRef(
  paymentProvider: PaymentProvider,
  paymentRef: string
) {
  const [contribution] = await db
    .select({
      id: contributions.id,
      partnerId: contributions.partnerId,
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
    .where(
      and(
        eq(contributions.paymentProvider, paymentProvider),
        eq(contributions.paymentRef, paymentRef)
      )
    )
    .limit(1);

  return contribution ?? null;
}

export async function updateContributionStatus(
  id: string,
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded'
) {
  await db
    .update(contributions)
    .set({ paymentStatus: status, updatedAt: new Date() })
    .where(and(eq(contributions.id, id), ne(contributions.paymentStatus, status)));
}

export async function getApiKeyByHash(params: { keyPrefix: string; keyHash: string }) {
  const [apiKey] = await db
    .select({
      id: apiKeys.id,
      partnerId: apiKeys.partnerId,
      partnerName: apiKeys.partnerName,
      scopes: apiKeys.scopes,
      rateLimit: apiKeys.rateLimit,
      isActive: apiKeys.isActive,
    })
    .from(apiKeys)
    .where(and(eq(apiKeys.keyPrefix, params.keyPrefix), eq(apiKeys.keyHash, params.keyHash)))
    .limit(1);

  return apiKey ?? null;
}

export async function markApiKeyUsed(apiKeyId: string) {
  await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, apiKeyId));
}

export async function listContributionsForReconciliation(lookbackStart: Date, cutoff: Date) {
  return db
    .select({
      id: contributions.id,
      dreamBoardId: contributions.dreamBoardId,
      paymentProvider: contributions.paymentProvider,
      paymentRef: contributions.paymentRef,
      amountCents: contributions.amountCents,
      feeCents: contributions.feeCents,
      paymentStatus: contributions.paymentStatus,
      createdAt: contributions.createdAt,
    })
    .from(contributions)
    .where(
      and(
        inArray(contributions.paymentStatus, ['pending', 'processing']),
        gte(contributions.createdAt, lookbackStart),
        lt(contributions.createdAt, cutoff)
      )
    );
}

export async function listContributionsForLongTailReconciliation(
  longTailStart: Date,
  lookbackStart: Date,
  cutoff: Date
) {
  return db
    .select({
      id: contributions.id,
      dreamBoardId: contributions.dreamBoardId,
      paymentProvider: contributions.paymentProvider,
      paymentRef: contributions.paymentRef,
      amountCents: contributions.amountCents,
      feeCents: contributions.feeCents,
      paymentStatus: contributions.paymentStatus,
      createdAt: contributions.createdAt,
    })
    .from(contributions)
    .where(
      and(
        inArray(contributions.paymentStatus, ['pending', 'processing']),
        gte(contributions.createdAt, longTailStart),
        lt(contributions.createdAt, lookbackStart),
        lt(contributions.createdAt, cutoff)
      )
    );
}

export async function markDreamBoardFundedIfNeeded(dreamBoardId: string): Promise<boolean> {
  const [board] = await db
    .select({
      goalCents: dreamBoards.goalCents,
      status: dreamBoards.status,
      raisedCents: sql<number>`COALESCE(SUM(${contributions.netCents}), 0)`.as('raised_cents'),
    })
    .from(dreamBoards)
    .leftJoin(
      contributions,
      and(
        eq(contributions.dreamBoardId, dreamBoards.id),
        eq(contributions.paymentStatus, 'completed')
      )
    )
    .where(eq(dreamBoards.id, dreamBoardId))
    .groupBy(dreamBoards.id)
    .limit(1);

  if (!board) return false;
  if (board.status !== 'active') return false;
  if (board.raisedCents < board.goalCents) return false;

  await db
    .update(dreamBoards)
    .set({ status: 'funded', updatedAt: new Date() })
    .where(eq(dreamBoards.id, dreamBoardId));

  return true;
}
