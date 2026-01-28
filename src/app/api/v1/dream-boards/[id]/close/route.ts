import { NextRequest } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { jsonError, jsonSuccess } from '@/lib/api/response';
import { parseBody, validatePublicId, withApiAuth } from '@/lib/api/route-utils';
import { recordAuditEvent } from '@/lib/audit';
import { db } from '@/lib/db';
import { getDreamBoardByPublicId } from '@/lib/db/queries';
import { dreamBoards } from '@/lib/db/schema';
import { listPayoutsForDreamBoard } from '@/lib/payouts/queries';
import { createPayoutsForDreamBoard } from '@/lib/payouts/service';
import { getClientIp } from '@/lib/utils/request';

const closeSchema = z.object({
  reason: z.enum(['manual', 'deadline_reached', 'goal_reached']),
});

export const POST = withApiAuth(
  'dreamboards:write',
  async (request: NextRequest, context, params: { id: string }) => {
    const { requestId, rateLimitHeaders } = context;

    const idCheck = validatePublicId(params.id, {
      requestId,
      headers: rateLimitHeaders,
      message: 'Invalid dream board identifier',
    });
    if (!idCheck.ok) return idCheck.response;

    const parsed = await parseBody(request, closeSchema, {
      requestId,
      headers: rateLimitHeaders,
      message: 'Invalid close request',
    });
    if (!parsed.ok) return parsed.response;
    const closeReason = parsed.data.reason;

    const board = await getDreamBoardByPublicId(params.id, context.apiKey.partnerId);
    if (!board) {
      return jsonError({
        error: { code: 'not_found', message: 'Dream board not found' },
        status: 404,
        requestId,
        headers: rateLimitHeaders,
      });
    }

    if (['cancelled', 'expired'].includes(board.status)) {
      return jsonError({
        error: { code: 'conflict', message: 'Dream board cannot be closed' },
        status: 409,
        requestId,
        headers: rateLimitHeaders,
      });
    }

    if (board.status === 'draft') {
      return jsonError({
        error: { code: 'conflict', message: 'Dream board is not active yet' },
        status: 409,
        requestId,
        headers: rateLimitHeaders,
      });
    }

    if (board.status === 'paid_out') {
      const payouts = await listPayoutsForDreamBoard(board.id);
      return jsonSuccess({
        data: {
          id: board.id,
          status: board.status,
          raised_cents: board.raisedCents,
          payouts: payouts.map((payout) => ({
            id: payout.id,
            type: payout.type,
            status: payout.status,
            net_cents: payout.netCents,
          })),
        },
        requestId,
        headers: rateLimitHeaders,
      });
    }

    const ipAddress = getClientIp(request) ?? undefined;

    if (board.status !== 'closed') {
      await db
        .update(dreamBoards)
        .set({ status: 'closed', updatedAt: new Date() })
        .where(
          and(eq(dreamBoards.id, board.id), eq(dreamBoards.partnerId, context.apiKey.partnerId))
        );

      await recordAuditEvent({
        actor: {
          type: 'system',
          id: context.apiKey.partnerId,
          ipAddress,
        },
        action: 'dreamboard.closed',
        target: { type: 'dream_board', id: board.id },
        metadata: { reason: closeReason, previousStatus: board.status },
      });
    }

    await createPayoutsForDreamBoard({
      dreamBoardId: board.id,
      actor: {
        type: 'system',
        id: context.apiKey.partnerId,
        ipAddress,
      },
    });

    const updated = await getDreamBoardByPublicId(params.id, context.apiKey.partnerId);
    if (!updated) {
      return jsonError({
        error: { code: 'internal_error', message: 'Unable to load dream board' },
        status: 500,
        requestId,
        headers: rateLimitHeaders,
      });
    }

    const payouts = await listPayoutsForDreamBoard(updated.id);
    return jsonSuccess({
      data: {
        id: updated.id,
        status: updated.status,
        raised_cents: updated.raisedCents,
        payouts: payouts.map((payout) => ({
          id: payout.id,
          type: payout.type,
          status: payout.status,
          net_cents: payout.netCents,
        })),
      },
      requestId,
      headers: rateLimitHeaders,
    });
  }
);
