import { and, desc, eq, sql } from 'drizzle-orm';

import { db } from './index';
import { contributions, dreamBoards, hosts } from './schema';

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

export async function getDreamBoardBySlug(slug: string) {
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
    .where(eq(dreamBoards.slug, slug))
    .groupBy(dreamBoards.id)
    .limit(1);

  return board ?? null;
}

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

export async function listContributionsForDreamBoard(dreamBoardId: string) {
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
    .orderBy(desc(contributions.createdAt));
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

export async function getContributionByPaymentRef(paymentProvider: 'payfast', paymentRef: string) {
  const [contribution] = await db
    .select({
      id: contributions.id,
      dreamBoardId: contributions.dreamBoardId,
      contributorName: contributions.contributorName,
      amountCents: contributions.amountCents,
      feeCents: contributions.feeCents,
      netCents: contributions.netCents,
      paymentStatus: contributions.paymentStatus,
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
    .where(eq(contributions.id, id));
}

export async function markDreamBoardFundedIfNeeded(dreamBoardId: string) {
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

  if (!board) return;
  if (board.status !== 'active') return;
  if (board.raisedCents < board.goalCents) return;

  await db
    .update(dreamBoards)
    .set({ status: 'funded', updatedAt: new Date() })
    .where(eq(dreamBoards.id, dreamBoardId));
}
