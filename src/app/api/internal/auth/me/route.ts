import { NextResponse } from 'next/server';

import { jsonInternalError } from '@/lib/api/internal-response';
import { getSession } from '@/lib/auth/session';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return jsonInternalError({ code: 'unauthorized', status: 401 });
  }

  return NextResponse.json({
    data: {
      id: session.hostId,
      email: session.email,
    },
  });
}
