import { NextRequest } from 'next/server';
import { z } from 'zod';

import { parseBody, validateUuid, withApiAuth } from '@/lib/api/route-utils';
import { jsonError, jsonSuccess } from '@/lib/api/response';
import { serializePayout } from '@/lib/api/payouts';
import { getPayoutForApi } from '@/lib/db/api-queries';
import { failPayout } from '@/lib/payouts/service';

const requestSchema = z.object({
  error_code: z.string().min(1).optional(),
  error_message: z.string().min(1),
});

export const POST = withApiAuth(
  'payouts:write',
  async (request: NextRequest, context, params: { id: string }) => {
    const { requestId, apiKey, rateLimitHeaders } = context;

    const idCheck = validateUuid(params.id, {
      requestId,
      headers: rateLimitHeaders,
      message: 'Invalid payout identifier',
    });
    if (!idCheck.ok) return idCheck.response;

    const parsed = await parseBody(request, requestSchema, {
      requestId,
      headers: rateLimitHeaders,
      message: 'Invalid payout failure payload',
    });
    if (!parsed.ok) return parsed.response;

    const errorMessage = parsed.data.error_code
      ? `${parsed.data.error_code}: ${parsed.data.error_message}`
      : parsed.data.error_message;

    const existing = await getPayoutForApi({
      id: params.id,
      partnerId: apiKey.partnerId,
    });
    if (!existing) {
      return jsonError({
        error: { code: 'not_found', message: 'Payout not found' },
        status: 404,
        requestId,
        headers: rateLimitHeaders,
      });
    }

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

    const payout = await getPayoutForApi({ id: params.id, partnerId: apiKey.partnerId });
    if (!payout) {
      return jsonError({
        error: { code: 'not_found', message: 'Payout not found' },
        status: 404,
        requestId,
        headers: rateLimitHeaders,
      });
    }

    return jsonSuccess({ data: serializePayout(payout), requestId, headers: rateLimitHeaders });
  }
);
