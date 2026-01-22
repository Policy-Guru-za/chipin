import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { enforceRateLimit } from '@/lib/auth/rate-limit';
import { db } from '@/lib/db';
import { dreamBoards, contributions } from '@/lib/db/schema';
import { createPayfastPayment } from '@/lib/payments/payfast';
import { calculateTotalWithFee } from '@/lib/payments/fees';
import { generatePaymentRef } from '@/lib/payments/reference';
import { log } from '@/lib/observability/logger';

const requestSchema = z.object({
  dreamBoardId: z.string().uuid(),
  contributionCents: z.number().int().min(2000).max(1000000),
  contributorName: z.string().max(100).optional(),
  message: z.string().max(280).optional(),
  paymentProvider: z.literal('payfast'),
});

const getClientIp = (request: NextRequest) =>
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip');

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  const ip = getClientIp(request);
  const rateLimitKey = `contribution:create:${ip ?? 'unknown'}:${parsed.data.dreamBoardId}`;
  const rateLimit = await enforceRateLimit(rateLimitKey, { limit: 10, windowSeconds: 60 * 60 });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfterSeconds: rateLimit.retryAfterSeconds },
      { status: 429 }
    );
  }

  const [board] = await db
    .select({
      id: dreamBoards.id,
      slug: dreamBoards.slug,
      childName: dreamBoards.childName,
      status: dreamBoards.status,
    })
    .from(dreamBoards)
    .where(eq(dreamBoards.id, parsed.data.dreamBoardId))
    .limit(1);

  if (!board) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  if (board.status !== 'active' && board.status !== 'funded') {
    return NextResponse.json({ error: 'board_closed' }, { status: 400 });
  }

  try {
    const contributionCents = parsed.data.contributionCents;
    const totalCents = calculateTotalWithFee(contributionCents);
    const feeCents = totalCents - contributionCents;
    const paymentRef = generatePaymentRef();
    const userAgent = request.headers.get('user-agent') ?? undefined;

    const contributorName = parsed.data.contributorName?.trim() || undefined;
    const message = parsed.data.message?.trim() || undefined;

    await db.insert(contributions).values({
      dreamBoardId: board.id,
      contributorName,
      message,
      amountCents: contributionCents,
      feeCents,
      paymentProvider: 'payfast',
      paymentRef,
      paymentStatus: 'pending',
      ipAddress: ip ?? undefined,
      userAgent,
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const payment = createPayfastPayment({
      amountCents: totalCents,
      reference: paymentRef,
      itemName: `Contribution to ${board.childName}'s Dream Board`,
      returnUrl: `${baseUrl}/${board.slug}/thanks?ref=${paymentRef}`,
      cancelUrl: `${baseUrl}/${board.slug}?cancelled=1`,
      notifyUrl: `${baseUrl}/api/webhooks/payfast`,
    });

    return NextResponse.json(payment);
  } catch (error) {
    log('error', 'payments.contribution_create_failed', {
      error: error instanceof Error ? error.message : 'unknown_error',
    });
    return NextResponse.json({ error: 'payment_failed' }, { status: 500 });
  }
}
