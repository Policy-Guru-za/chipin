import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { sendMagicLink } from '@/lib/auth/magic-link';
import { jsonInternalError } from '@/lib/api/internal-response';
import { getClientIp } from '@/lib/utils/request';

const requestSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonInternalError({ code: 'invalid_request', status: 400 });
  }

  const requestId = request.headers.get('x-request-id') ?? undefined;
  const ip = getClientIp(request) ?? undefined;
  const result = await sendMagicLink(parsed.data.email, { ip, requestId });

  if (!result.ok) {
    if (result.reason === 'rate_limited') {
      return jsonInternalError({
        code: 'rate_limited',
        status: 429,
        retryAfterSeconds: result.retryAfterSeconds,
      });
    }

    return jsonInternalError({ code: 'send_failed', status: 500 });
  }

  return NextResponse.json({ ok: true });
}
