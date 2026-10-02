interface CacheEntry {
  readonly value: unknown;
  readonly expiresAt: number;
}

const responses = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();

/**
 * Dedupe and briefly cache a JSON GET request.
 *
 * Concurrent calls with the same key share one in-flight fetch, and the
 * parsed body is reused until `ttlMs` elapses. Request semantics match
 * * API responses are shared through this client cache, so callers do not need
 * to force `cache: 'no-store'` at every call site.
 *
 * @param key - Cache/dedupe key for the endpoint.
 * @param url - Request URL.
 * @param init - Fetch init plus an optional `ttlMs` (default 5000).
 * @returns Parsed JSON body.
 * @throws {Error} With a `status` property when the response is not ok.
 */
export async function cachedJsonGet<T>(
  key: string,
  url: string,
  init?: RequestInit & { ttlMs?: number },
): Promise<T> {
  const { ttlMs = 5000, ...rest } = init ?? {};
  const hit = responses.get(key);
  if (hit !== undefined && hit.expiresAt > Date.now()) return hit.value as T;
  const pending = inflight.get(key);
  if (pending !== undefined) return pending as Promise<T>;
  const request = (async () => {
    try {
      const response = await fetch(url, rest);
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}`) as Error & { status: number };
        error.status = response.status;
        throw error;
      }
      const body = (await response.json()) as unknown;
      responses.set(key, { value: body, expiresAt: Date.now() + ttlMs });
      return body;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, request);
  return request as Promise<T>;
}

/**
 * Drop a cached response so the next read refetches.
 *
 * @param key - Cache key to remove.
 */
export function invalidateEndpoint(key: string): void {
  responses.delete(key);
}

/**
 * Drop every cached response and pending dedupe entry.
 *
 * @remarks Intended for test isolation between renders.
 */
export function clearEndpointCache(): void {
  responses.clear();
  inflight.clear();
}
