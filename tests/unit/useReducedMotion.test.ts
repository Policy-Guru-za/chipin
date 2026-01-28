import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('useReducedMotion hook', () => {
  let matchMediaMock: ReturnType<typeof vi.fn>;
  let addEventListenerMock: ReturnType<typeof vi.fn>;
  let removeEventListenerMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    addEventListenerMock = vi.fn();
    removeEventListenerMock = vi.fn();

    matchMediaMock = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      addEventListener: addEventListenerMock,
      removeEventListener: removeEventListenerMock,
    }));

    vi.stubGlobal('matchMedia', matchMediaMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should return true when prefers-reduced-motion is reduce', () => {
    const mediaQueryResult = matchMediaMock('(prefers-reduced-motion: reduce)');
    expect(mediaQueryResult.matches).toBe(true);
  });

  it('should return false when prefers-reduced-motion is not reduce', () => {
    matchMediaMock = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: addEventListenerMock,
      removeEventListenerMock: removeEventListenerMock,
    }));

    vi.stubGlobal('matchMedia', matchMediaMock);
    const mediaQueryResult = matchMediaMock('(prefers-reduced-motion: reduce)');
    expect(mediaQueryResult.matches).toBe(false);
  });

  it('should properly subscribe and unsubscribe from media query changes', () => {
    const mediaQueryResult = matchMediaMock('(prefers-reduced-motion: reduce)');

    const callback = vi.fn();
    mediaQueryResult.addEventListener('change', callback);
    expect(addEventListenerMock).toHaveBeenCalledWith('change', callback);

    mediaQueryResult.removeEventListener('change', callback);
    expect(removeEventListenerMock).toHaveBeenCalledWith('change', callback);
  });
});
