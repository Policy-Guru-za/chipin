import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { jsonInternalError } from '@/lib/api/internal-response';
import { createSession } from '@/lib/auth/session';
import { verifyMagicLink } from '@/lib/auth/magic-link';
import { ensureHostForEmail } from '@/lib/db/queries';

const tokenSchema = z.object({ token: z.string().min(32) });

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const parsed = tokenSchema.safeParse({ token });

  if (!parsed.success) {
    return jsonInternalError({ code: 'invalid_request', status: 400 });
  }

  const email = await verifyMagicLink(parsed.data.token);
  if (!email) {
    return jsonInternalError({ code: 'invalid_token', status: 400 });
  }

  const host = await ensureHostForEmail(email);
  await createSession(host.id, host.email);

  return NextResponse.json({ ok: true });
}
