import { NextRequest } from 'next/server';
import { z } from 'zod';

import { serializeContribution } from '@/lib/api/contributions';
import { encodeCursor } from '@/lib/api/pagination';
import { parseCursor, parseQuery, validatePublicId, withApiAuth } from '@/lib/api/route-utils';
import { jsonError, jsonPaginated } from '@/lib/api/response';
import { listContributionsForApi } from '@/lib/db/api-queries';
import { getDreamBoardByPublicId } from '@/lib/db/queries';

const querySchema = z.object({
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'refunded']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  after: z.string().optional(),
});

export const GET = withApiAuth(
  'contributions:read',
  async (request: NextRequest, context, params: { id: string }) => {
    const { requestId, rateLimitHeaders } = context;

    const idCheck = validatePublicId(params.id, {
      requestId,
      headers: rateLimitHeaders,
      message: 'Invalid dream board identifier',
    });
    if (!idCheck.ok) return idCheck.response;

    const board = await getDreamBoardByPublicId(params.id);
    if (!board) {
      return jsonError({
        error: { code: 'not_found', message: 'Dream board not found' },
        status: 404,
        requestId,
        headers: rateLimitHeaders,
      });
    }

    const parsedQuery = parseQuery(request, querySchema, {
      requestId,
      headers: rateLimitHeaders,
      message: 'Invalid query parameters',
    });
    if (!parsedQuery.ok) return parsedQuery.response;

    const cursorResult = parseCursor(parsedQuery.data.after, {
      requestId,
      headers: rateLimitHeaders,
    });
    if (!cursorResult.ok) return cursorResult.response;

    const limit = parsedQuery.data.limit ?? 20;
    const rows = await listContributionsForApi({
      dreamBoardId: board.id,
      status: parsedQuery.data.status,
      limit: limit + 1,
      cursor: cursorResult.cursor,
    });

    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit);
    const serialized = items.map(serializeContribution);
    const nextCursor =
      hasMore && items.length
        ? encodeCursor({
            createdAt: items[items.length - 1].createdAt,
            id: items[items.length - 1].id,
          })
        : null;

    return jsonPaginated({
      data: serialized,
      pagination: { has_more: hasMore, next_cursor: nextCursor },
      requestId,
      headers: rateLimitHeaders,
    });
  }
);
