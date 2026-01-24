import Link from 'next/link';

import { buttonStyles } from '@/components/ui/button';
import { requireAdminSession } from '@/lib/auth/session';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminSession();

  return (
    <div className="min-h-screen bg-subtle text-text">
      <header className="border-b border-border bg-surface/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-lg font-display">ChipIn Admin</span>
            <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent">
              Payouts
            </span>
          </div>
          <nav className="flex items-center gap-3">
            <Link
              href="/admin/payouts"
              className={buttonStyles({ variant: 'outline', size: 'sm' })}
            >
              Payout Queue
            </Link>
            <Link href="/dashboard" className={buttonStyles({ variant: 'ghost', size: 'sm' })}>
              Host Dashboard
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
