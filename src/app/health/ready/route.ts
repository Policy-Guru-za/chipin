import { NextResponse } from 'next/server';

import {
  checkBlobToken,
  checkDb,
  checkGivenGainAutomation,
  checkKarriAutomation,
  checkKv,
  checkTakealotGiftCards,
} from '@/lib/health/checks';
import { getBuildInfo } from '@/lib/health/metadata';

export async function GET() {
  const [db, kv, blob, karri, takealot, givengain] = await Promise.all([
    checkDb(),
    checkKv(),
    checkBlobToken(),
    checkKarriAutomation(),
    checkTakealotGiftCards(),
    checkGivenGainAutomation(),
  ]);
  const checks = { db, kv, blob, karri, takealot, givengain };
  const ok = Object.values(checks).every((check) => check.ok);

  return NextResponse.json(
    {
      status: ok ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      build: getBuildInfo(),
      checks,
    },
    { status: ok ? 200 : 503 }
  );
}
