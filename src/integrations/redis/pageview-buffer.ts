import 'server-only';

import { Redis } from '@upstash/redis';

import { recordOperation } from '@/core/observability/operation-metrics';

/**
 * Read raw pageview counters in one round-trip.
 *
 * @param input - Upstash credentials plus the exact `pv:*` keys to read.
 * @returns Counts aligned with the input keys; miss, non-numeric, or failure yields 0 per key.
 * @remarks Keys are raw (no store namespace): the pageview buffer lives outside snapshot namespaces. Callers build keys with `buildPageviewKey`. Fail-open by design — dashboard and public reads must never break on a counter miss.
 * Hit semantics: a key counts as a hit when Redis returns a value for it
 * (including zero); null/undefined counts as a miss. A Redis failure records
 * misses plus a 500 status — never a hit.
 */
export async function readPageviewCounts(input: {
  readonly url: string;
  readonly token: string;
  readonly keys: readonly string[];
}): Promise<readonly number[]> {
  if (input.keys.length === 0) return [];
  const started = Date.now();
  try {
    const redis = new Redis({ url: input.url, token: input.token });
    const raws = await redis.mget(...input.keys);
    const durationMs = Date.now() - started;
    const hits = raws.filter((raw) => raw !== null && raw !== undefined).length;
    recordOperation({ route: 'cache', operation: 'redis.mget', provider: 'upstash-redis', durationMs, redisCommands: 1, redisMs: durationMs, payloadBytes: raws.reduce<number>((total, raw) => total + (typeof raw === 'string' ? Buffer.byteLength(raw, 'utf8') : 8), 0), bytesKind: 'wire', ...(hits > 0 ? { cacheHit: hits } : {}), ...(raws.length - hits > 0 ? { cacheMiss: raws.length - hits } : {}) });
    return raws.map((raw) => {
      const value = typeof raw === 'number' ? raw : Number(raw);
      return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
    });
  } catch {
    recordOperation({ route: 'cache', operation: 'redis.mget', provider: 'upstash-redis', durationMs: Date.now() - started, redisCommands: 1, cacheMiss: input.keys.length, status: 500 });
    return input.keys.map(() => 0);
  }
}
