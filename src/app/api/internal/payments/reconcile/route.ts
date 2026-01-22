import { and, inArray, lt } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { contributions } from '@/lib/db/schema';
import { log } from '@/lib/observability/logger';

const DEFAULT_WINDOW_MINUTES = 15;

const isAuthorized = (request: NextRequest) => {
  const secret = process.env.INTERNAL_JOB_SECRET;
  if (!secret) return false;
  const authHeader = request.headers.get('authorization');
  return authHeader === `Bearer ${secret}`;
};

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') ?? undefined;
  if (!process.env.INTERNAL_JOB_SECRET) {
    log('error', 'payments.reconcile_missing_secret', undefined, requestId);
    return NextResponse.json({ error: 'misconfigured' }, { status: 503 });
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - DEFAULT_WINDOW_MINUTES * 60 * 1000);
  const pending = await db
    .select({
      id: contributions.id,
      paymentRef: contributions.paymentRef,
      paymentProvider: contributions.paymentProvider,
      paymentStatus: contributions.paymentStatus,
      createdAt: contributions.createdAt,
    })
    .from(contributions)
    .where(
      and(
        inArray(contributions.paymentStatus, ['pending', 'processing']),
        lt(contributions.createdAt, cutoff)
      )
    );

  pending.forEach((contribution) => {
    const ageMinutes = Math.round((Date.now() - contribution.createdAt.getTime()) / (60 * 1000));
    log('warn', 'payments.reconciliation_pending', {
      contributionId: contribution.id,
      paymentRef: contribution.paymentRef,
      provider: contribution.paymentProvider,
      status: contribution.paymentStatus,
      ageMinutes,
    });
  });

  return NextResponse.json({
    scanned: pending.length,
    cutoff: cutoff.toISOString(),
  });
}
