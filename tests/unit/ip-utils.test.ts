import { describe, expect, it } from 'vitest';

import { isIpInRanges } from '@/lib/utils/ip';

describe('isIpInRanges', () => {
  it('returns false for empty or IPv6 addresses', () => {
    expect(isIpInRanges('', ['127.0.0.1'])).toBe(false);
    expect(isIpInRanges('2001:db8::1', ['2001:db8::/32'])).toBe(false);
  });

  it('matches exact IPv4 addresses', () => {
    expect(isIpInRanges('203.0.113.10', ['203.0.113.10'])).toBe(true);
    expect(isIpInRanges('203.0.113.11', ['203.0.113.10'])).toBe(false);
  });

  it('matches CIDR ranges', () => {
    expect(isIpInRanges('192.168.1.42', ['192.168.1.0/24'])).toBe(true);
    expect(isIpInRanges('192.168.2.42', ['192.168.1.0/24'])).toBe(false);
  });

  it('ignores invalid CIDR ranges', () => {
    expect(isIpInRanges('10.0.0.1', ['invalid', '10.0.0.0/8'])).toBe(true);
    expect(isIpInRanges('10.0.0.1', ['10.0.0.0/not-a-number'])).toBe(false);
  });
});
