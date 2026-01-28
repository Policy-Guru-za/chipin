import { NextResponse } from 'next/server';

type InternalErrorPayload = {
  error: string;
  message?: string;
  details?: Record<string, unknown>;
  retryAfterSeconds?: number;
};

export const jsonInternalError = (params: {
  code: string;
  status: number;
  message?: string;
  details?: Record<string, unknown>;
  retryAfterSeconds?: number;
  headers?: HeadersInit;
}) => {
  const payload: InternalErrorPayload = { error: params.code };

  if (params.message) {
    payload.message = params.message;
  }

  if (params.details) {
    payload.details = params.details;
  }

  if (typeof params.retryAfterSeconds === 'number') {
    payload.retryAfterSeconds = params.retryAfterSeconds;
  }

  return NextResponse.json(payload, { status: params.status, headers: params.headers });
};
