import { afterEach, describe, expect, it, vi } from 'vitest';

import { getRequestId, log } from '@/lib/observability/logger';

describe('logger', () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined);

  afterEach(() => {
    consoleError.mockClear();
    consoleWarn.mockClear();
    consoleLog.mockClear();
  });

  it('routes logs to the correct console method', () => {
    log('error', 'error-message');
    log('warn', 'warn-message');
    log('info', 'info-message');

    expect(consoleError).toHaveBeenCalled();
    expect(consoleWarn).toHaveBeenCalled();
    expect(consoleLog).toHaveBeenCalled();
  });

  it('extracts request IDs from headers', () => {
    const headers = new Headers({ 'x-request-id': 'req-123' });
    expect(getRequestId(headers)).toBe('req-123');
  });
});
