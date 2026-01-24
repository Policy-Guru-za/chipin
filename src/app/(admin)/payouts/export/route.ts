import { NextResponse } from 'next/server';

import { requireAdminSession } from '@/lib/auth/session';
import { listPayoutsForAdmin } from '@/lib/payouts/queries';

const escapeCsv = (value: string | number | null | undefined) => {
  const stringValue = String(value ?? '');
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

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

  const payouts = await listPayoutsForAdmin({ createdFrom, createdTo });
  const rows = [
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
    ],
    ...payouts.map((payout) => [
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
    ]),
  ];

  const csv = rows.map((row) => row.map(escapeCsv).join(',')).join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="chipin-payouts.csv"',
    },
  });
}
