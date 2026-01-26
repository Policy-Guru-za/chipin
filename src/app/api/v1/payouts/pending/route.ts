import { NextRequest } from 'next/server';
import { z } from 'zod';

import { encodeCursor } from '@/lib/api/pagination';
import { parseCursor, parseQuery, withApiAuth } from '@/lib/api/route-utils';
import { jsonError, jsonPaginated } from '@/lib/api/response';
import { serializePayout } from '@/lib/api/payouts';
import { listPendingPayoutsForApi } from '@/lib/db/api-queries';

const querySchema = z.object({
  type: z.enum(['takealot_gift_card', 'philanthropy_donation', 'karri_card_topup']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  after: z.string().optional(),
});

export const GET = withApiAuth('payouts:read', async (request: NextRequest, context) => {
  const { requestId, rateLimitHeaders } = context;

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
  const rows = await listPendingPayoutsForApi({
    partnerId: context.apiKey.partnerId,
    type: parsedQuery.data.type,
    limit: limit + 1,
    cursor: cursorResult.cursor,
  });

  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit);
  const serialized = items.map(serializePayout);
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
});
