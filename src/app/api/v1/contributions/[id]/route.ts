import { NextRequest } from 'next/server';

import { serializeContribution } from '@/lib/api/contributions';
import { enforceApiAuth } from '@/lib/api/handler';
import { jsonError, jsonSuccess } from '@/lib/api/response';
import { isValidUuid } from '@/lib/api/validation';
import { getContributionForApi } from '@/lib/db/api-queries';
import { markApiKeyUsed } from '@/lib/db/queries';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await enforceApiAuth(request, 'contributions:read');
  if (!auth.ok) return auth.response;
  const { requestId, apiKey, rateLimitHeaders } = auth.context;

  if (!isValidUuid(params.id)) {
    return jsonError({
      error: { code: 'validation_error', message: 'Invalid contribution identifier' },
      status: 400,
      requestId,
      headers: rateLimitHeaders,
    });
  }

  const contribution = await getContributionForApi(params.id);
  if (!contribution) {
    return jsonError({
      error: { code: 'not_found', message: 'Contribution not found' },
      status: 404,
      requestId,
      headers: rateLimitHeaders,
    });
  }

  await markApiKeyUsed(apiKey.id);

  return jsonSuccess({
    data: serializeContribution(contribution),
    requestId,
    headers: rateLimitHeaders,
  });
}
