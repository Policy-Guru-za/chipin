import { eq } from 'drizzle-orm';

import { db } from './index';
import { apiKeys } from './schema';

export const getApiKeyById = async (id: string) => {
  const [apiKey] = await db
    .select({
      id: apiKeys.id,
      partnerName: apiKeys.partnerName,
      scopes: apiKeys.scopes,
      rateLimit: apiKeys.rateLimit,
      isActive: apiKeys.isActive,
      keyPrefix: apiKeys.keyPrefix,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.id, id))
    .limit(1);

  return apiKey ?? null;
};

export const createApiKeyRecord = async (params: {
  partnerName: string;
  scopes: string[];
  rateLimit: number;
  keyHash: string;
  keyPrefix: string;
}) => {
  const [created] = await db
    .insert(apiKeys)
    .values({
      partnerName: params.partnerName,
      scopes: params.scopes,
      rateLimit: params.rateLimit,
      keyHash: params.keyHash,
      keyPrefix: params.keyPrefix,
    })
    .returning({
      id: apiKeys.id,
      partnerName: apiKeys.partnerName,
      scopes: apiKeys.scopes,
      rateLimit: apiKeys.rateLimit,
      isActive: apiKeys.isActive,
      createdAt: apiKeys.createdAt,
    });

  return created ?? null;
};

export const deactivateApiKey = async (id: string) => {
  const [updated] = await db
    .update(apiKeys)
    .set({ isActive: false })
    .where(eq(apiKeys.id, id))
    .returning({ id: apiKeys.id, isActive: apiKeys.isActive });

  return updated ?? null;
};
