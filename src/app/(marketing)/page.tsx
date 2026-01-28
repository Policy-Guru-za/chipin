import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { GiftIcon, HeartIcon, SparkleIcon } from '@/components/icons';

const HOW_IT_WORKS_STEPS = [
  {
    icon: <GiftIcon size="lg" />,
    title: '1. Build the board',
    description: 'Choose the gift, add a photo, and set the goal.',
  },
  {
    icon: <HeartIcon size="lg" />,
    title: '2. Share with guests',
    description: 'Guests contribute in a few taps on mobile.',
  },
  {
    icon: <SparkleIcon size="lg" />,
    title: '3. Celebrate',
    description: 'We deliver the payout and unlock overflow giving.',
  },
];

export default function MarketingPage() {
  return (
    <div className="bg-subtle">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Gradient background */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at top right, rgba(94, 234, 212, 0.15), transparent 50%), ' +
              'radial-gradient(ellipse at bottom left, rgba(249, 115, 22, 0.1), transparent 50%)',
          }}
          aria-hidden="true"
        />

        <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center gap-10 px-6 py-20">
          <div className="max-w-2xl space-y-6">
            <p className="animate-fade-up text-sm font-semibold uppercase tracking-[0.2em] text-text-muted">
              ChipIn
            </p>
            <h1 className="animate-fade-up-delay-1 text-balance font-display text-4xl text-text sm:text-6xl">
              Turn many small gifts into one dream moment.
            </h1>
            <p className="animate-fade-up-delay-2 text-lg text-text-muted">
              Friends chip in together for a child&apos;s birthday so the big gift feels possible
              and personal.
            </p>
            <div className="animate-fade-up-delay-3 flex flex-wrap items-center gap-4">
              <Link href="/create" className={buttonVariants({ size: 'lg' })}>
                Create a Dream Board
              </Link>
              <span className="text-sm text-text-muted">
                No fees until you&apos;re ready to go live.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* How it works Section */}
      <section id="how-it-works" className="mx-auto w-full max-w-6xl px-6 pb-20">
        <Card variant="glass" padding="lg">
          <div className="space-y-6">
            <h2 className="font-display text-3xl text-text">How it works</h2>
            <p className="text-base text-text-muted">
              Create a Dream Board, share the link, and let friends contribute. Once the goal is
              reached, we handle the payout and switch to a charity overflow view.
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              {HOW_IT_WORKS_STEPS.map((step, index) => (
                <Card
                  key={step.title}
                  variant="default"
                  padding="sm"
                  className="group transition-all hover:-translate-y-1"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                    {step.icon}
                  </div>
                  <p className="font-semibold text-text">{step.title}</p>
                  <p className="mt-1 text-sm text-text-muted">{step.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </Card>
      </section>

      {/* Trust & Safety Section */}
      <section id="safety" className="mx-auto w-full max-w-6xl px-6 pb-20">
        <Card variant="feature" padding="lg">
          <h2 className="font-display text-3xl text-text">Trust & safety</h2>
          <p className="mt-4 text-base text-text-muted">
            Payments are processed by trusted providers, and every contribution is tracked with
            secure webhooks and verification.
          </p>
        </Card>
      </section>
    </div>
  );
}
