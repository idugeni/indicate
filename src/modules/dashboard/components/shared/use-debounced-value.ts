import { useEffect, useState } from 'react';

/**
 * Delay a fast-changing value until it stays still.
 *
 * @param value - Live value, usually a suggestion query.
 * @param delayMs - Quiet period before publishing; defaults to 120ms.
 * @returns Latest settled value.
 */
export function useDebouncedValue<T>(value: T, delayMs = 120): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return settled;
}
