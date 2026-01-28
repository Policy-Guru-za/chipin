import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { recordAuditEvent } from '@/lib/audit';
import { requireInternalAuth, getInternalActor } from '@/lib/api/internal-auth';
import { buildApiKeyRecord, generateApiKeyToken, resolveRateLimit } from '@/lib/api/keys';
import { jsonInternalError } from '@/lib/api/internal-response';
import { createApiKeyRecord } from '@/lib/db/api-key-queries';
import { DEFAULT_PARTNER_ID } from '@/lib/db/partners';

const scopeSchema = z.enum([
  'dreamboards:read',
  'dreamboards:write',
  'contributions:read',
  'payouts:read',
  'payouts:write',
  'webhooks:manage',
]);

const requestSchema = z.object({
  partner_name: z.string().min(1),
  scopes: z.array(scopeSchema).min(1),
  environment: z.enum(['live', 'test']),
  tier: z.enum(['default', 'partner', 'enterprise']).optional(),
  rate_limit: z.number().int().positive().optional(),
});

export async function POST(request: NextRequest) {
  const auth = requireInternalAuth(request);
  if (!auth.ok) {
    return jsonInternalError({ code: auth.error, status: auth.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonInternalError({
      code: 'invalid_request',
      status: 400,
      details: parsed.error.flatten(),
    });
  }

  if (parsed.data.tier === 'enterprise' && typeof parsed.data.rate_limit !== 'number') {
    return jsonInternalError({ code: 'rate_limit_required', status: 400 });
  }

  const rateLimit = resolveRateLimit({
    tier: parsed.data.tier,
    rateLimit: parsed.data.rate_limit,
  });

  const token = generateApiKeyToken(parsed.data.environment);
  const { keyHash, keyPrefix } = buildApiKeyRecord({ token });

  const created = await createApiKeyRecord({
    partnerId: DEFAULT_PARTNER_ID,
    partnerName: parsed.data.partner_name,
    scopes: parsed.data.scopes,
    rateLimit,
    keyHash,
    keyPrefix,
  });

  if (!created) {
    return jsonInternalError({ code: 'create_failed', status: 500 });
  }

  await recordAuditEvent({
    actor: getInternalActor(request),
    action: 'api_key.created',
    target: { type: 'api_key', id: created.id },
    metadata: {
      partnerName: created.partnerName,
      scopes: created.scopes,
      rateLimit: created.rateLimit,
      environment: parsed.data.environment,
    },
  });

  return NextResponse.json(
    {
      data: {
        id: created.id,
        partner_name: created.partnerName,
        scopes: created.scopes,
        rate_limit: created.rateLimit,
        is_active: created.isActive,
        key: token,
        created_at: created.createdAt.toISOString(),
      },
    },
    { status: 201 }
  );
}
