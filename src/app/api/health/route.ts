import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') ?? randomUUID();

  return NextResponse.json(
    {
      status: 'ok',
      requestId,
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        'x-request-id': requestId,
      },
    }
  );
}
