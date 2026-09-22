import 'server-only';

import { Redis } from '@upstash/redis';

/**
 * Second-layer runtime snapshot cache in shared Redis (not per-instance).
 * Keys include the revision so stale reads are impossible by construction;
 * keys expire on their own. Every failure (network, parse, shape)
 * returns null and the caller falls back to a full Postgres read —
 * never adopting a partial value.
 */
export class UpstashSnapshotStore {
  private readonly redis: Redis;
  private readonly namespace: string;

  constructor(config: { readonly url: string; readonly token: string; readonly namespace: string }) {
    this.redis = new Redis({ url: config.url, token: config.token });
    this.namespace = config.namespace;
  }

  async read(environment: string, revision: number): Promise<unknown | null> {
    try {
      return await this.readKey(`snapshot:${environment}:v${revision}`);
    } catch {
      return null;
    }
  }

  async write(environment: string, revision: number, model: unknown, ttlSeconds: number): Promise<void> {
    await this.writeKey(`snapshot:${environment}:v${revision}`, model, ttlSeconds);
  }

  /**
   * Read an arbitrary namespaced key for cache-aside projections.
   *
   * @param key - Key suffix appended to the store namespace.
   * @returns Parsed payload, a raw object, or null on miss or failure.
   */
  async readKey(key: string): Promise<unknown | null> {
    try {
      const raw = await this.redis.get(`${this.namespace}:${key}`);
      if (typeof raw === 'string') return JSON.parse(raw) as unknown;
      if (raw !== null && typeof raw === 'object') return raw;
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Read several namespaced keys in one round-trip.
   *
   * @param keys - Key suffixes appended to the store namespace.
   * @returns Parsed payloads in input order; miss or failure yields null per key.
   */
  async readMany(keys: readonly string[]): Promise<readonly (unknown | null)[]> {
    if (keys.length === 0) return [];
    try {
      const raws = await this.redis.mget(...keys.map((key) => `${this.namespace}:${key}`));
      return raws.map((raw) => {
        if (typeof raw === 'string') {
          try {
            return JSON.parse(raw) as unknown;
          } catch {
            return null;
          }
        }
        if (raw !== null && typeof raw === 'object') return raw;
        return null;
      });
    } catch {
      return keys.map(() => null);
    }
  }

  /**
   * Write an arbitrary namespaced key with a self-expiring TTL.
   *
   * @param key - Key suffix appended to the store namespace.
   * @param model - JSON-serializable payload to cache.
   * @param ttlSeconds - Expiry in seconds; failures stay best-effort.
   */
  async writeKey(key: string, model: unknown, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.set(`${this.namespace}:${key}`, JSON.stringify(model), { ex: ttlSeconds });
    } catch {
      /* best-effort: write failure does not fail the refresh */
    }
  }
}
