'use client';

import { useEffect, useState } from 'react';

/** Animation length for one count-up run. */
const COUNT_UP_DURATION_MS = 700;

function easeOutCubic(progress: number): number {
  return 1 - Math.pow(1 - progress, 3);
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Animates a status metric from zero to its final value on mount.
 *
 * @param props.value - Final numeric value.
 * @param props.decimals - Fraction digits, default 0.
 * @param props.suffix - Unit appended after the number.
 * @returns Tabular number that settles on the final value.
 */
export function CountUp({ value, decimals = 0, suffix = '' }: { readonly value: number; readonly decimals?: number; readonly suffix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (prefersReducedMotion()) {
      const frame = requestAnimationFrame(() => setDisplay(value));
      return () => cancelAnimationFrame(frame);
    }
    let frame = 0;
    const started = performance.now();
    const tick = (now: number): void => {
      const progress = Math.min(1, (now - started) / COUNT_UP_DURATION_MS);
      setDisplay(value * easeOutCubic(progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return (
    <span className="tabular-nums">
      {display.toFixed(decimals)}
      {suffix}
    </span>
  );
}
