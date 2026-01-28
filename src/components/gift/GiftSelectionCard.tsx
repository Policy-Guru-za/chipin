'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

import { cn } from '@/lib/utils';
import { CheckIcon } from '@/components/icons';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface GiftSelectionCardProps {
  imageUrl: string;
  title: string;
  subtitle?: string;
  price?: string;
  isSelected?: boolean;
  onClick?: () => void;
  variant?: 'product' | 'cause';
}

export function GiftSelectionCard({
  imageUrl,
  title,
  subtitle,
  price,
  isSelected = false,
  onClick,
  variant = 'product',
}: GiftSelectionCardProps) {
  const prefersReducedMotion = useReducedMotion();

  const MotionWrapper = prefersReducedMotion ? 'button' : motion.button;
  const motionProps = prefersReducedMotion
    ? {}
    : {
        whileHover: { scale: 1.02, rotate: isSelected ? 0 : -1 },
        whileTap: { scale: 0.98 },
      };

  return (
    <MotionWrapper
      type="button"
      onClick={onClick}
      {...motionProps}
      className={cn(
        'group relative w-full text-left',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2'
      )}
    >
      {/* Decorative tilted backing */}
      <div
        className={cn(
          'absolute inset-0 -z-10 rounded-2xl transition-all duration-300',
          isSelected ? 'opacity-0' : 'rotate-2 bg-accent/20 group-hover:rotate-3'
        )}
        aria-hidden="true"
      />

      {/* Main card */}
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl border-2 bg-white transition-all duration-300',
          isSelected
            ? 'rotate-0 border-primary shadow-lifted'
            : 'rotate-[-1deg] border-border shadow-soft group-hover:border-primary/30'
        )}
      >
        {/* Selection indicator */}
        {isSelected && (
          <div className="absolute right-3 top-3 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white">
            <CheckIcon size="sm" />
          </div>
        )}

        {/* Image container */}
        <div className="relative aspect-[4/3] w-full overflow-hidden">
          <Image
            src={imageUrl}
            alt={title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {/* Gradient overlay */}
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"
            aria-hidden="true"
          />

          {/* Price tag */}
          {price && (
            <div className="absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-sm font-semibold text-text backdrop-blur-sm">
              {price}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="line-clamp-2 font-display text-lg text-text">{title}</h3>
          {subtitle && <p className="mt-1 line-clamp-2 text-sm text-text-muted">{subtitle}</p>}

          {/* Variant badge */}
          <div className="mt-3">
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                variant === 'product'
                  ? 'bg-primary/10 text-primary'
                  : 'bg-accent/10 text-accent-600'
              )}
            >
              {variant === 'product' ? 'Product' : 'Charity'}
            </span>
          </div>
        </div>
      </div>
    </MotionWrapper>
  );
}
