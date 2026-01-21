import { and, eq } from 'drizzle-orm';

import { db } from './index';
import { dreamBoards, hosts } from './schema';

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
