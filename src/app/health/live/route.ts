import { NextResponse } from 'next/server';

import { getBuildInfo } from '@/lib/health/metadata';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    build: getBuildInfo(),
  });
}
