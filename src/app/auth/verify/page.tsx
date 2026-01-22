import Link from 'next/link';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { verifyMagicLink } from '@/lib/auth/magic-link';
import { createSession } from '@/lib/auth/session';
import { ensureHostForEmail } from '@/lib/db/queries';

const tokenSchema = z.object({
  token: z.string().min(32),
});

type VerifySearchParams = {
  token?: string | string[];
};

export default async function VerifyPage({ searchParams }: { searchParams?: VerifySearchParams }) {
  const tokenParam = searchParams?.token;
  const token = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam;

  if (!token) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-6 py-16">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Magic link expired</CardTitle>
            <CardDescription>We couldn’t find a valid login token.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/create" className="font-semibold text-text">
              Request a new link →
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const parsed = tokenSchema.safeParse({ token });
  if (!parsed.success) {
    redirect('/create?error=invalid');
  }

  const email = await verifyMagicLink(parsed.data.token);
  if (!email) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-6 py-16">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Magic link expired</CardTitle>
            <CardDescription>We couldn’t find a valid login token.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/create" className="font-semibold text-text">
              Request a new link →
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const host = await ensureHostForEmail(email);
  await createSession(host.id, host.email);
  redirect('/create/child');
}
