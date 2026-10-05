import 'server-only';

/**
 * Environment isolation for global `ai:*` Redis keys.
 *
 * @remarks Historically the AI counters (`ai:limit:*`, `ai:quota:*`,
 * `ai:breaker:*`, `ai:chain:cursor`, `ai:vercel-gateway:*`) lived as raw
 * global keys, so staging and production sharing one Upstash resource also
 * shared budgets, breakers, and chain rotation. Namespaced keys take the
 * form `{namespace}:ai:…` where namespace is the derived Redis namespace
 * (`indicate:{env}:v{cacheVersion}`), matching the delivery/queue/ratelimit
 * family. A null/empty namespace keeps the legacy global shape (tests,
 * unconfigured environments).
 *
 * Compatibility: reads fall back to the legacy global key on a namespaced
 * miss, so rolling deploys never lose quota/budget continuity; writes always
 * go to the namespaced key, so legacy keys drain through their own TTLs.
 * The 60-second RPM/TPM windows and the 120-second breaker window restart
 * instead of falling back (one extra read per AI call is not worth a
 * sub-minute counter), while the 48-hour org quotas, the monthly gateway
 * pool, and the panel health read keep the fallback. The TTL-less
 * `ai:chain:cursor` legacy key is left orphaned to expire never — a single
 * orphaned integer, documented here instead of migrated. No production
 * migration, no FLUSH, no DEL of live keys.
 */

/** Prefix one `ai:*` key with the derived namespace; null/empty keeps the legacy global key. */
export function aiScopedKey(namespace: string | null | undefined, key: string): string {
  if (namespace === null || namespace === undefined || namespace === '') return key;
  return `${namespace}:${key}`;
}

/**
 * Read a namespaced key with legacy-global fallback.
 *
 * @param get - Raw store read resolving to the stored value or null/undefined on miss.
 * @param namespace - Derived namespace; null/empty reads the legacy key directly.
 * @param key - Legacy `ai:*` key template.
 * @returns Namespaced hit, legacy hit, or the miss value when neither exists.
 */
export async function aiScopedGet(
  get: (key: string) => Promise<unknown>,
  namespace: string | null | undefined,
  key: string,
): Promise<unknown> {
  const scoped = aiScopedKey(namespace, key);
  const hit = await get(scoped);
  if (hit !== null && hit !== undefined) return hit;
  if (scoped !== key) return get(key);
  return hit;
}
