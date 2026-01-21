import { requireSession } from '@/lib/auth/session';

export default async function CreateChildPage() {
  await requireSession();

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-6 py-12">
      <h1 className="text-3xl font-display text-text">Who’s the birthday star?</h1>
      <p className="text-text-muted">Child details form coming next.</p>
    </section>
  );
}
