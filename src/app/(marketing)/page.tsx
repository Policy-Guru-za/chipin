import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';

export default function MarketingPage() {
  return (
    <div className="bg-subtle">
      <section className="relative overflow-hidden">
        <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center gap-10 px-6 py-20">
          <div className="max-w-2xl space-y-6">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-text-muted">
              ChipIn
            </p>
            <h1 className="text-balance text-4xl font-display text-text sm:text-6xl">
              Turn many small gifts into one dream moment.
            </h1>
            <p className="text-lg text-text-muted">
              Friends chip in together for a child’s birthday so the big gift feels possible and
              personal.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/create" className={buttonVariants({ size: 'lg' })}>
                Create a Dream Board
              </Link>
              <span className="text-sm text-text-muted">
                No fees until you’re ready to go live.
              </span>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto w-full max-w-6xl px-6 pb-20">
        <div className="grid gap-6 rounded-3xl border border-border bg-white/70 p-8 shadow-soft backdrop-blur">
          <h2 className="text-3xl font-display text-text">How it works</h2>
          <p className="text-base text-text-muted">
            Create a Dream Board, share the link, and let friends contribute. Once the goal is
            reached, we handle the payout and switch to a charity overflow view.
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-border bg-surface p-4">
              <p className="text-sm font-semibold text-text">1. Build the board</p>
              <p className="text-sm text-text-muted">
                Choose the gift, add a photo, and set the goal.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-surface p-4">
              <p className="text-sm font-semibold text-text">2. Share with guests</p>
              <p className="text-sm text-text-muted">Guests contribute in a few taps on mobile.</p>
            </div>
            <div className="rounded-2xl border border-border bg-surface p-4">
              <p className="text-sm font-semibold text-text">3. Celebrate</p>
              <p className="text-sm text-text-muted">
                We deliver the payout and unlock overflow giving.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="safety" className="mx-auto w-full max-w-6xl px-6 pb-20">
        <div className="grid gap-4 rounded-3xl border border-border bg-surface p-8">
          <h2 className="text-3xl font-display text-text">Trust & safety</h2>
          <p className="text-base text-text-muted">
            Payments are processed by trusted providers, and every contribution is tracked with
            secure webhooks and verification.
          </p>
        </div>
      </section>
    </div>
  );
}
