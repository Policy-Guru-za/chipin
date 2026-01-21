import { describe, expect, it } from 'vitest';

import { normalizeEmail } from '../../src/lib/db/queries';

describe('normalizeEmail', () => {
  it('trims and lowercases email', () => {
    expect(normalizeEmail('  Example@Email.COM ')).toBe('example@email.com');
  });
});
