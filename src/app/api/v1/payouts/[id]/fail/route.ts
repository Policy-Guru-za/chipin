import { NextRequest } from 'next/server';
import { z } from 'zod';

import { enforceApiAuth } from '@/lib/api/handler';
import { jsonError, jsonSuccess } from '@/lib/api/response';
import { serializePayout } from '@/lib/api/payouts';
import { isValidUuid } from '@/lib/api/validation';
import { getPayoutForApi } from '@/lib/db/api-queries';
import { markApiKeyUsed } from '@/lib/db/queries';
import { failPayout } from '@/lib/payouts/service';

const requestSchema = z.object({
  error_code: z.string().min(1).optional(),
  error_message: z.string().min(1),
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
        message: 'Invalid payout failure payload',
        details: parsed.error.flatten(),
      },
      status: 400,
      requestId,
      headers: rateLimitHeaders,
    });
  }

  const errorMessage = parsed.data.error_code
    ? `${parsed.data.error_code}: ${parsed.data.error_message}`
    : parsed.data.error_message;

  try {
    await failPayout({
      payoutId: params.id,
      errorMessage,
      actor: { type: 'system', email: apiKey.partnerName },
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
      error: { code: 'internal_error', message: 'Unable to fail payout' },
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
