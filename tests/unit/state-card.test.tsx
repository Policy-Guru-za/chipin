import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: any }) => <a href={href}>{children}</a>,
}));

import { StateCard } from '@/components/ui/state-card';

describe('StateCard', () => {
  it('renders title and body', () => {
    const html = renderToStaticMarkup(
      <StateCard variant="error" title="Something went wrong" body="Try again." />
    );

    expect(html).toContain('Something went wrong');
    expect(html).toContain('Try again.');
  });

  it('renders a CTA link when provided', () => {
    const html = renderToStaticMarkup(
      <StateCard variant="closed" body="Closed" ctaLabel="Go back" ctaHref="/" />
    );

    expect(html).toContain('Go back');
    expect(html).toContain('href="/"');
    expect(html).not.toContain('<button');
  });
});
