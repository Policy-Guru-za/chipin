type CidrRange = {
  network: number;
  mask: number;
};

const toInt = (value: string) =>
  value
    .split('.')
    .map((part) => Number(part))
    .reduce((acc, part) => ((acc << 8) + part) >>> 0, 0);

const parseCidr = (cidr: string): CidrRange | null => {
  const [base, bitsString] = cidr.split('/');
  const bits = Number(bitsString);
  if (!base || Number.isNaN(bits)) {
    return null;
  }
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return { network: toInt(base) & mask, mask };
};

export const isIpInRanges = (ip: string, ranges: string[]) => {
  if (!ip || ip.includes(':')) {
    return false;
  }

  const ipValue = toInt(ip);
  return ranges.some((range) => {
    if (range.includes('/')) {
      const cidr = parseCidr(range);
      if (!cidr) return false;
      return (ipValue & cidr.mask) === cidr.network;
    }

    return ip === range;
  });
};
