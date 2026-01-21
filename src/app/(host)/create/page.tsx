import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { sendMagicLink } from '@/lib/auth/magic-link';
import { getSession } from '@/lib/auth/session';

const emailSchema = z.object({
  email: z.string().email(),
});

async function sendMagicLinkAction(formData: FormData) {
  'use server';

  const email = formData.get('email');
  const result = emailSchema.safeParse({ email });

  if (!result.success) {
    redirect('/create?error=invalid');
  }

  const normalizedEmail = result.data.email.trim().toLowerCase();
  const headerStore = await headers();
  const forwardedFor = headerStore.get('x-forwarded-for');
  const ip = forwardedFor?.split(',')[0]?.trim() ?? headerStore.get('x-real-ip') ?? undefined;
  const requestId = headerStore.get('x-request-id') ?? undefined;

  const outcome = await sendMagicLink(normalizedEmail, { ip, requestId });
  if (!outcome.ok) {
    const params = new URLSearchParams({ error: outcome.reason, email: normalizedEmail });
    if (outcome.reason === 'rate_limited' && outcome.retryAfterSeconds) {
      params.set('retry', outcome.retryAfterSeconds.toString());
    }
    redirect(`/create?${params.toString()}`);
  }

  redirect(`/create?sent=1&email=${encodeURIComponent(normalizedEmail)}`);
}

type CreateSearchParams = {
  sent?: string;
  email?: string;
  error?: string;
  retry?: string;
};

export default async function CreateDreamBoardPage({
  searchParams,
}: {
  searchParams?: CreateSearchParams;
}) {
  const session = await getSession();
  if (session) {
    redirect('/create/child');
  }

  const sent = searchParams?.sent === '1';
  const email = searchParams?.email ?? '';
  const error = searchParams?.error ?? '';
  const retryAfterSeconds = Number(searchParams?.retry ?? 0);
  const retryMinutes = retryAfterSeconds > 0 ? Math.ceil(retryAfterSeconds / 60) : null;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-6 py-16">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Let’s get started</CardTitle>
          <CardDescription>We’ll email you a link to continue.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {sent ? (
            <div className="rounded-xl border border-border bg-subtle px-4 py-3 text-sm text-text">
              <p className="font-semibold">Check your email!</p>
              <p>We sent a link to {email}.</p>
            </div>
          ) : null}
          {error === 'invalid' ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Please enter a valid email address.
            </div>
          ) : null}
          {error === 'rate_limited' ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              You’ve requested too many links. {retryMinutes ? `Try again in ${retryMinutes} minutes.` : 'Please try again shortly.'}
            </div>
          ) : null}
          {error === 'send_failed' ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              We couldn’t send your link. Please try again.
            </div>
          ) : null}
          <form action={sendMagicLinkAction} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-text">
                Email address
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                defaultValue={email}
              />
            </div>
            <Button type="submit" className="w-full">
              Send magic link
            </Button>
          </form>
          {sent ? (
            <form action={sendMagicLinkAction} className="flex items-center gap-2">
              <input type="hidden" name="email" value={email} />
              <Button type="submit" variant="outline">
                Didn’t receive it? Resend
              </Button>
            </form>
          ) : null}
          <p className="text-xs text-text-muted">We never share your email.</p>
          <p className="text-sm text-text-muted">
            Curious first? <Link href="/" className="font-semibold text-text">Learn more →</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
