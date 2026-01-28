'use client';

import { type ReactNode } from 'react';
import { motion } from 'framer-motion';

import { useReducedMotion } from '@/hooks/useReducedMotion';
import { fadeUpVariants, scaleUpVariants, fadeVariants } from '@/lib/animations/variants';

type AnimationVariant = 'fadeUp' | 'scaleUp' | 'fade';

const variantMap = {
  fadeUp: fadeUpVariants,
  scaleUp: scaleUpVariants,
  fade: fadeVariants,
};

interface AnimatedDivProps {
  variant?: AnimationVariant;
  delay?: number;
  children: ReactNode;
  className?: string;
}

/**
 * Pre-configured animated div with common entrance animations.
 * Automatically disables animation when reduced motion is preferred.
 */
export function AnimatedDiv({
  variant = 'fadeUp',
  delay = 0,
  children,
  className,
}: AnimatedDivProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  const variants = variantMap[variant];

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      custom={delay}
      variants={variants}
      className={className}
    >
      {children}
    </motion.div>
  );
}
