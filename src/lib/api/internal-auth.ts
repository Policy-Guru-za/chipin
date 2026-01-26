import type { NextRequest } from 'next/server';

import type { AuditActor } from '@/lib/audit';

const getClientIp = (request: NextRequest) =>
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip');

export const requireInternalAuth = (request: NextRequest) => {
  const secret = process.env.INTERNAL_JOB_SECRET;
  if (!secret) {
    return { ok: false, status: 503, error: 'misconfigured' } as const;
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${secret}`) {
    return { ok: false, status: 401, error: 'unauthorized' } as const;
  }

  return { ok: true } as const;
};

export const getInternalActor = (request: NextRequest): AuditActor => {
  const email = request.headers.get('x-actor-email') ?? undefined;
  const id = request.headers.get('x-actor-id') ?? undefined;
  return {
    type: email ? 'admin' : 'system',
    email,
    id,
    ipAddress: getClientIp(request) ?? undefined,
  };
};
