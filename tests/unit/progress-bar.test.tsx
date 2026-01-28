/**
 * @vitest-environment jsdom
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import { ProgressBar } from '@/components/dream-board/ProgressBar';

describe('ProgressBar component', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation(() => ({
        matches: false,
        media: '(prefers-reduced-motion: reduce)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }))
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('renders with correct ARIA attributes', () => {
    render(<ProgressBar value={50} max={100} />);

    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toHaveAttribute('aria-valuenow', '50');
    expect(progressbar).toHaveAttribute('aria-valuemin', '0');
    expect(progressbar).toHaveAttribute('aria-valuemax', '100');
    expect(progressbar).toHaveAttribute('aria-label', 'Funding progress');
  });

  it('calculates percentage correctly', () => {
    const { rerender } = render(<ProgressBar value={25} max={100} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25');

    rerender(<ProgressBar value={500} max={1000} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');

    rerender(<ProgressBar value={3} max={10} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '30');
  });

  it('clamps percentage to 0-100 range', () => {
    const { rerender } = render(<ProgressBar value={-10} max={100} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');

    rerender(<ProgressBar value={150} max={100} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });

  it('renders milestone markers when showMilestones is true', () => {
    render(<ProgressBar value={50} max={100} showMilestones />);

    expect(screen.getByText('25%')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('hides milestone markers when showMilestones is false', () => {
    render(<ProgressBar value={50} max={100} showMilestones={false} />);

    expect(screen.queryByText('25%')).not.toBeInTheDocument();
    expect(screen.queryByText('50%')).not.toBeInTheDocument();
    expect(screen.queryByText('75%')).not.toBeInTheDocument();
  });

  it('highlights reached milestones', () => {
    const { container } = render(<ProgressBar value={60} max={100} showMilestones />);

    // 25% and 50% should have primary color (reached)
    const milestones = container.querySelectorAll('.text-xs');
    expect(milestones[0]).toHaveClass('text-primary'); // 25%
    expect(milestones[1]).toHaveClass('text-primary'); // 50%
    expect(milestones[2]).toHaveClass('text-text-muted'); // 75%
  });

  it('applies size classes correctly', () => {
    const { container, rerender } = render(<ProgressBar value={50} size="sm" />);
    expect(container.querySelector('.h-2')).toBeInTheDocument();

    rerender(<ProgressBar value={50} size="md" />);
    expect(container.querySelector('.h-3')).toBeInTheDocument();

    rerender(<ProgressBar value={50} size="lg" />);
    expect(container.querySelector('.h-4')).toBeInTheDocument();
  });

  it('shows completion indicator when 100%', () => {
    const { container, rerender } = render(<ProgressBar value={99} max={100} />);
    expect(container.querySelector('.bg-accent')).not.toBeInTheDocument();

    rerender(<ProgressBar value={100} max={100} />);
    expect(container.querySelector('.bg-accent')).toBeInTheDocument();
  });

  it('applies celebration animation when variant is celebration and complete', () => {
    const { container } = render(<ProgressBar value={100} max={100} variant="celebration" />);

    // Should have animate-pulse on the fill
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('respects reduced motion preference', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation(() => ({
        matches: true, // prefers reduced motion
        media: '(prefers-reduced-motion: reduce)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }))
    );

    const { container } = render(<ProgressBar value={100} max={100} variant="celebration" />);

    // Should NOT have animation classes when reduced motion is preferred
    expect(container.querySelector('.animate-pulse')).not.toBeInTheDocument();
    expect(container.querySelector('.animate-shimmer')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<ProgressBar value={50} className="custom-class" />);
    expect(screen.getByRole('progressbar')).toHaveClass('custom-class');
  });

  it('defaults max to 100', () => {
    render(<ProgressBar value={50} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
  });
});
