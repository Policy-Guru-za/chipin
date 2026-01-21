import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

export default function proxy(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') ?? randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-request-id', requestId);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set('x-request-id', requestId);
  return response;
}
