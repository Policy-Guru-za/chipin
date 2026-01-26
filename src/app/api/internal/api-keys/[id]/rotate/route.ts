import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { recordAuditEvent } from '@/lib/audit';
import { requireInternalAuth, getInternalActor } from '@/lib/api/internal-auth';
import { buildApiKeyRecord, generateApiKeyToken, resolveRateLimit } from '@/lib/api/keys';
import { createApiKeyRecord, deactivateApiKey, getApiKeyById } from '@/lib/db/api-key-queries';
import { isValidUuid } from '@/lib/api/validation';

const scopeSchema = z.enum([
  'dreamboards:read',
  'dreamboards:write',
  'contributions:read',
  'payouts:read',
  'payouts:write',
  'webhooks:manage',
]);

const requestSchema = z.object({
  scopes: z.array(scopeSchema).min(1).optional(),
  tier: z.enum(['default', 'partner', 'enterprise']).optional(),
  rate_limit: z.number().int().positive().optional(),
});

const resolveEnvironment = (keyPrefix: string) => (keyPrefix.includes('_test_') ? 'test' : 'live');

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireInternalAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!isValidUuid(params.id)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_request', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (parsed.data.tier === 'enterprise' && typeof parsed.data.rate_limit !== 'number') {
    return NextResponse.json({ error: 'rate_limit_required' }, { status: 400 });
  }

  const existing = await getApiKeyById(params.id);
  if (!existing) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const rateLimit = resolveRateLimit({
    tier: parsed.data.tier,
    rateLimit: parsed.data.rate_limit ?? existing.rateLimit,
  });
  const environment = resolveEnvironment(existing.keyPrefix);
  const token = generateApiKeyToken(environment);
  const { keyHash, keyPrefix } = buildApiKeyRecord({ token });

  const created = await createApiKeyRecord({
    partnerName: existing.partnerName,
    scopes: parsed.data.scopes ?? existing.scopes,
    rateLimit,
    keyHash,
    keyPrefix,
  });

  if (!created) {
    return NextResponse.json({ error: 'create_failed' }, { status: 500 });
  }

  await deactivateApiKey(existing.id);

  await recordAuditEvent({
    actor: getInternalActor(request),
    action: 'api_key.rotated',
    target: { type: 'api_key', id: created.id },
    metadata: {
      replacedId: existing.id,
      partnerName: created.partnerName,
      scopes: created.scopes,
      rateLimit: created.rateLimit,
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
        replaced_id: existing.id,
      },
    },
    { status: 200 }
  );
}
