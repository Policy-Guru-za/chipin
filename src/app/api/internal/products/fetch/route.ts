import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { enforceRateLimit } from '@/lib/auth/rate-limit';
import { getSession } from '@/lib/auth/session';
import { jsonInternalError } from '@/lib/api/internal-response';
import { fetchTakealotProduct } from '@/lib/integrations/takealot';

const requestSchema = z.object({ url: z.string().url() });

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return jsonInternalError({ code: 'unauthorized', status: 401 });
  }

  const rateLimit = await enforceRateLimit(`takealot:product:${session.hostId}`, {
    limit: 30,
    windowSeconds: 60 * 60,
  });

  if (!rateLimit.allowed) {
    return jsonInternalError({
      code: 'rate_limited',
      status: 429,
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    });
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonInternalError({ code: 'invalid_request', status: 400 });
  }

  try {
    const product = await fetchTakealotProduct(parsed.data.url);
    return NextResponse.json({
      data: {
        id: product.productId ?? null,
        name: product.name,
        price_cents: product.priceCents,
        image_url: product.imageUrl,
        product_url: product.url,
        in_stock: product.inStock,
      },
    });
  } catch (error) {
    return jsonInternalError({
      code: error instanceof Error ? error.message : 'fetch_failed',
      status: 400,
    });
  }
}
