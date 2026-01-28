import Link from 'next/link';

import { cn } from '@/lib/utils';
import { Button, type ButtonProps } from '@/components/ui/button';
import { GiftIcon, HeartIcon, SearchIcon, BoxIcon } from '@/components/icons';

type EmptyStateVariant = 'boards' | 'contributions' | 'search' | 'generic';

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  title?: string;
  description?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
    variant?: ButtonProps['variant'];
  };
  className?: string;
}

const variantConfig: Record<
  EmptyStateVariant,
  {
    icon: React.ReactNode;
    defaultTitle: string;
    defaultDescription: string;
  }
> = {
  boards: {
    icon: <GiftIcon size="xl" />,
    defaultTitle: 'No Dream Boards yet',
    defaultDescription:
      "Create your first board and start collecting contributions for your child's special day.",
  },
  contributions: {
    icon: <HeartIcon size="xl" />,
    defaultTitle: 'No contributions yet',
    defaultDescription: 'Share your link with friends and family to start receiving contributions.',
  },
  search: {
    icon: <SearchIcon size="xl" />,
    defaultTitle: 'No results found',
    defaultDescription: "Try adjusting your search or filters to find what you're looking for.",
  },
  generic: {
    icon: <BoxIcon size="xl" />,
    defaultTitle: 'Nothing here yet',
    defaultDescription: 'Check back later or try a different view.',
  },
};

export function EmptyState({
  variant = 'generic',
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  const config = variantConfig[variant];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        'px-6 py-12',
        className
      )}
    >
      {/* Illustrated icon container */}
      <div className="relative mb-6">
        {/* Decorative circles */}
        <div
          className="absolute inset-0 scale-150 transform rounded-full bg-primary/10 blur-xl"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 translate-x-2 scale-125 transform rounded-full bg-accent/10 blur-lg"
          aria-hidden="true"
        />

        {/* Icon container */}
        <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/20 to-accent/10">
          <div className="text-primary">{config.icon}</div>
        </div>
      </div>

      {/* Typography */}
      <h3 className="mb-2 font-display text-xl text-text">{title ?? config.defaultTitle}</h3>
      <p className="mb-6 max-w-sm text-text-muted">{description ?? config.defaultDescription}</p>

      {/* Action button */}
      {action &&
        (action.href ? (
          <Link href={action.href}>
            <Button variant={action.variant ?? 'primary'} size="lg">
              {action.label}
            </Button>
          </Link>
        ) : (
          <Button variant={action.variant ?? 'primary'} size="lg" onClick={action.onClick}>
            {action.label}
          </Button>
        ))}
    </div>
  );
}
