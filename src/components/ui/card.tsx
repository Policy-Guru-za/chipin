import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const cardVariants = cva('relative overflow-hidden transition-all duration-300', {
  variants: {
    variant: {
      default: 'rounded-2xl border border-border bg-surface shadow-soft ' + 'hover:shadow-lifted',
      elevated:
        'rounded-2xl border border-border bg-white shadow-lifted ' +
        'hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(0,0,0,0.1)]',
      tilted:
        'rounded-2xl bg-white shadow-soft ' +
        'before:absolute before:inset-0 before:-z-10 before:rounded-2xl ' +
        'before:bg-accent/15 before:rotate-2 ' +
        'hover:before:rotate-3 hover:-translate-y-0.5',
      feature:
        'rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 ' +
        'shadow-[0_8px_24px_rgba(13,148,136,0.08)]',
      glass: 'rounded-2xl border border-white/20 bg-white/70 backdrop-blur-md ' + 'shadow-soft',
      minimal: 'rounded-2xl border-2 border-border bg-transparent ' + 'hover:border-primary/30',
    },
    padding: {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    },
    interactive: {
      true: 'cursor-pointer',
      false: '',
    },
  },
  defaultVariants: {
    variant: 'default',
    padding: 'md',
    interactive: false,
  },
});

interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {
  as?: React.ElementType;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, interactive, as: Component = 'div', ...props }, ref) => (
    <Component
      ref={ref}
      className={cn(cardVariants({ variant, padding, interactive }), className)}
      {...props}
    />
  )
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('space-y-2', className)} {...props} />
  )
);
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn('font-display text-xl text-text', className)} {...props} />
  )
);
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-sm text-text-muted', className)} {...props} />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn('', className)} {...props} />
);
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('mt-6 flex items-center gap-3', className)} {...props} />
  )
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, cardVariants };
