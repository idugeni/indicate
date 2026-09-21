'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

/**
 * Tenant headline rotation interval; single source for all 10 templates.
 */
export const TICKER_INTERVAL_MS = 5000;

/**
 * Maximum number of headlines rotated by the ticker.
 */
export const TICKER_MAX_ITEMS = 5;

/**
 * Reason the ticker is paused; `null` means spinning.
 */
export type TickerPauseReason = 'single' | 'hover' | 'focus' | 'motion' | 'hidden';

/**
 * Ticker rotation state for one headline list.
 */
export interface TickerRotation {
  readonly index: number;
  readonly cycle: number;
  readonly running: boolean;
  readonly reason: TickerPauseReason | null;
  readonly reduceMotion: boolean;
  readonly go: (next: number) => void;
  readonly navigate: (event: React.MouseEvent<HTMLButtonElement>, next: number) => void;
  readonly interactionProps: {
    readonly onMouseEnter: () => void;
    readonly onMouseLeave: () => void;
    readonly onFocus: () => void;
    readonly onBlur: () => void;
    readonly onTouchStart: (event: React.TouchEvent) => void;
    readonly onTouchEnd: (event: React.TouchEvent) => void;
  };
}

function subscribeReduceMotion(onChange: () => void): () => void {
  const query = window.matchMedia('(prefers-reduced-motion: reduce)');
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function subscribeTabHidden(onChange: () => void): () => void {
  document.addEventListener('visibilitychange', onChange);
  return () => document.removeEventListener('visibilitychange', onChange);
}

/**
 * Indonesian-language label for a ticker pause reason.
 *
 * @param reason - Pause reason, or `null` while spinning.
 * @returns Display-ready label for screen readers.
 */
export function tickerPauseLabel(reason: TickerPauseReason | null): string {
  switch (reason) {
    case 'single':
      return 'satu headline';
    case 'hover':
      return 'jeda saat disentuh';
    case 'focus':
      return 'jeda saat fokus';
    case 'motion':
      return 'gerakan dikurangi';
    case 'hidden':
      return 'tab tersembunyi';
    default:
      return 'berputar';
  }
}

const SWIPE_PX = 40;

/**
 * Grace period ignoring emulated touch-hover after `touchend` (iOS fires
 * `mouseenter` after a tap; without this the ticker sticks paused on touch).
 */
const TOUCH_HOVER_GRACE_MS = 700;

/**
 * Smart headline rotation: single-step timer, hover/focus/tab/motion pauses, touch swipe.
 *
 * @param count - Number of headlines being rotated.
 * @param intervalMs - Delay between headlines; defaults to `TICKER_INTERVAL_MS`.
 * @returns Safe index, status, navigation, and root interaction props.
 */
export function useTickerRotation(count: number, intervalMs = TICKER_INTERVAL_MS): TickerRotation {
  const [index, setIndex] = useState(0);
  const [cycle, setCycle] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [touchX, setTouchX] = useState<number | null>(null);
  const touchEndAt = useRef(0);
  const reduceMotion = useSyncExternalStore(
    subscribeReduceMotion,
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false,
  );
  const tabHidden = useSyncExternalStore(subscribeTabHidden, () => document.hidden, () => false);

  const reason: TickerPauseReason | null =
    count < 2
      ? 'single'
      : hovered
        ? 'hover'
        : focused
          ? 'focus'
          : reduceMotion
            ? 'motion'
            : tabHidden
              ? 'hidden'
              : null;
  const running = reason === null;

  useEffect(() => {
    if (!running || count < 2) return;
    const id = window.setTimeout(() => {
      setIndex((current) => (current + 1) % count);
      setCycle((current) => current + 1);
    }, intervalMs);
    return () => window.clearTimeout(id);
  }, [running, cycle, count, intervalMs]);

  const go = (next: number) => {
    if (count === 0) return;
    setIndex(((next % count) + count) % count);
    setCycle((current) => current + 1);
  };

  const navigate = (event: React.MouseEvent<HTMLButtonElement>, next: number) => {
    go(next);
    if (event.detail > 0) event.currentTarget.blur();
  };

  return {
    index: count === 0 ? 0 : index % count,
    cycle,
    running,
    reason,
    reduceMotion,
    go,
    navigate,
    interactionProps: {
      onMouseEnter: () => {
        if (Date.now() - touchEndAt.current < TOUCH_HOVER_GRACE_MS) return;
        setHovered(true);
      },
      onMouseLeave: () => setHovered(false),
      onFocus: () => setFocused(true),
      onBlur: () => setFocused(false),
      onTouchStart: (event) => {
        const touch = event.touches[0];
        if (touch !== undefined) setTouchX(touch.clientX);
      },
      onTouchEnd: (event) => {
        touchEndAt.current = Date.now();
        setHovered(false);
        const touch = event.changedTouches[0];
        if (touchX === null || touch === undefined) return;
        const delta = touch.clientX - touchX;
        setTouchX(null);
        if (delta <= -SWIPE_PX) go(index + 1);
        else if (delta >= SWIPE_PX) go(index - 1);
      },
    },
  };
}
