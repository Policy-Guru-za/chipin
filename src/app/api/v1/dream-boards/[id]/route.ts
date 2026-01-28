import { NextRequest } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { serializeDreamBoard } from '@/lib/api/dream-boards';
import { parseBody, withApiAuth, validatePublicId } from '@/lib/api/route-utils';
import { jsonError, jsonSuccess } from '@/lib/api/response';
import { db } from '@/lib/db';
import { getDreamBoardByPublicId } from '@/lib/db/queries';
import { dreamBoards } from '@/lib/db/schema';
import { isDeadlineWithinRange } from '@/lib/dream-boards/validation';

type DreamBoardStatus = (typeof dreamBoards.$inferSelect)['status'];
type UpdatePayload = z.infer<typeof updateSchema>;
type DreamBoardRecord = NonNullable<Awaited<ReturnType<typeof getDreamBoardByPublicId>>>;

const updateSchema = z
  .object({
    message: z.string().min(1).max(280).nullable().optional(),
    deadline: z.string().min(1).optional(),
    status: z
      .enum(['draft', 'active', 'funded', 'closed', 'paid_out', 'expired', 'cancelled'])
      .optional(),
  })
  .refine((value) => value.message !== undefined || value.deadline || value.status, {
    message: 'No updates provided',
  });

const allowedStatusTransitions: Record<DreamBoardStatus, DreamBoardStatus[]> = {
  draft: ['active', 'cancelled'],
  active: ['cancelled', 'expired'],
  funded: ['cancelled', 'expired'],
  closed: [],
  paid_out: [],
  expired: [],
  cancelled: [],
};

const isImmutableStatus = (status: DreamBoardStatus) =>
  ['closed', 'paid_out', 'expired', 'cancelled'].includes(status);

const buildConflict = (message: string, requestId: string, headers: HeadersInit) =>
  jsonError({
    error: { code: 'conflict', message },
    status: 409,
    requestId,
    headers,
  });

const buildValidationError = (message: string, requestId: string, headers: HeadersInit) =>
  jsonError({
    error: { code: 'validation_error', message },
    status: 400,
    requestId,
    headers,
  });

const resolveDeadlineUpdate = (params: {
  value: string;
  currentDeadline: Date;
  requestId: string;
  headers: HeadersInit;
}) => {
  if (!isDeadlineWithinRange(params.value)) {
    return {
      ok: false as const,
      response: buildValidationError(
        'Deadline must be within the next 90 days',
        params.requestId,
        params.headers
      ),
    };
  }

  const deadline = new Date(params.value);
  if (Number.isNaN(deadline.getTime())) {
    return {
      ok: false as const,
      response: buildValidationError('Invalid deadline', params.requestId, params.headers),
    };
  }

  if (deadline.getTime() <= params.currentDeadline.getTime()) {
    return {
      ok: false as const,
      response: buildConflict('Deadline can only be extended', params.requestId, params.headers),
    };
  }

  return { ok: true as const, deadline };
};

const resolveStatusUpdate = (params: {
  nextStatus: DreamBoardStatus | undefined;
  currentStatus: DreamBoardStatus;
  requestId: string;
  headers: HeadersInit;
}) => {
  if (!params.nextStatus || params.nextStatus === params.currentStatus) {
    return { ok: true as const, status: null };
  }

  if (params.nextStatus === 'closed') {
    return {
      ok: false as const,
      response: buildConflict(
        'Use the close endpoint to close a dream board',
        params.requestId,
        params.headers
      ),
    };
  }

  const allowed = allowedStatusTransitions[params.currentStatus] ?? [];
  if (!allowed.includes(params.nextStatus)) {
    return {
      ok: false as const,
      response: buildConflict('Status transition not allowed', params.requestId, params.headers),
    };
  }

  return { ok: true as const, status: params.nextStatus };
};

const buildUpdatePayload = (params: {
  data: UpdatePayload;
  board: DreamBoardRecord;
  requestId: string;
  headers: HeadersInit;
}) => {
  const updates: Partial<typeof dreamBoards.$inferInsert> = {};

  if (params.data.message !== undefined) {
    updates.message = params.data.message ?? null;
  }

  if (params.data.deadline) {
    const deadlineResult = resolveDeadlineUpdate({
      value: params.data.deadline,
      currentDeadline: new Date(params.board.deadline),
      requestId: params.requestId,
      headers: params.headers,
    });

    if (!deadlineResult.ok) {
      return { ok: false as const, response: deadlineResult.response };
    }

    updates.deadline = deadlineResult.deadline;
  }

  const statusResult = resolveStatusUpdate({
    nextStatus: params.data.status,
    currentStatus: params.board.status,
    requestId: params.requestId,
    headers: params.headers,
  });

  if (!statusResult.ok) {
    return { ok: false as const, response: statusResult.response };
  }

  if (statusResult.status) {
    updates.status = statusResult.status;
  }

  return { ok: true as const, updates };
};

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

export const PATCH = withApiAuth(
  'dreamboards:write',
  async (request: NextRequest, context, params: { id: string }) => {
    const { requestId, rateLimitHeaders } = context;

    const idCheck = validatePublicId(params.id, {
      requestId,
      headers: rateLimitHeaders,
      message: 'Invalid dream board identifier',
    });
    if (!idCheck.ok) return idCheck.response;

    const parsed = await parseBody(request, updateSchema, {
      requestId,
      headers: rateLimitHeaders,
      message: 'Invalid dream board update payload',
    });
    if (!parsed.ok) return parsed.response;

    const board = await getDreamBoardByPublicId(params.id, context.apiKey.partnerId);
    if (!board) {
      return jsonError({
        error: { code: 'not_found', message: 'Dream board not found' },
        status: 404,
        requestId,
        headers: rateLimitHeaders,
      });
    }

    if (isImmutableStatus(board.status)) {
      return buildConflict('Dream board can no longer be updated', requestId, rateLimitHeaders);
    }

    const updateResult = buildUpdatePayload({
      data: parsed.data,
      board,
      requestId,
      headers: rateLimitHeaders,
    });

    if (!updateResult.ok) {
      return updateResult.response;
    }

    const updates = updateResult.updates;

    if (Object.keys(updates).length > 0) {
      await db
        .update(dreamBoards)
        .set({ ...updates, updatedAt: new Date() })
        .where(
          and(eq(dreamBoards.id, board.id), eq(dreamBoards.partnerId, context.apiKey.partnerId))
        );
    }

    const updated = await getDreamBoardByPublicId(params.id, context.apiKey.partnerId);
    if (!updated) {
      return jsonError({
        error: { code: 'internal_error', message: 'Unable to load updated dream board' },
        status: 500,
        requestId,
        headers: rateLimitHeaders,
      });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const payload = serializeDreamBoard(updated, baseUrl);
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
