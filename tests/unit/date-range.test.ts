import { describe, expect, it } from 'vitest';

import { isDateWithinRange, isDeadlineWithinRange } from '../../src/lib/dream-boards/validation';

describe('isDateWithinRange', () => {
  it('accepts today', () => {
    const today = new Date();
    const dateString = today.toISOString().split('T')[0];
    expect(isDateWithinRange(dateString)).toBe(true);
  });

  it('rejects dates beyond 90 days', () => {
    const date = new Date(Date.now() + 1000 * 60 * 60 * 24 * 120);
    const dateString = date.toISOString().split('T')[0];
    expect(isDateWithinRange(dateString)).toBe(false);
  });
});

describe('isDeadlineWithinRange', () => {
  it('rejects today', () => {
    const today = new Date();
    const dateString = today.toISOString().split('T')[0];
    expect(isDeadlineWithinRange(dateString)).toBe(false);
  });

  it('accepts tomorrow', () => {
    const date = new Date(Date.now() + 1000 * 60 * 60 * 24);
    const dateString = date.toISOString().split('T')[0];
    expect(isDeadlineWithinRange(dateString)).toBe(true);
  });
});
