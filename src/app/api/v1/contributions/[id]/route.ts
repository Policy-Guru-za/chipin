import { NextRequest } from 'next/server';

import { serializeContribution } from '@/lib/api/contributions';
import { validateUuid, withApiAuth } from '@/lib/api/route-utils';
import { jsonError, jsonSuccess } from '@/lib/api/response';
import { getContributionForApi } from '@/lib/db/api-queries';

export const GET = withApiAuth(
  'contributions:read',
  async (_request: NextRequest, context, params: { id: string }) => {
    const { requestId, rateLimitHeaders } = context;

    const idCheck = validateUuid(params.id, {
      requestId,
      headers: rateLimitHeaders,
      message: 'Invalid contribution identifier',
    });
    if (!idCheck.ok) return idCheck.response;

    const contribution = await getContributionForApi({
      id: params.id,
      partnerId: context.apiKey.partnerId,
    });
    if (!contribution) {
      return jsonError({
        error: { code: 'not_found', message: 'Contribution not found' },
        status: 404,
        requestId,
        headers: rateLimitHeaders,
      });
    }

    return jsonSuccess({
      data: serializeContribution(contribution),
      requestId,
      headers: rateLimitHeaders,
    });
  }
);
