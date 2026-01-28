/**
 * @vitest-environment jsdom
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';

import { AmountSelector } from '@/components/forms/AmountSelector';

describe('AmountSelector component', () => {
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

  it('renders preset amount buttons', () => {
    render(<AmountSelector />);

    // Default presets: 5000, 10000, 20000, 50000 cents
    expect(screen.getByRole('button', { name: 'R50' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'R100' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'R200' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'R500' })).toBeInTheDocument();
  });

  it('renders custom presets', () => {
    render(<AmountSelector presets={[2500, 7500, 15000]} />);

    expect(screen.getByRole('button', { name: 'R25' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'R75' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'R150' })).toBeInTheDocument();
  });

  it('uses custom currency symbol', () => {
    render(<AmountSelector currency="$" presets={[1000]} />);

    expect(screen.getByRole('button', { name: '$10' })).toBeInTheDocument();
  });

  it('calls onChange when preset is clicked', async () => {
    const handleChange = vi.fn();
    render(<AmountSelector onChange={handleChange} />);

    await userEvent.click(screen.getByRole('button', { name: 'R100' }));
    expect(handleChange).toHaveBeenCalledWith(10000);
  });

  it('shows selected state for current value', () => {
    render(<AmountSelector value={10000} />);

    const selectedButton = screen.getByRole('button', { name: 'R100' });
    expect(selectedButton).toHaveClass('border-primary');
  });

  it('renders custom amount input', () => {
    render(<AmountSelector />);

    expect(screen.getByPlaceholderText('Custom amount')).toBeInTheDocument();
  });

  it('handles custom amount input', async () => {
    const handleChange = vi.fn();
    render(<AmountSelector onChange={handleChange} />);

    const input = screen.getByPlaceholderText('Custom amount');
    await userEvent.click(input);
    await userEvent.type(input, '150');

    expect(handleChange).toHaveBeenLastCalledWith(15000); // 150 * 100 cents
  });

  it('clears preset selection when custom input is focused', async () => {
    const handleChange = vi.fn();
    render(<AmountSelector value={10000} onChange={handleChange} />);

    await userEvent.click(screen.getByPlaceholderText('Custom amount'));
    expect(handleChange).toHaveBeenCalledWith(null);
  });

  it('strips non-numeric characters from custom input', async () => {
    const handleChange = vi.fn();
    render(<AmountSelector onChange={handleChange} minAmount={0} />);

    const input = screen.getByPlaceholderText('Custom amount');
    await userEvent.click(input);
    await userEvent.type(input, 'abc123def');

    expect(input).toHaveValue('123');
  });

  it('shows error when amount is below minimum', async () => {
    const handleChange = vi.fn();
    render(<AmountSelector onChange={handleChange} minAmount={5000} />);

    const input = screen.getByPlaceholderText('Custom amount');
    await userEvent.click(input);
    await userEvent.type(input, '10'); // R10 = 1000 cents, below 5000

    expect(screen.getByRole('alert')).toHaveTextContent('Minimum amount is R50');
    expect(handleChange).toHaveBeenLastCalledWith(null);
  });

  it('shows error when amount exceeds maximum', async () => {
    const handleChange = vi.fn();
    render(<AmountSelector onChange={handleChange} maxAmount={10000} />);

    const input = screen.getByPlaceholderText('Custom amount');
    await userEvent.click(input);
    await userEvent.type(input, '200'); // R200 = 20000 cents, above 10000

    expect(screen.getByRole('alert')).toHaveTextContent('Maximum amount is R100');
    expect(handleChange).toHaveBeenLastCalledWith(null);
  });

  it('clears error when valid amount is entered', async () => {
    const handleChange = vi.fn();
    render(<AmountSelector onChange={handleChange} minAmount={5000} />);

    const input = screen.getByPlaceholderText('Custom amount');
    await userEvent.click(input);
    await userEvent.type(input, '10'); // Too low

    expect(screen.getByRole('alert')).toBeInTheDocument();

    await userEvent.clear(input);
    await userEvent.type(input, '100'); // Valid

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows min/max hint when no error', () => {
    render(<AmountSelector minAmount={1000} maxAmount={100000} />);

    expect(screen.getByText('Min R10 · Max R1,000')).toBeInTheDocument();
  });

  it('hides min/max hint when error is shown', async () => {
    render(<AmountSelector minAmount={5000} />);

    const input = screen.getByPlaceholderText('Custom amount');
    await userEvent.click(input);
    await userEvent.type(input, '10');

    expect(screen.queryByText(/Min R/)).not.toBeInTheDocument();
  });

  it('reflects external value changes on preset buttons', async () => {
    const handleChange = vi.fn();
    const { rerender } = render(<AmountSelector value={10000} onChange={handleChange} />);

    // Initially R100 is selected
    expect(screen.getByRole('button', { name: 'R100' })).toHaveClass('border-primary');

    // External value change to R200
    rerender(<AmountSelector value={20000} onChange={handleChange} />);

    // R200 should now be selected
    expect(screen.getByRole('button', { name: 'R200' })).toHaveClass('border-primary');
    expect(screen.getByRole('button', { name: 'R100' })).not.toHaveClass('border-primary');
  });

  it('applies custom className', () => {
    const { container } = render(<AmountSelector className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
