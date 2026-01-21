import { randomBytes } from 'crypto';

import { kv } from '@vercel/kv';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const SESSION_EXPIRY_SECONDS = 60 * 60 * 24 * 7;
const SESSION_COOKIE_NAME = 'chipin_session';

export type Session = {
  id: string;
  hostId: string;
  email: string;
  createdAt: number;
};

export async function createSession(hostId: string, email: string) {
  const sessionId = randomBytes(32).toString('hex');
  const session: Session = {
    id: sessionId,
    hostId,
    email,
    createdAt: Date.now(),
  };

  await kv.set(`session:${sessionId}`, session, { ex: SESSION_EXPIRY_SECONDS });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_EXPIRY_SECONDS,
    path: '/',
  });
}

export async function getSession() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionId) {
    return null;
  }

  return kv.get<Session>(`session:${sessionId}`);
}

export async function deleteSession() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (sessionId) {
    await kv.del(`session:${sessionId}`);
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    redirect('/create');
  }
  return session;
}
