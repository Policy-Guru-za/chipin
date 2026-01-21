import * as React from 'react';

import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

const baseStyles =
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:pointer-events-none disabled:opacity-50';

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white shadow-soft hover:-translate-y-0.5 hover:shadow-lifted',
  secondary: 'bg-accent text-white shadow-soft hover:-translate-y-0.5 hover:shadow-lifted',
  outline: 'border border-border bg-transparent text-text hover:bg-subtle',
  ghost: 'bg-transparent text-text hover:bg-subtle',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
};

export const buttonStyles = (options?: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) => {
  const { variant = 'primary', size = 'md', className } = options ?? {};
  return cn(baseStyles, variantStyles[variant], sizeStyles[size], className);
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => (
    <button ref={ref} className={buttonStyles({ variant, size, className })} {...props} />
  )
);

Button.displayName = 'Button';
