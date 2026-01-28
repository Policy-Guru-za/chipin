import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { log } from '@/lib/observability/logger';
import { getClientIp } from '@/lib/utils/request';

// Allowlist of property keys to prevent PII leakage
const ALLOWED_PROPERTY_KEYS = new Set([
  'dreamBoardId',
  'amountCents',
  'paymentMethod',
  'totalRaisedCents',
  'platform',
  'step',
  'stepName',
  'provider',
  'reference_last4',
]);

const customMetricSchema = z.object({
  name: z.enum([
    'dream_board_created',
    'contribution_started',
    'contribution_completed',
    'goal_reached',
    'payment_method_selected',
    'wizard_step_completed',
    'share_link_clicked',
    'nav_drawer_opened',
    'payment_redirect_started',
    'snapscan_qr_shown',
    'snapscan_reference_copied',
  ]),
  timestamp: z.number(),
  properties: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
});

// Simple in-memory rate limiter for metrics (100 requests per minute per IP)
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

  if (process.env.NODE_ENV === 'development') return true;

  if (appUrl) {
    if (origin?.startsWith(appUrl)) return true;
    if (referer?.startsWith(appUrl)) return true;
  }

  if (!origin && !referer) return true;

  return false;
}

function sanitizeProperties(
  properties?: Record<string, string | number | boolean>
): Record<string, string | number | boolean> | undefined {
  if (!properties) return undefined;

  const sanitized: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (ALLOWED_PROPERTY_KEYS.has(key)) {
      sanitized[key] = value;
    }
  }
  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
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
    const result = customMetricSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const metric = result.data;

    // Log for now - in production, send to your analytics service
    log('info', 'custom_metric.reported', {
      metric: metric.name,
      timestamp: metric.timestamp,
      properties: sanitizeProperties(metric.properties),
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
