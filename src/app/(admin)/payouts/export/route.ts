import { NextResponse } from 'next/server';

import { requireAdminSession } from '@/lib/auth/session';
import { listPayoutsForAdmin } from '@/lib/payouts/queries';

const BATCH_SIZE = 500;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RANGE_DAYS = 365;

const escapeCsv = (value: string | number | null | undefined) => {
  const stringValue = String(value ?? '');
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

const formatPayoutRow = (payout: Awaited<ReturnType<typeof listPayoutsForAdmin>>[number]) => [
  payout.id,
  payout.status,
  payout.type,
  (payout.netCents / 100).toFixed(2),
  (payout.grossCents / 100).toFixed(2),
  (payout.feeCents / 100).toFixed(2),
  payout.createdAt?.toISOString?.() ?? '',
  payout.completedAt?.toISOString?.() ?? '',
  payout.dreamBoardSlug ?? '',
  payout.childName ?? '',
  payout.payoutEmail ?? '',
  payout.hostEmail ?? '',
];

const CSV_HEADER =
  [
    'id',
    'status',
    'type',
    'net_amount',
    'gross_amount',
    'fee_amount',
    'created_at',
    'completed_at',
    'dream_board_slug',
    'child_name',
    'payout_email',
    'host_email',
  ].join(',') + '\n';

export async function GET(request: Request) {
  await requireAdminSession();

  const now = new Date();
  const defaultFrom = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const parseDate = (value: string | null) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.valueOf()) ? null : parsed;
  };

  const url = new URL(request.url);
  const fromParam = url.searchParams.get('from');
  const toParam = url.searchParams.get('to');
  const parsedFrom = parseDate(fromParam);
  const parsedTo = parseDate(toParam);
  const createdFrom = parsedFrom ?? defaultFrom;
  const createdTo = parsedTo ?? now;

  if (fromParam && !parsedFrom) {
    return new NextResponse('Invalid from date', { status: 400 });
  }

  if (toParam && !parsedTo) {
    return new NextResponse('Invalid to date', { status: 400 });
  }

  if (createdFrom > createdTo) {
    return new NextResponse('Invalid date range', { status: 400 });
  }

  if (createdTo.getTime() - createdFrom.getTime() > MAX_RANGE_DAYS * DAY_MS) {
    return new NextResponse('Date range exceeds 365 days', { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(CSV_HEADER));

      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const batch = await listPayoutsForAdmin({
          createdFrom,
          createdTo,
          limit: BATCH_SIZE,
          offset,
        });

        if (batch.length === 0) {
          hasMore = false;
          break;
        }

        const lines =
          batch.map((payout) => formatPayoutRow(payout).map(escapeCsv).join(',')).join('\n') + '\n';

        controller.enqueue(encoder.encode(lines));
        offset += batch.length;

        if (batch.length < BATCH_SIZE) {
          hasMore = false;
        }
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="chipin-payouts.csv"',
    },
  });
}
