import { requireSession } from '@/lib/auth/session';

export default async function HostDashboardPage() {
  await requireSession();
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-6 py-12">
      <h1 className="text-3xl font-display text-text">Your Dream Boards</h1>
      <p className="text-text-muted">
        We’re setting up your dashboard. Create a new Dream Board to get started.
      </p>
    </section>
  );
}
