import { eq } from 'drizzle-orm';

import { db } from './index';
import { hosts } from './schema';

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
