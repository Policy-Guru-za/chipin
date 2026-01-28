import { and, inArray, isNotNull, lt, or } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { contributions, dreamBoards } from '@/lib/db/schema';
import {
  ANONYMIZED_CHILD_NAME,
  ANONYMIZED_CHILD_PHOTO_URL,
  ANONYMIZED_PAYOUT_EMAIL,
  getRetentionCutoffs,
  NETWORK_METADATA_NULLS,
  RETENTION_ELIGIBLE_STATUSES,
} from '@/lib/retention/retention';
import { log } from '@/lib/observability/logger';
import { jsonInternalError } from '@/lib/api/internal-response';

const isAuthorized = (request: NextRequest) => {
  const secret = process.env.INTERNAL_JOB_SECRET;
  if (!secret) return false;
  const authHeader = request.headers.get('authorization');
  return authHeader === `Bearer ${secret}`;
};

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') ?? undefined;
  if (!process.env.INTERNAL_JOB_SECRET) {
    log('error', 'retention.missing_secret', undefined, requestId);
    return jsonInternalError({ code: 'misconfigured', status: 503 });
  }

  if (!isAuthorized(request)) {
    return jsonInternalError({ code: 'unauthorized', status: 401 });
  }

  const now = new Date();
  const { ipCutoff, boardCutoff } = getRetentionCutoffs(now);

  const ipScrubbed = await db
    .update(contributions)
    .set({ ...NETWORK_METADATA_NULLS, updatedAt: now })
    .where(
      and(
        lt(contributions.createdAt, ipCutoff),
        or(isNotNull(contributions.ipAddress), isNotNull(contributions.userAgent))
      )
    )
    .returning({ id: contributions.id });

  const expiredBoards = await db
    .select({ id: dreamBoards.id })
    .from(dreamBoards)
    .where(
      and(
        lt(dreamBoards.deadline, boardCutoff),
        inArray(dreamBoards.status, [...RETENTION_ELIGIBLE_STATUSES])
      )
    );

  const boardIds = expiredBoards.map((board) => board.id);

  const anonymizedBoards = boardIds.length
    ? await db
        .update(dreamBoards)
        .set({
          childName: ANONYMIZED_CHILD_NAME,
          childPhotoUrl: ANONYMIZED_CHILD_PHOTO_URL,
          payoutEmail: ANONYMIZED_PAYOUT_EMAIL,
          updatedAt: now,
        })
        .where(inArray(dreamBoards.id, boardIds))
        .returning({ id: dreamBoards.id })
    : [];

  const anonymizedContributions = boardIds.length
    ? await db
        .update(contributions)
        .set({ contributorName: null, message: null, updatedAt: now })
        .where(inArray(contributions.dreamBoardId, boardIds))
        .returning({ id: contributions.id })
    : [];

  log(
    'info',
    'retention.network_metadata_scrubbed',
    { count: ipScrubbed.length, fields: ['ipAddress', 'userAgent'] },
    requestId
  );
  log('info', 'retention.boards_anonymized', { count: anonymizedBoards.length }, requestId);
  log(
    'info',
    'retention.contributions_anonymized',
    { count: anonymizedContributions.length },
    requestId
  );

  return NextResponse.json({
    ipScrubbed: ipScrubbed.length,
    boardsAnonymized: anonymizedBoards.length,
    contributionsAnonymized: anonymizedContributions.length,
    cutoffs: {
      ip: ipCutoff.toISOString(),
      board: boardCutoff.toISOString(),
    },
  });
}
