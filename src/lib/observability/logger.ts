type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogPayload {
  level: LogLevel;
  message: string;
  timestamp: string;
  requestId?: string;
  data?: Record<string, unknown>;
}

export const getRequestId = (headers?: Headers | null): string | undefined =>
  headers?.get?.('x-request-id') ?? undefined;

export const log = (
  level: LogLevel,
  message: string,
  data?: Record<string, unknown>,
  requestId?: string
) => {
  const payload: LogPayload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    requestId,
    data,
  };

  const output = JSON.stringify(payload);

  if (level === 'error') {
    console.error(output);
  } else if (level === 'warn') {
    console.warn(output);
  } else {
    console.log(output);
  }
};

export const logInfo = (
  message: string,
  data?: Record<string, unknown>,
  requestId?: string
) => log('info', message, data, requestId);
