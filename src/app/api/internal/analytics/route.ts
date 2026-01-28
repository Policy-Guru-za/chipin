import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { log } from '@/lib/observability/logger';
import { getClientIp } from '@/lib/utils/request';

const webVitalsSchema = z.object({
  name: z.enum(['CLS', 'FCP', 'LCP', 'TTFB', 'INP']),
  value: z.number(),
  rating: z.enum(['good', 'needs-improvement', 'poor']),
  id: z.string(),
  page: z.string().optional(),
});

// Simple in-memory rate limiter for analytics (100 requests per minute per IP)
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 100;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

function isValidOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  // Allow in development
  if (process.env.NODE_ENV === 'development') return true;

  // Check origin or referer matches app URL
  if (appUrl) {
    if (origin?.startsWith(appUrl)) return true;
    if (referer?.startsWith(appUrl)) return true;
  }

  // Allow same-origin requests (no origin header means same-origin for some browsers)
  if (!origin && !referer) return true;

  return false;
}

export async function POST(request: NextRequest) {
  // Validate origin
  if (!isValidOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Rate limiting
  const ip = getClientIp(request) ?? 'unknown';
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

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
