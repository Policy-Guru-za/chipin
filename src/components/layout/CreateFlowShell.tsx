import type { ReactNode } from 'react';

export function CreateFlowShell({
  stepLabel,
  title,
  subtitle,
  children,
}: {
  stepLabel: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-12">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
          {stepLabel}
        </p>
        <h1 className="text-3xl font-display text-text">{title}</h1>
        {subtitle ? <p className="text-text-muted">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}
