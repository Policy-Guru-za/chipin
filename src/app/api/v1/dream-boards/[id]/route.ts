import { NextRequest } from 'next/server';

import { serializeDreamBoard } from '@/lib/api/dream-boards';
import { enforceApiAuth } from '@/lib/api/handler';
import { isValidPublicId } from '@/lib/api/validation';
import { jsonError, jsonSuccess } from '@/lib/api/response';
import { getDreamBoardByPublicId, markApiKeyUsed } from '@/lib/db/queries';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await enforceApiAuth(request, 'dreamboards:read');
  if (!auth.ok) return auth.response;
  const { requestId, apiKey, rateLimitHeaders } = auth.context;

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

  await markApiKeyUsed(apiKey.id);

  return jsonSuccess({ data: payload, requestId, headers: rateLimitHeaders });
}
