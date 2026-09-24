import 'server-only';

/** Redis key namespace; bumping the cache version repartitions every key. */
export function deriveRedisNamespace(environment: string, cacheVersion: number): string {
  return `indicate:${environment}:v${cacheVersion}`;
}
