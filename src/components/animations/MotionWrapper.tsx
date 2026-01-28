'use client';

import { lazy, Suspense, type ReactNode } from 'react';
import { motion, type Variants } from 'framer-motion';

import { useReducedMotion } from '@/hooks/useReducedMotion';
import { staggerContainerVariants } from '@/lib/animations/variants';

interface MotionWrapperProps {
  children: ReactNode;
  className?: string;
}

/**
 * Wrapper for stagger animations.
 * Use with AnimatedDiv children for coordinated entrance.
 */
export function StaggerContainer({ children, className }: MotionWrapperProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainerVariants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface MotionItemProps extends MotionWrapperProps {
  variants?: Variants;
}

/**
 * Individual motion item for use inside StaggerContainer.
 */
export function MotionItem({ children, className, variants }: MotionItemProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  const defaultVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div variants={variants ?? defaultVariants} className={className}>
      {children}
    </motion.div>
  );
}

/**
 * Lazy-loaded motion wrapper for non-critical animations.
 * Reduces initial bundle size.
 */
const LazyMotionDiv = lazy(() =>
  import('framer-motion').then((mod) => ({
    default: mod.motion.div,
  }))
);

interface LazyMotionWrapperProps extends MotionWrapperProps {
  fallback?: ReactNode;
}

export function LazyMotionWrapper({ children, className, fallback }: LazyMotionWrapperProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <Suspense fallback={fallback ?? <div className={className}>{children}</div>}>
      <LazyMotionDiv
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className={className}
      >
        {children}
      </LazyMotionDiv>
    </Suspense>
  );
}
