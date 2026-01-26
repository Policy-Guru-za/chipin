import type { NextRequest } from 'next/server';
import type { ZodType } from 'zod';

import type { ApiKeyScope } from '@/lib/api/auth';
import type { ApiAuthContext } from '@/lib/api/handler';
import { enforceApiAuth } from '@/lib/api/handler';
import { decodeCursor, type PaginationCursor } from '@/lib/api/pagination';
import { jsonError } from '@/lib/api/response';
import { isValidPublicId, isValidUuid } from '@/lib/api/validation';
import { markApiKeyUsed } from '@/lib/db/queries';

type ValidationParams = {
  requestId: string;
  headers: Headers;
  message: string;
};

type ValidationResult = { ok: true } | { ok: false; response: Response };

export type ParseResult<T> = { ok: true; data: T } | { ok: false; response: Response };

export type CursorResult =
  | { ok: true; cursor: PaginationCursor | null }
  | { ok: false; response: Response };

export const parseQuery = <T>(
  request: NextRequest,
  schema: ZodType<T>,
  params: ValidationParams
): ParseResult<T> => {
  const parsed = schema.safeParse(Object.fromEntries(new URL(request.url).searchParams.entries()));
  if (!parsed.success) {
    return {
      ok: false,
      response: jsonError({
        error: {
          code: 'validation_error',
          message: params.message,
          details: parsed.error.flatten(),
        },
        status: 400,
        requestId: params.requestId,
        headers: params.headers,
      }),
    };
  }

  return { ok: true, data: parsed.data };
};

export const parseBody = async <T>(
  request: NextRequest,
  schema: ZodType<T>,
  params: ValidationParams
): Promise<ParseResult<T>> => {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      response: jsonError({
        error: {
          code: 'validation_error',
          message: params.message,
          details: parsed.error.flatten(),
        },
        status: 400,
        requestId: params.requestId,
        headers: params.headers,
      }),
    };
  }

  return { ok: true, data: parsed.data };
};

export const parseCursor = (
  value: string | undefined,
  params: Omit<ValidationParams, 'message'> & { message?: string }
): CursorResult => {
  const cursor = decodeCursor(value);
  if (value && !cursor) {
    return {
      ok: false,
      response: jsonError({
        error: {
          code: 'validation_error',
          message: params.message ?? 'Invalid pagination cursor',
        },
        status: 400,
        requestId: params.requestId,
        headers: params.headers,
      }),
    };
  }

  return { ok: true, cursor };
};

export const validatePublicId = (value: string, params: ValidationParams): ValidationResult => {
  if (!isValidPublicId(value)) {
    return {
      ok: false,
      response: jsonError({
        error: { code: 'validation_error', message: params.message },
        status: 400,
        requestId: params.requestId,
        headers: params.headers,
      }),
    };
  }

  return { ok: true };
};

export const validateUuid = (value: string, params: ValidationParams): ValidationResult => {
  if (!isValidUuid(value)) {
    return {
      ok: false,
      response: jsonError({
        error: { code: 'validation_error', message: params.message },
        status: 400,
        requestId: params.requestId,
        headers: params.headers,
      }),
    };
  }

  return { ok: true };
};

export const withApiAuth =
  <Params extends Record<string, string> | undefined>(
    requiredScope: ApiKeyScope,
    handler: (request: NextRequest, context: ApiAuthContext, params: Params) => Promise<Response>
  ) =>
  async (request: NextRequest, ctx?: { params: Params }) => {
    const auth = await enforceApiAuth(request, requiredScope);
    if (!auth.ok) return auth.response;

    const response = await handler(request, auth.context, ctx?.params as Params);

    if (response.ok) {
      await markApiKeyUsed(auth.context.apiKey.id);
    }

    return response;
  };
