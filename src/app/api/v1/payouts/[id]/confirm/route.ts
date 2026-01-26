import { NextRequest } from 'next/server';
import { z } from 'zod';

import { enforceApiAuth } from '@/lib/api/handler';
import { jsonError, jsonSuccess } from '@/lib/api/response';
import { serializePayout } from '@/lib/api/payouts';
import { isValidUuid } from '@/lib/api/validation';
import { getPayoutForApi } from '@/lib/db/api-queries';
import { markApiKeyUsed } from '@/lib/db/queries';
import { completePayout } from '@/lib/payouts/service';

const requestSchema = z.object({
  external_ref: z.string().min(1),
  completed_at: z.string().optional(),
});

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await enforceApiAuth(request, 'payouts:write');
  if (!auth.ok) return auth.response;
  const { requestId, apiKey, rateLimitHeaders } = auth.context;

  if (!isValidUuid(params.id)) {
    return jsonError({
      error: { code: 'validation_error', message: 'Invalid payout identifier' },
      status: 400,
      requestId,
      headers: rateLimitHeaders,
    });
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError({
      error: {
        code: 'validation_error',
        message: 'Invalid payout confirmation payload',
        details: parsed.error.flatten(),
      },
      status: 400,
      requestId,
      headers: rateLimitHeaders,
    });
  }

  const completedAt = parsed.data.completed_at ? new Date(parsed.data.completed_at) : undefined;
  if (completedAt && Number.isNaN(completedAt.getTime())) {
    return jsonError({
      error: { code: 'validation_error', message: 'Invalid completed_at timestamp' },
      status: 400,
      requestId,
      headers: rateLimitHeaders,
    });
  }

  try {
    await completePayout({
      payoutId: params.id,
      externalRef: parsed.data.external_ref,
      actor: { type: 'system', email: apiKey.partnerName },
      completedAt,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Payout not found') {
      return jsonError({
        error: { code: 'not_found', message: 'Payout not found' },
        status: 404,
        requestId,
        headers: rateLimitHeaders,
      });
    }

    return jsonError({
      error: { code: 'internal_error', message: 'Unable to confirm payout' },
      status: 500,
      requestId,
      headers: rateLimitHeaders,
    });
  }

  const payout = await getPayoutForApi(params.id);
  if (!payout) {
    return jsonError({
      error: { code: 'not_found', message: 'Payout not found' },
      status: 404,
      requestId,
      headers: rateLimitHeaders,
    });
  }

  await markApiKeyUsed(apiKey.id);

  return jsonSuccess({ data: serializePayout(payout), requestId, headers: rateLimitHeaders });
}
