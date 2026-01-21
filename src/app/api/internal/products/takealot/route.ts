import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { enforceRateLimit } from '@/lib/auth/rate-limit';
import { getSession } from '@/lib/auth/session';
import { fetchTakealotProduct } from '@/lib/integrations/takealot';

const requestSchema = z.object({
  url: z.string().url(),
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const rateLimit = await enforceRateLimit(`takealot:product:${session.hostId}`, {
    limit: 30,
    windowSeconds: 60 * 60,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfterSeconds: rateLimit.retryAfterSeconds },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  try {
    const product = await fetchTakealotProduct(parsed.data.url);
    return NextResponse.json({ data: product });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'fetch_failed' },
      { status: 400 }
    );
  }
}
