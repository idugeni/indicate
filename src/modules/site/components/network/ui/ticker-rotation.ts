'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';

/**
 * Jeda rotasi headline tenant; satu sumber untuk 10 template.
 */
export const TICKER_INTERVAL_MS = 5000;

/**
 * Jumlah headline maksimum yang dirotasi ticker.
 */
export const TICKER_MAX_ITEMS = 5;

/**
 * Alasan ticker berhenti; `null` berarti berputar.
 */
export type TickerPauseReason = 'single' | 'hover' | 'focus' | 'motion' | 'hidden';

/**
 * Status putaran ticker untuk satu daftar headline.
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
 * Label Indonesia untuk alasan jeda ticker.
 *
 * @param reason - Alasan jeda atau `null` saat berputar.
 * @returns Label siap tampil ke pembaca layar.
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
 * Putaran headline cerdas: timer satu langkah, jeda hover/fokus/tab/gerakan, geser sentuh.
 *
 * @param count - Jumlah headline yang dirotasi.
 * @param intervalMs - Jeda antar headline; default `TICKER_INTERVAL_MS`.
 * @returns Indeks aman, status, navigasi, dan props interaksi root.
 */
export function useTickerRotation(count: number, intervalMs = TICKER_INTERVAL_MS): TickerRotation {
  const [index, setIndex] = useState(0);
  const [cycle, setCycle] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [touchX, setTouchX] = useState<number | null>(null);
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
      onMouseEnter: () => setHovered(true),
      onMouseLeave: () => setHovered(false),
      onFocus: () => setFocused(true),
      onBlur: () => setFocused(false),
      onTouchStart: (event) => {
        const touch = event.touches[0];
        if (touch !== undefined) setTouchX(touch.clientX);
      },
      onTouchEnd: (event) => {
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
