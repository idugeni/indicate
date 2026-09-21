import 'server-only';

import { Redis } from '@upstash/redis';

/**
 * Read raw pageview counters in one round-trip.
 *
 * @param input - Upstash credentials plus the exact `pv:*` keys to read.
 * @returns Counts aligned with the input keys; miss, non-numeric, or failure yields 0 per key.
 * @remarks Keys are raw (no store namespace): the pageview buffer lives outside snapshot namespaces. Callers build keys with `buildPageviewKey`. Fail-open by design — dashboard and public reads must never break on a counter miss.
 */
export async function readPageviewCounts(input: {
  readonly url: string;
  readonly token: string;
  readonly keys: readonly string[];
}): Promise<readonly number[]> {
  if (input.keys.length === 0) return [];
  try {
    const redis = new Redis({ url: input.url, token: input.token });
    const raws = await redis.mget(...input.keys);
    return raws.map((raw) => {
      const value = typeof raw === 'number' ? raw : Number(raw);
      return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
    });
  } catch {
    return input.keys.map(() => 0);
  }
}
