import Link from 'next/link';

import { cn } from '@/lib/utils';

import { buttonVariants } from './button';
import { Card, CardContent } from './card';

type StateCardVariant = 'empty' | 'closed' | 'error' | 'loading';

type StateCardProps = {
  variant?: StateCardVariant;
  title?: string;
  body?: string;
  ctaLabel?: string;
  ctaHref?: string;
  ctaVariant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  className?: string;
};

const variantStyles: Record<StateCardVariant, string> = {
  empty: 'bg-subtle text-text-muted',
  closed: 'bg-white text-text',
  error: 'border-red-200 bg-red-50 text-red-700',
  loading: 'bg-subtle text-text-muted animate-pulse',
};

export function StateCard({
  variant = 'empty',
  title,
  body,
  ctaLabel,
  ctaHref,
  ctaVariant = 'outline',
  className,
}: StateCardProps) {
  return (
    <Card className={cn('shadow-none', variantStyles[variant], className)}>
      <CardContent className="space-y-3 py-6 text-sm">
        {title ? <p className="font-semibold">{title}</p> : null}
        {body ? <p>{body}</p> : null}
        {ctaLabel && ctaHref ? (
          <Link href={ctaHref} className={buttonVariants({ variant: ctaVariant })}>
            {ctaLabel}
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
}
