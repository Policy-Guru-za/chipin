import { NextRequest } from 'next/server';

import { serializeDreamBoard } from '@/lib/api/dream-boards';
import { withApiAuth, validatePublicId } from '@/lib/api/route-utils';
import { jsonError, jsonSuccess } from '@/lib/api/response';
import { getDreamBoardByPublicId } from '@/lib/db/queries';

export const GET = withApiAuth(
  'dreamboards:read',
  async (_request: NextRequest, context, params: { id: string }) => {
    const { requestId, rateLimitHeaders } = context;

    const idCheck = validatePublicId(params.id, {
      requestId,
      headers: rateLimitHeaders,
      message: 'Invalid dream board identifier',
    });
    if (!idCheck.ok) return idCheck.response;

    const board = await getDreamBoardByPublicId(params.id, context.apiKey.partnerId);
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

    return jsonSuccess({ data: payload, requestId, headers: rateLimitHeaders });
  }
);
