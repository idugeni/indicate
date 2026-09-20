// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import type { MouseEvent, TouchEvent } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  TICKER_INTERVAL_MS,
  tickerPauseLabel,
  useTickerRotation,
} from '@/modules/site/components/network/ui/ticker-rotation';

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    value: () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
    configurable: true,
    writable: true,
  });
});

describe('tickerPauseLabel', () => {
  it('melabeli setiap alasan jeda', () => {
    expect(tickerPauseLabel(null)).toBe('berputar');
    expect(tickerPauseLabel('single')).toBe('satu headline');
    expect(tickerPauseLabel('hover')).toBe('jeda saat disentuh');
    expect(tickerPauseLabel('focus')).toBe('jeda saat fokus');
    expect(tickerPauseLabel('motion')).toBe('gerakan dikurangi');
    expect(tickerPauseLabel('hidden')).toBe('tab tersembunyi');
  });
});

describe('useTickerRotation', () => {
  it('berputar tiap interval dan berhenti saat satu headline', () => {
    vi.useFakeTimers();
    try {
      const { result, rerender } = renderHook(({ count }) => useTickerRotation(count), {
        initialProps: { count: 3 },
      });
      expect(result.current.running).toBe(true);
      act(() => {
        vi.advanceTimersByTime(TICKER_INTERVAL_MS);
      });
      expect(result.current.index).toBe(1);
      rerender({ count: 1 });
      expect(result.current.running).toBe(false);
      expect(result.current.reason).toBe('single');
    } finally {
      vi.useRealTimers();
    }
  });

  it('melompat manual dan menggeser sentuh', () => {
    const { result } = renderHook(() => useTickerRotation(3));
    act(() => {
      result.current.go(2);
    });
    expect(result.current.index).toBe(2);
    act(() => {
      result.current.interactionProps.onTouchStart({
        touches: [{ clientX: 100 }],
      } as unknown as TouchEvent);
    });
    act(() => {
      result.current.interactionProps.onTouchEnd({
        changedTouches: [{ clientX: 40 }],
      } as unknown as TouchEvent);
    });
    expect(result.current.index).toBe(0);
  });

  it('melepas fokus setelah klik mouse agar putaran lanjut', () => {
    const { result } = renderHook(() => useTickerRotation(3));
    const tombol = document.createElement('button');
    document.body.appendChild(tombol);
    tombol.focus();
    act(() => {
      result.current.navigate(
        { detail: 1, currentTarget: tombol } as unknown as MouseEvent<HTMLButtonElement>,
        1,
      );
    });
    expect(result.current.index).toBe(1);
    expect(document.activeElement).not.toBe(tombol);
    tombol.remove();
  });

  it('menahan fokus setelah aktivasi keyboard', () => {
    const { result } = renderHook(() => useTickerRotation(3));
    const tombol = document.createElement('button');
    document.body.appendChild(tombol);
    tombol.focus();
    act(() => {
      result.current.navigate(
        { detail: 0, currentTarget: tombol } as unknown as MouseEvent<HTMLButtonElement>,
        1,
      );
    });
    expect(result.current.index).toBe(1);
    expect(document.activeElement).toBe(tombol);
    tombol.remove();
  });
});
