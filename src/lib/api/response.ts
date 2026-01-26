import { NextResponse } from 'next/server';

export type ApiErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'validation_error'
  | 'conflict'
  | 'rate_limited'
  | 'internal_error';

type ApiMeta = {
  request_id: string;
  timestamp: string;
};

type ApiError = {
  code: ApiErrorCode;
  message: string;
  details?: Record<string, unknown>;
};

/** Build response metadata for API payloads. */
export const buildApiMeta = (requestId: string): ApiMeta => ({
  request_id: requestId,
  timestamp: new Date().toISOString(),
});

/** Wrap a success response with meta and optional headers. */
export const jsonSuccess = <T>(params: {
  data: T;
  requestId: string;
  status?: number;
  headers?: HeadersInit;
}) =>
  NextResponse.json(
    {
      data: params.data,
      meta: buildApiMeta(params.requestId),
    },
    { status: params.status ?? 200, headers: params.headers }
  );

/** Wrap an error response with meta and optional headers. */
export const jsonError = (params: {
  error: ApiError;
  requestId: string;
  status: number;
  headers?: HeadersInit;
}) =>
  NextResponse.json(
    {
      error: params.error,
      meta: buildApiMeta(params.requestId),
    },
    { status: params.status, headers: params.headers }
  );

/** Wrap a paginated success response with meta and pagination data. */
export const jsonPaginated = <T>(params: {
  data: T[];
  pagination: {
    has_more: boolean;
    next_cursor: string | null;
    total_count?: number;
  };
  requestId: string;
  status?: number;
  headers?: HeadersInit;
}) =>
  NextResponse.json(
    {
      data: params.data,
      pagination: params.pagination,
      meta: buildApiMeta(params.requestId),
    },
    { status: params.status ?? 200, headers: params.headers }
  );
