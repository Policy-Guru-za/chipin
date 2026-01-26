import { createHash } from 'crypto';

import { getApiKeyByHash } from '@/lib/db/queries';

export type ApiKeyScope =
  | 'dreamboards:read'
  | 'dreamboards:write'
  | 'contributions:read'
  | 'payouts:read'
  | 'payouts:write'
  | 'webhooks:manage';

export type ApiKeyRecord = {
  id: string;
  partnerId: string;
  partnerName: string;
  scopes: string[];
  rateLimit: number;
  isActive: boolean;
};

export type ApiAuthError = {
  code: 'unauthorized' | 'forbidden';
  message: string;
  status: number;
};

export type ApiAuthResult = { ok: true; apiKey: ApiKeyRecord } | { ok: false; error: ApiAuthError };

const API_KEY_REGEX = /^cpk_(live|test)_[a-zA-Z0-9]{32}$/;

/** Normalize legacy dream board scope naming to the API standard. */
export const normalizeScope = (scope: string) => scope.replace('dream_boards', 'dreamboards');

/** Normalize all scopes for comparison. */
export const normalizeScopes = (scopes: string[]) => scopes.map(normalizeScope);

/** Check whether an API key includes the required scope. */
export const hasScope = (scopes: string[], requiredScope: ApiKeyScope) =>
  normalizeScopes(scopes).includes(normalizeScope(requiredScope));

/** Hash a raw API token with SHA-256 for lookup. */
export const hashApiKey = (token: string) => createHash('sha256').update(token).digest('hex');

/** Extract the key prefix to partition the lookup. */
export const getApiKeyPrefix = (token: string) => {
  const [prefix, env] = token.split('_');
  return `${prefix}_${env}_`;
};

/** Parse and validate the Authorization header for a bearer API key. */
export const parseApiKey = (authHeader?: string | null) => {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  if (!API_KEY_REGEX.test(token)) return null;
  return { token, prefix: getApiKeyPrefix(token) };
};

/** Validate API key authenticity, status, and required scope. */
export const requireApiKey = async (
  authHeader: string | null | undefined,
  requiredScope: ApiKeyScope
): Promise<ApiAuthResult> => {
  const parsed = parseApiKey(authHeader);
  if (!parsed) {
    return {
      ok: false,
      error: {
        code: 'unauthorized',
        message: 'Invalid or missing API key',
        status: 401,
      },
    };
  }

  const apiKey = await getApiKeyByHash({
    keyPrefix: parsed.prefix,
    keyHash: hashApiKey(parsed.token),
  });

  if (!apiKey || !apiKey.isActive) {
    return {
      ok: false,
      error: {
        code: 'unauthorized',
        message: 'Invalid or missing API key',
        status: 401,
      },
    };
  }

  if (!hasScope(apiKey.scopes, requiredScope)) {
    return {
      ok: false,
      error: {
        code: 'forbidden',
        message: 'API key does not have the required scope',
        status: 403,
      },
    };
  }

  return { ok: true, apiKey };
};
