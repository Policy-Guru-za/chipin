import { randomUUID } from 'crypto';
import { NextRequest } from 'next/server';

import { requireApiKey } from '@/lib/api/auth';
import { serializeDreamBoard } from '@/lib/api/dream-boards';
import { jsonError, jsonSuccess } from '@/lib/api/response';
import { buildRateLimitHeaders, enforceApiRateLimit, getBurstLimit } from '@/lib/api/rate-limit';
import { getDreamBoardByPublicId, markApiKeyUsed } from '@/lib/db/queries';
import { getRequestId } from '@/lib/observability/logger';

const getClientIp = (request: NextRequest) =>
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip');

const PUBLIC_ID_MAX_LENGTH = 100;
const PUBLIC_ID_REGEX = /^[a-z0-9-]+$/i;

const isValidPublicId = (value: string) =>
  value.length > 0 && value.length <= PUBLIC_ID_MAX_LENGTH && PUBLIC_ID_REGEX.test(value);

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const requestId = getRequestId(request.headers) ?? randomUUID();
  const ip = getClientIp(request);
  const authResult = await requireApiKey(request.headers.get('authorization'), 'dreamboards:read');

  if (!authResult.ok) {
    const anonymousLimit = 1000;
    const anonymousKeySuffix = authResult.error.code === 'forbidden' ? 'forbidden' : 'unauthorized';
    const anonymousRateLimit = await enforceApiRateLimit({
      keyId: `anonymous:${anonymousKeySuffix}:${ip ?? 'unknown'}`,
      limit: anonymousLimit,
      burst: getBurstLimit(anonymousLimit),
    });
    const anonymousHeaders = buildRateLimitHeaders(anonymousRateLimit);

    if (!anonymousRateLimit.allowed) {
      return jsonError({
        error: { code: 'rate_limited', message: 'Too many requests' },
        status: 429,
        requestId,
        headers: anonymousHeaders,
      });
    }

    return jsonError({
      error: authResult.error,
      status: authResult.error.status,
      requestId,
      headers: anonymousHeaders,
    });
  }

  const rateLimit = await enforceApiRateLimit({
    keyId: authResult.apiKey.id,
    limit: authResult.apiKey.rateLimit,
    burst: getBurstLimit(authResult.apiKey.rateLimit),
  });
  const rateLimitHeaders = buildRateLimitHeaders(rateLimit);

  if (!rateLimit.allowed) {
    return jsonError({
      error: {
        code: 'rate_limited',
        message: 'Too many requests',
      },
      status: 429,
      requestId,
      headers: rateLimitHeaders,
    });
  }

  if (!isValidPublicId(params.id)) {
    return jsonError({
      error: { code: 'validation_error', message: 'Invalid dream board identifier' },
      status: 400,
      requestId,
      headers: rateLimitHeaders,
    });
  }

  const board = await getDreamBoardByPublicId(params.id);
  if (!board) {
    return jsonError({
      error: { code: 'not_found', message: 'Dream board not found' },
      status: 404,
      requestId,
      headers: rateLimitHeaders,
    });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const payload = serializeDreamBoard(board, baseUrl);
  if (!payload) {
    return jsonError({
      error: { code: 'internal_error', message: 'Unable to serialize dream board' },
      status: 500,
      requestId,
      headers: rateLimitHeaders,
    });
  }

  await markApiKeyUsed(authResult.apiKey.id);

  return jsonSuccess({ data: payload, requestId, headers: rateLimitHeaders });
}
