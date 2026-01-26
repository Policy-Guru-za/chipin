import { randomBytes } from 'crypto';

import { getApiKeyPrefix, hashApiKey } from '@/lib/api/auth';

export type ApiKeyTier = 'default' | 'partner' | 'enterprise';
export type ApiKeyEnvironment = 'live' | 'test';

const RATE_LIMITS: Record<ApiKeyTier, number> = {
  default: 1000,
  partner: 10000,
  enterprise: 0,
};

export const resolveRateLimit = (params: { tier?: ApiKeyTier; rateLimit?: number | null }) => {
  if (typeof params.rateLimit === 'number') {
    return params.rateLimit;
  }

  if (params.tier) {
    return RATE_LIMITS[params.tier];
  }

  return RATE_LIMITS.default;
};

export const generateApiKeyToken = (environment: ApiKeyEnvironment) => {
  const suffix = randomBytes(16).toString('hex');
  return `cpk_${environment}_${suffix}`;
};

export const buildApiKeyRecord = (params: { token: string }) => ({
  keyHash: hashApiKey(params.token),
  keyPrefix: getApiKeyPrefix(params.token),
});
