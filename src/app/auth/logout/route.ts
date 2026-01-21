import { NextRequest, NextResponse } from 'next/server';

import { deleteSession } from '@/lib/auth/session';

async function handleLogout(request: NextRequest) {
  await deleteSession();
  return NextResponse.redirect(new URL('/create', request.url));
}

export async function GET(request: NextRequest) {
  return handleLogout(request);
}

export async function POST(request: NextRequest) {
  return handleLogout(request);
}
