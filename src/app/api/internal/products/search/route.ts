import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { enforceRateLimit } from '@/lib/auth/rate-limit';
import { getSession } from '@/lib/auth/session';
import { jsonInternalError } from '@/lib/api/internal-response';
import { fetchTakealotSearch } from '@/lib/integrations/takealot';

const querySchema = z.object({ q: z.string().min(2) });

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return jsonInternalError({ code: 'unauthorized', status: 401 });
  }

  const rateLimit = await enforceRateLimit(`takealot:search:${session.hostId}`, {
    limit: 20,
    windowSeconds: 60 * 60,
  });

  if (!rateLimit.allowed) {
    return jsonInternalError({
      code: 'rate_limited',
      status: 429,
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    });
  }

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({ q: searchParams.get('q') ?? '' });
  if (!parsed.success) {
    return jsonInternalError({ code: 'invalid_request', status: 400 });
  }

  try {
    const results = await fetchTakealotSearch(parsed.data.q);
    return NextResponse.json({
      data: results.map((product) => ({
        id: product.productId ?? null,
        name: product.name,
        price_cents: product.priceCents,
        image_url: product.imageUrl,
        product_url: product.url,
        in_stock: product.inStock,
      })),
    });
  } catch (error) {
    return jsonInternalError({
      code: error instanceof Error ? error.message : 'fetch_failed',
      status: 400,
    });
  }
}
