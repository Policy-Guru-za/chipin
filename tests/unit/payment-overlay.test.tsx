/**
 * @vitest-environment jsdom
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import { PaymentOverlay } from '@/components/effects/PaymentOverlay';

const mockMatchMedia = (matches = false) =>
  vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  }));

describe('PaymentOverlay component', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', mockMatchMedia(false));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('renders provider-specific copy', () => {
    render(<PaymentOverlay provider="payfast" />);
    expect(screen.getByText('Redirecting to PayFast...')).toBeInTheDocument();
  });

  it('hides spinner when reduced motion is enabled', () => {
    vi.stubGlobal('matchMedia', mockMatchMedia(true));
    const { container } = render(<PaymentOverlay provider="ozow" />);

    expect(container.querySelector('.animate-spin')).not.toBeInTheDocument();
  });
});
