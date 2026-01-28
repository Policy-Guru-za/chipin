import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { enforceRateLimit } from '@/lib/auth/rate-limit';
import { db } from '@/lib/db';
import { dreamBoards, contributions } from '@/lib/db/schema';
import { calculateTotalWithFee } from '@/lib/payments/fees';
import { createPaymentIntent, isPaymentProviderAvailable } from '@/lib/payments';
import { generatePaymentRef } from '@/lib/payments/reference';
import { log } from '@/lib/observability/logger';
import { jsonInternalError } from '@/lib/api/internal-response';
import { getClientIp } from '@/lib/utils/request';

const requestSchema = z.object({
  dreamBoardId: z.string().uuid(),
  contributionCents: z.number().int().min(2000).max(1000000),
  contributorName: z.string().max(100).optional(),
  message: z.string().max(280).optional(),
  paymentProvider: z.enum(['payfast', 'ozow', 'snapscan']),
});

type PaymentProvider = z.infer<typeof requestSchema>['paymentProvider'];

const parseRequest = async (request: NextRequest) => {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return { response: jsonInternalError({ code: 'invalid_request', status: 400 }) };
  }
  return { data: parsed.data };
};

const enforceContributionRateLimit = async (
  ip: string | null | undefined,
  dreamBoardId: string
) => {
  const rateLimitKey = `contribution:create:${ip ?? 'unknown'}:${dreamBoardId}`;
  const rateLimit = await enforceRateLimit(rateLimitKey, { limit: 10, windowSeconds: 60 * 60 });
  if (!rateLimit.allowed) {
    return jsonInternalError({
      code: 'rate_limited',
      status: 429,
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    });
  }
  return null;
};

const fetchDreamBoard = async (dreamBoardId: string) => {
  const [board] = await db
    .select({
      id: dreamBoards.id,
      partnerId: dreamBoards.partnerId,
      slug: dreamBoards.slug,
      childName: dreamBoards.childName,
      status: dreamBoards.status,
    })
    .from(dreamBoards)
    .where(eq(dreamBoards.id, dreamBoardId))
    .limit(1);
  return board ?? null;
};

const validateDreamBoard = (board: Awaited<ReturnType<typeof fetchDreamBoard>>) => {
  if (!board) {
    return jsonInternalError({ code: 'not_found', status: 404 });
  }
  if (board.status !== 'active' && board.status !== 'funded') {
    return jsonInternalError({ code: 'board_closed', status: 400 });
  }
  return null;
};

const validatePaymentProvider = (provider: PaymentProvider) => {
  if (!isPaymentProviderAvailable(provider)) {
    return jsonInternalError({ code: 'provider_unavailable', status: 400 });
  }
  return null;
};

const buildContributionPayload = (params: {
  board: NonNullable<Awaited<ReturnType<typeof fetchDreamBoard>>>;
  data: z.infer<typeof requestSchema>;
  ip: string | null | undefined;
  request: NextRequest;
}) => {
  const contributionCents = params.data.contributionCents;
  const totalCents = calculateTotalWithFee(contributionCents);
  const feeCents = totalCents - contributionCents;
  const paymentRef = generatePaymentRef();
  const userAgent = params.request.headers.get('user-agent') ?? undefined;
  const contributorName = params.data.contributorName?.trim() || undefined;
  const message = params.data.message?.trim() || undefined;

  return {
    contribution: {
      partnerId: params.board.partnerId,
      dreamBoardId: params.board.id,
      contributorName,
      message,
      amountCents: contributionCents,
      feeCents,
      paymentProvider: params.data.paymentProvider,
      paymentRef,
      paymentStatus: 'pending' as const,
      ipAddress: params.ip ?? undefined,
      userAgent,
    },
    payment: {
      totalCents,
      paymentRef,
    },
  };
};

export async function POST(request: NextRequest) {
  const parsed = await parseRequest(request);
  if ('response' in parsed) {
    return parsed.response;
  }

  const ip = getClientIp(request);
  const rateLimitResponse = await enforceContributionRateLimit(ip, parsed.data.dreamBoardId);
  if (rateLimitResponse) return rateLimitResponse;

  const board = await fetchDreamBoard(parsed.data.dreamBoardId);
  const boardResponse = validateDreamBoard(board);
  if (boardResponse) return boardResponse;

  const providerResponse = validatePaymentProvider(parsed.data.paymentProvider);
  if (providerResponse) return providerResponse;

  try {
    const payload = buildContributionPayload({
      board,
      data: parsed.data,
      ip,
      request,
    });
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const payment = await createPaymentIntent(parsed.data.paymentProvider, {
      amountCents: payload.payment.totalCents,
      reference: payload.payment.paymentRef,
      description: `Contribution to ${board.childName}'s Dream Board`,
      returnUrl: `${baseUrl}/${board.slug}/thanks?ref=${payload.payment.paymentRef}&provider=${parsed.data.paymentProvider}`,
      cancelUrl: `${baseUrl}/${board.slug}?cancelled=1&provider=${parsed.data.paymentProvider}`,
      notifyUrl: `${baseUrl}/api/webhooks/${parsed.data.paymentProvider}`,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });

    await db.insert(contributions).values(payload.contribution);

    return NextResponse.json(payment);
  } catch (error) {
    log('error', 'payments.contribution_create_failed', {
      error: error instanceof Error ? error.message : 'unknown_error',
    });
    return jsonInternalError({ code: 'payment_failed', status: 500 });
  }
}
