'use client';

import { useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { AnimatePresence, LazyMotion, domAnimation, m } from 'framer-motion';

import { buttonVariants } from '@/components/ui/button';
import { XIcon } from '@/components/icons';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

const navLinks = [
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/#safety', label: 'Trust & safety' },
];

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const prefersReducedMotion = useReducedMotion();
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus trap
  useEffect(() => {
    if (!isOpen || !drawerRef.current) return;

    const drawer = drawerRef.current;
    const focusableElements = drawer.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus close button on open
    closeButtonRef.current?.focus();

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    };

    document.addEventListener('keydown', handleTabKey);
    return () => document.removeEventListener('keydown', handleTabKey);
  }, [isOpen]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleLinkClick = useCallback(() => {
    onClose();
  }, [onClose]);

  const animationProps = prefersReducedMotion
    ? { initial: false, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { x: '100%' },
        animate: { x: 0 },
        exit: { x: '100%' },
        transition: { type: 'tween', duration: 0.3, ease: [0.32, 0.72, 0, 1] },
      };

  const backdropProps = prefersReducedMotion
    ? { initial: false, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.2 },
      };

  return (
    <LazyMotion features={domAnimation}>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <m.div
              {...backdropProps}
              className="fixed inset-0 z-40 bg-black/50"
              onClick={onClose}
              aria-hidden="true"
            />

            {/* Drawer */}
            <m.div
              ref={drawerRef}
              {...animationProps}
              id="mobile-nav"
              className="fixed inset-y-0 right-0 z-50 w-full max-w-xs bg-surface shadow-lifted"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
            >
              <div className="flex h-full flex-col">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border px-6 py-4">
                  <span className="font-display text-lg text-text">Menu</span>
                  <button
                    ref={closeButtonRef}
                    onClick={onClose}
                    className="rounded-lg p-2 text-text-muted hover:bg-subtle hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label="Close menu"
                  >
                    <XIcon size="lg" />
                  </button>
                </div>

                {/* Nav links */}
                <nav className="flex-1 px-6 py-6">
                  <ul className="space-y-2">
                    {navLinks.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          onClick={handleLinkClick}
                          className="block rounded-xl px-4 py-3 text-base font-medium text-text transition-colors hover:bg-subtle"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>

                {/* CTA */}
                <div className="border-t border-border px-6 py-6">
                  <Link
                    href="/create"
                    onClick={handleLinkClick}
                    className={buttonVariants({ size: 'lg', className: 'w-full justify-center' })}
                  >
                    Create a Dream Board
                  </Link>
                </div>
              </div>
            </m.div>
          </>
        )}
      </AnimatePresence>
    </LazyMotion>
  );
}
