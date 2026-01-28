/**
 * @vitest-environment jsdom
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';

import { MobileNav } from '@/components/layout/MobileNav';

const mockMatchMedia = (matches = false) =>
  vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  }));

describe('MobileNav component', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', mockMatchMedia(false));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('renders a dialog with the expected id when open', () => {
    render(<MobileNav isOpen onClose={() => {}} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('id', 'mobile-nav');
  });

  it('closes when the close button is clicked', async () => {
    const onClose = vi.fn();
    render(<MobileNav isOpen onClose={onClose} />);

    await userEvent.click(screen.getByLabelText('Close menu'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
