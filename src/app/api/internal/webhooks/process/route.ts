import { NextRequest, NextResponse } from 'next/server';

import { jsonInternalError } from '@/lib/api/internal-response';
import { enforceRateLimit } from '@/lib/auth/rate-limit';
import { WEBHOOK_PROCESS_RATE_LIMIT } from '@/lib/constants/webhooks';
import { log } from '@/lib/observability/logger';
import { getClientIp } from '@/lib/utils/request';
import { processWebhookQueue } from '@/lib/webhooks';

const isAuthorized = (request: NextRequest) => {
  const secret = process.env.INTERNAL_JOB_SECRET;
  if (!secret) return false;
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${secret}`;
};

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') ?? undefined;

  if (!process.env.INTERNAL_JOB_SECRET) {
    log('error', 'webhooks.process_missing_secret', undefined, requestId);
    return jsonInternalError({ code: 'misconfigured', status: 503 });
  }

  if (!isAuthorized(request)) {
    return jsonInternalError({ code: 'unauthorized', status: 401 });
  }

  const ip = getClientIp(request);
  const rateLimit = await enforceRateLimit(`webhook:process:${ip ?? 'unknown'}`, {
    limit: WEBHOOK_PROCESS_RATE_LIMIT.limit,
    windowSeconds: WEBHOOK_PROCESS_RATE_LIMIT.windowSeconds,
  });
  if (!rateLimit.allowed) {
    return jsonInternalError({
      code: 'rate_limited',
      status: 429,
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    });
  }

  try {
    const processed = await processWebhookQueue();
    log('info', 'webhooks.process_complete', { processed }, requestId);
    return NextResponse.json({ processed });
  } catch (error) {
    log(
      'error',
      'webhooks.process_failed',
      {
        error: error instanceof Error ? error.message : 'unknown',
      },
      requestId
    );
    return jsonInternalError({ code: 'process_failed', status: 500 });
  }
}
