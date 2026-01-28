import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';
import { LoadingSpinner } from '@/components/icons';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold ' +
    'ring-offset-surface transition-all duration-150 ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 ' +
    'disabled:pointer-events-none disabled:opacity-50 ' +
    'active:scale-[0.97] active:duration-75',
  {
    variants: {
      variant: {
        primary:
          'bg-gradient-to-br from-primary to-primary-700 text-white ' +
          'shadow-[0_2px_8px_rgba(13,148,136,0.3)] ' +
          'hover:shadow-[0_4px_16px_rgba(13,148,136,0.4)] ' +
          'hover:-translate-y-0.5 ' +
          'active:shadow-[0_1px_4px_rgba(13,148,136,0.3)] ' +
          'active:translate-y-0',
        secondary:
          'bg-gradient-to-br from-accent to-accent-600 text-white ' +
          'shadow-[0_2px_8px_rgba(249,115,22,0.3)] ' +
          'hover:shadow-[0_4px_16px_rgba(249,115,22,0.4)] ' +
          'hover:-translate-y-0.5 ' +
          'active:shadow-[0_1px_4px_rgba(249,115,22,0.3)]',
        outline:
          'border-2 border-border bg-transparent text-text ' +
          'hover:border-primary/50 hover:bg-primary/5 hover:text-primary ' +
          'active:bg-primary/10',
        ghost: 'text-text-muted hover:text-text hover:bg-subtle ' + 'active:bg-border',
        destructive:
          'bg-red-600 text-white shadow-sm ' +
          'hover:bg-red-700 hover:-translate-y-0.5 ' +
          'active:scale-[0.97]',
        link: 'text-primary underline-offset-4 hover:underline ' + 'active:text-primary-700',
      },
      size: {
        sm: 'h-9 px-4 py-2 text-sm',
        md: 'h-11 px-5 py-2.5 text-sm',
        lg: 'h-14 px-8 py-3 text-base',
        icon: 'h-10 w-10',
      },
      width: {
        default: '',
        full: 'w-full',
        auto: 'w-auto',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      width: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      width,
      asChild = false,
      loading = false,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';
    const isDisabled = disabled || loading;

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, width, className }), loading && 'opacity-70')}
        ref={ref}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-busy={loading}
        {...props}
      >
        {loading ? (
          <>
            <LoadingSpinner size="sm" />
            <span className="opacity-80">{children}</span>
          </>
        ) : (
          children
        )}
      </Comp>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
