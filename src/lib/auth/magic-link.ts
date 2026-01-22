import { createHash, randomBytes } from 'crypto';

import * as Sentry from '@sentry/nextjs';
import { kv } from '@vercel/kv';

import { sendEmail } from '@/lib/integrations/email';
import { log } from '@/lib/observability/logger';
import { enforceRateLimit } from './rate-limit';

const MAGIC_LINK_EXPIRY_SECONDS = 60 * 60;

export type MagicLinkResult =
  | { ok: true }
  | { ok: false; reason: 'rate_limited' | 'send_failed'; retryAfterSeconds?: number };

type MagicLinkContext = {
  ip?: string;
  requestId?: string;
};

const hashIdentifier = (value: string) => createHash('sha256').update(value).digest('hex');

async function checkMagicLinkRateLimit(
  emailHash: string,
  ipHash?: string
): Promise<MagicLinkResult | null> {
  const emailMinute = await enforceRateLimit(`auth:magic:email:${emailHash}:1m`, {
    limit: 1,
    windowSeconds: 60,
  });
  if (!emailMinute.allowed) {
    return { ok: false, reason: 'rate_limited', retryAfterSeconds: emailMinute.retryAfterSeconds };
  }

  const emailHour = await enforceRateLimit(`auth:magic:email:${emailHash}:1h`, {
    limit: 5,
    windowSeconds: 60 * 60,
  });
  if (!emailHour.allowed) {
    return { ok: false, reason: 'rate_limited', retryAfterSeconds: emailHour.retryAfterSeconds };
  }

  if (ipHash) {
    const ipHour = await enforceRateLimit(`auth:magic:ip:${ipHash}:1h`, {
      limit: 10,
      windowSeconds: 60 * 60,
    });
    if (!ipHour.allowed) {
      return { ok: false, reason: 'rate_limited', retryAfterSeconds: ipHour.retryAfterSeconds };
    }
  }

  return null;
}

export async function sendMagicLink(email: string, context?: MagicLinkContext) {
  const normalizedEmail = email.trim().toLowerCase();
  const emailHash = hashIdentifier(normalizedEmail);
  const ipHash = context?.ip ? hashIdentifier(context.ip) : undefined;

  try {
    const rateLimit = await checkMagicLinkRateLimit(emailHash, ipHash);
    if (rateLimit) {
      log('warn', 'auth.magic_link_rate_limited', { emailHash, ipHash }, context?.requestId);
      Sentry.captureMessage('auth.magic_link_rate_limited', {
        level: 'warning',
        tags: { area: 'auth' },
        extra: { emailHash, ipHash },
      });
      return rateLimit;
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = hashIdentifier(token);

    await kv.set(`magic:${tokenHash}`, normalizedEmail, { ex: MAGIC_LINK_EXPIRY_SECONDS });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const magicLink = `${baseUrl}/auth/verify?token=${token}`;

    await sendEmail({
      to: normalizedEmail,
      subject: 'Your ChipIn magic link ✨',
      html: `
        <p>Hi there!</p>
        <p>Click below to create your Dream Board:</p>
        <a href="${magicLink}" style="display:inline-block;padding:12px 24px;background:#0D9488;color:white;text-decoration:none;border-radius:12px;font-weight:600;">Continue to ChipIn →</a>
        <p>This link expires in 1 hour.</p>
        <p>— The ChipIn Team</p>
      `,
    });

    return { ok: true } as const;
  } catch (error) {
    log('error', 'auth.magic_link_failed', { emailHash }, context?.requestId);
    Sentry.captureException(error, {
      tags: { area: 'auth', action: 'magic_link' },
      extra: { emailHash, ipHash },
    });
    return { ok: false, reason: 'send_failed' } as const;
  }
}

export async function verifyMagicLink(token: string) {
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const email = await kv.get<string>(`magic:${tokenHash}`);

  if (!email) {
    return null;
  }

  await kv.del(`magic:${tokenHash}`);
  return email;
}
