import { randomUUID } from 'crypto';
import type { NextRequest } from 'next/server';

import type { ApiKeyRecord, ApiKeyScope } from '@/lib/api/auth';
import { requireApiKey } from '@/lib/api/auth';
import { jsonError } from '@/lib/api/response';
import { buildRateLimitHeaders, enforceApiRateLimit, getBurstLimit } from '@/lib/api/rate-limit';
import { getRequestId } from '@/lib/observability/logger';

const ANONYMOUS_RATE_LIMIT = 1000;

const getClientIp = (request: NextRequest) =>
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip');

export type ApiAuthContext = {
  requestId: string;
  apiKey: ApiKeyRecord;
  rateLimitHeaders: Headers;
};

export const enforceApiAuth = async (
  request: NextRequest,
  requiredScope: ApiKeyScope
): Promise<{ ok: true; context: ApiAuthContext } | { ok: false; response: Response }> => {
  const requestId = getRequestId(request.headers) ?? randomUUID();
  const ip = getClientIp(request);
  const authResult = await requireApiKey(request.headers.get('authorization'), requiredScope);

  if (!authResult.ok) {
    const anonymousKeySuffix = authResult.error.code === 'forbidden' ? 'forbidden' : 'unauthorized';
    const anonymousRateLimit = await enforceApiRateLimit({
      keyId: `anonymous:${anonymousKeySuffix}:${ip ?? 'unknown'}`,
      limit: ANONYMOUS_RATE_LIMIT,
      burst: getBurstLimit(ANONYMOUS_RATE_LIMIT),
    });
    const anonymousHeaders = buildRateLimitHeaders(anonymousRateLimit);

    if (!anonymousRateLimit.allowed) {
      return {
        ok: false,
        response: jsonError({
          error: { code: 'rate_limited', message: 'Too many requests' },
          status: 429,
          requestId,
          headers: anonymousHeaders,
        }),
      };
    }

    return {
      ok: false,
      response: jsonError({
        error: authResult.error,
        status: authResult.error.status,
        requestId,
        headers: anonymousHeaders,
      }),
    };
  }

  if (authResult.apiKey.rateLimit <= 0) {
    return {
      ok: true,
      context: { requestId, apiKey: authResult.apiKey, rateLimitHeaders: new Headers() },
    };
  }

  const rateLimit = await enforceApiRateLimit({
    keyId: authResult.apiKey.id,
    limit: authResult.apiKey.rateLimit,
    burst: getBurstLimit(authResult.apiKey.rateLimit),
  });
  const rateLimitHeaders = buildRateLimitHeaders(rateLimit);

  if (!rateLimit.allowed) {
    return {
      ok: false,
      response: jsonError({
        error: { code: 'rate_limited', message: 'Too many requests' },
        status: 429,
        requestId,
        headers: rateLimitHeaders,
      }),
    };
  }

  return { ok: true, context: { requestId, apiKey: authResult.apiKey, rateLimitHeaders } };
};
