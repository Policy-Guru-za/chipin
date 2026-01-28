import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { log } from '@/lib/observability/logger';

const webVitalsSchema = z.object({
  name: z.enum(['CLS', 'FCP', 'LCP', 'TTFB', 'INP']),
  value: z.number(),
  rating: z.enum(['good', 'needs-improvement', 'poor']),
  id: z.string(),
  page: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = webVitalsSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const metric = result.data;

    // Log for now - in production, send to your analytics service
    log('info', 'web_vitals.reported', {
      metric: metric.name,
      value: metric.value,
      rating: metric.rating,
      page: metric.page,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
