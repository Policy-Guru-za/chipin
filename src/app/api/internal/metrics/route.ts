import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { log } from '@/lib/observability/logger';

const customMetricSchema = z.object({
  name: z.enum([
    'dream_board_created',
    'contribution_started',
    'contribution_completed',
    'goal_reached',
    'payment_method_selected',
    'wizard_step_completed',
    'share_link_clicked',
  ]),
  timestamp: z.number(),
  properties: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = customMetricSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const metric = result.data;

    // Log for now - in production, send to your analytics service
    log('info', 'custom_metric.reported', {
      metric: metric.name,
      timestamp: metric.timestamp,
      properties: metric.properties,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
