'use client';

import { lazy, Suspense, type ReactNode, type ComponentType } from 'react';

import { useReducedMotion } from '@/hooks/useReducedMotion';

interface MotionWrapperProps {
  children: ReactNode;
  className?: string;
}

/**
 * Lazy-load framer-motion components to avoid eager bundling.
 */
const LazyStaggerContainerInner = lazy(() =>
  Promise.all([import('framer-motion'), import('@/lib/animations/variants')]).then(
    ([{ motion }, { staggerContainerVariants }]) => ({
      default: function StaggerContainerInner({ children, className }: MotionWrapperProps) {
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
      },
    })
  )
);

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
    <Suspense fallback={<div className={className}>{children}</div>}>
      <LazyStaggerContainerInner className={className}>{children}</LazyStaggerContainerInner>
    </Suspense>
  );
}

type MotionItemVariants = Record<string, { opacity?: number; y?: number; x?: number }>;

interface MotionItemProps extends MotionWrapperProps {
  variants?: MotionItemVariants;
}

const LazyMotionItemInner = lazy(() =>
  import('framer-motion').then(({ motion }) => ({
    default: function MotionItemInner({ children, className, variants }: MotionItemProps) {
      const defaultVariants: MotionItemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
      };

      return (
        <motion.div variants={variants ?? defaultVariants} className={className}>
          {children}
        </motion.div>
      );
    },
  }))
) as ComponentType<MotionItemProps>;

/**
 * Individual motion item for use inside StaggerContainer.
 */
export function MotionItem({ children, className, variants }: MotionItemProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <Suspense fallback={<div className={className}>{children}</div>}>
      <LazyMotionItemInner className={className} variants={variants}>
        {children}
      </LazyMotionItemInner>
    </Suspense>
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
