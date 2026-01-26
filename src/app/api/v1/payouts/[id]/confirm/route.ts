import { NextRequest } from 'next/server';
import { z } from 'zod';

import { parseBody, validateUuid, withApiAuth } from '@/lib/api/route-utils';
import { jsonError, jsonSuccess } from '@/lib/api/response';
import { serializePayout } from '@/lib/api/payouts';
import { getPayoutForApi } from '@/lib/db/api-queries';
import { completePayout } from '@/lib/payouts/service';

const requestSchema = z.object({
  external_ref: z.string().min(1),
  completed_at: z.string().optional(),
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
      message: 'Invalid payout confirmation payload',
    });
    if (!parsed.ok) return parsed.response;

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

    return jsonSuccess({ data: serializePayout(payout), requestId, headers: rateLimitHeaders });
  }
);
