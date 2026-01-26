import { NextRequest } from 'next/server';
import { z } from 'zod';

import { serializeContribution } from '@/lib/api/contributions';
import { enforceApiAuth } from '@/lib/api/handler';
import { decodeCursor, encodeCursor } from '@/lib/api/pagination';
import { jsonError, jsonPaginated } from '@/lib/api/response';
import { isValidPublicId } from '@/lib/api/validation';
import { listContributionsForApi } from '@/lib/db/api-queries';
import { getDreamBoardByPublicId, markApiKeyUsed } from '@/lib/db/queries';

const querySchema = z.object({
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'refunded']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  after: z.string().optional(),
});

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await enforceApiAuth(request, 'contributions:read');
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

  const parsedQuery = querySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams.entries())
  );
  if (!parsedQuery.success) {
    return jsonError({
      error: {
        code: 'validation_error',
        message: 'Invalid query parameters',
        details: parsedQuery.error.flatten(),
      },
      status: 400,
      requestId,
      headers: rateLimitHeaders,
    });
  }

  const cursor = decodeCursor(parsedQuery.data.after);
  if (parsedQuery.data.after && !cursor) {
    return jsonError({
      error: { code: 'validation_error', message: 'Invalid pagination cursor' },
      status: 400,
      requestId,
      headers: rateLimitHeaders,
    });
  }

  const limit = parsedQuery.data.limit;
  const rows = await listContributionsForApi({
    dreamBoardId: board.id,
    status: parsedQuery.data.status,
    limit: limit + 1,
    cursor,
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

  await markApiKeyUsed(apiKey.id);

  return jsonPaginated({
    data: serialized,
    pagination: { has_more: hasMore, next_cursor: nextCursor },
    requestId,
    headers: rateLimitHeaders,
  });
}
