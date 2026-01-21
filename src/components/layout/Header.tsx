import Link from 'next/link';

import { buttonStyles } from '@/components/ui/button';

const navLinkClasses =
  'text-sm font-medium text-text-muted transition hover:text-text';

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-xl font-display text-text">
          ChipIn
        </Link>
        <nav className="flex items-center gap-6">
          <Link href="/#how-it-works" className={navLinkClasses}>
            How it works
          </Link>
          <Link href="/#safety" className={navLinkClasses}>
            Trust & safety
          </Link>
          <Link href="/create" className={buttonStyles({ size: 'sm' })}>
            Create a Dream Board
          </Link>
        </nav>
      </div>
    </header>
  );
}
