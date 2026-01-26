import { NextRequest } from 'next/server';

import { validateUuid, withApiAuth } from '@/lib/api/route-utils';
import { jsonError, jsonSuccess } from '@/lib/api/response';
import { serializePayout } from '@/lib/api/payouts';
import { getPayoutForApi } from '@/lib/db/api-queries';

export const GET = withApiAuth(
  'payouts:read',
  async (_request: NextRequest, context, params: { id: string }) => {
    const { requestId, rateLimitHeaders } = context;

    const idCheck = validateUuid(params.id, {
      requestId,
      headers: rateLimitHeaders,
      message: 'Invalid payout identifier',
    });
    if (!idCheck.ok) return idCheck.response;

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
