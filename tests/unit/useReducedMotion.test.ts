/**
 * @vitest-environment jsdom
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { useReducedMotion } from '@/hooks/useReducedMotion';

describe('useReducedMotion hook', () => {
  let addEventListenerMock: ReturnType<typeof vi.fn>;
  let removeEventListenerMock: ReturnType<typeof vi.fn>;
  let changeListener: (() => void) | null = null;
  let currentMatches = false;

  function createMatchMediaMock(matches: boolean) {
    currentMatches = matches;
    addEventListenerMock = vi.fn().mockImplementation((event: string, callback: () => void) => {
      if (event === 'change') {
        changeListener = callback;
      }
    });
    removeEventListenerMock = vi.fn().mockImplementation(() => {
      changeListener = null;
    });

    return vi.fn().mockImplementation(() => ({
      get matches() {
        return currentMatches;
      },
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: addEventListenerMock,
      removeEventListener: removeEventListenerMock,
    }));
  }

  beforeEach(() => {
    changeListener = null;
    currentMatches = false;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    changeListener = null;
    currentMatches = false;
  });

  it('should return true when prefers-reduced-motion is reduce', () => {
    vi.stubGlobal('matchMedia', createMatchMediaMock(true));

    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);
  });

  it('should return false when prefers-reduced-motion is not reduce', () => {
    vi.stubGlobal('matchMedia', createMatchMediaMock(false));

    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });

  it('should subscribe to media query changes on mount', () => {
    vi.stubGlobal('matchMedia', createMatchMediaMock(false));

    renderHook(() => useReducedMotion());
    expect(addEventListenerMock).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('should unsubscribe from media query changes on unmount', () => {
    vi.stubGlobal('matchMedia', createMatchMediaMock(false));

    const { unmount } = renderHook(() => useReducedMotion());
    unmount();

    expect(removeEventListenerMock).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('should update when media query changes', () => {
    vi.stubGlobal('matchMedia', createMatchMediaMock(false));

    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);

    // Simulate media query change
    act(() => {
      currentMatches = true;
      if (changeListener) {
        changeListener();
      }
    });

    expect(result.current).toBe(true);
  });
});
