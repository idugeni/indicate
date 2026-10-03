import 'server-only';

import { gunzipSync, gzipSync } from 'node:zlib';

import { Redis } from '@upstash/redis';

/**
 * Second-layer runtime snapshot cache in shared Redis (not per-instance).
 * Keys include the revision so stale reads are impossible by construction;
 * keys expire on their own. Every failure (network, parse, shape)
 * returns null and the caller falls back to a full Postgres read —
 * never adopting a partial value.
 *
 * @remarks Snapshot blobs (`read`/`write`, ~3.65 MB of JSON for the live
 * fleet) are gzip+base64 encoded behind a `gzip:` prefix: Upstash bills
 * REST bandwidth on every transfer, and an uncompressed blob re-downloaded
 * per instance per window is what exhausted the monthly quota. Small
 * cache-aside keys (`readKey`/`writeKey`, hostname contexts) stay plain
 * JSON. Reads accept both encodings so a rollout never orphans the
 * previous revision's key.
 */
const GZIP_PREFIX = 'gzip:';

/**
 * Byte size above which a cache-aside value is gzip compressed.
 *
 * @remarks Small keys (hostname contexts, job states) stay plain JSON so a
 * cache miss costs one tiny transfer. Whole-tenant dashboard snapshots are
 * megabytes of the same repetitive settings JSON as the runtime snapshot, and
 * at a 180-second TTL they re-transfer every few minutes per editor — the
 * second-largest Upstash bandwidth line after the runtime snapshot.
 */
const COMPRESSION_THRESHOLD_BYTES = 4_096;

function encodeSnapshot(model: unknown): string {
  return `${GZIP_PREFIX}${gzipSync(Buffer.from(JSON.stringify(model), 'utf8')).toString('base64')}`;
}

function decodeSnapshot(raw: unknown): unknown | null {
  if (typeof raw === 'string') {
    if (!raw.startsWith(GZIP_PREFIX)) {
      try {
        return JSON.parse(raw) as unknown;
      } catch {
        return null;
      }
    }
    try {
      return JSON.parse(gunzipSync(Buffer.from(raw.slice(GZIP_PREFIX.length), 'base64')).toString('utf8')) as unknown;
    } catch {
      return null;
    }
  }
  if (raw !== null && typeof raw === 'object') return raw;
  return null;
}

function maybeCompress(json: string): string {
  if (Buffer.byteLength(json, 'utf8') <= COMPRESSION_THRESHOLD_BYTES) return json;
  return `${GZIP_PREFIX}${gzipSync(Buffer.from(json, 'utf8')).toString('base64')}`;
}
export class UpstashSnapshotStore {
  private readonly redis: Redis;
  private readonly namespace: string;

  constructor(config: { readonly url: string; readonly token: string; readonly namespace: string }) {
    this.redis = new Redis({ url: config.url, token: config.token });
    this.namespace = config.namespace;
  }

  async read(environment: string, revision: number): Promise<unknown | null> {
    try {
      return decodeSnapshot(await this.redis.get(`${this.namespace}:snapshot:${environment}:v${revision}`));
    } catch {
      return null;
    }
  }

  async write(environment: string, revision: number, model: unknown, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.set(`${this.namespace}:snapshot:${environment}:v${revision}`, encodeSnapshot(model), { ex: ttlSeconds });
    } catch {
      /* best-effort: write failure does not fail the refresh */
    }
  }

  async touch(environment: string, revision: number, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.expire(`${this.namespace}:snapshot:${environment}:v${revision}`, ttlSeconds);
    } catch {
      /* best-effort: an unextended key simply expires on schedule */
    }
  }

  /**
   * Read an arbitrary namespaced key for cache-aside projections.
   *
   * @param key - Key suffix appended to the store namespace.
   * @returns Parsed payload, a raw object, or null on miss or failure.
   * @remarks Accepts plain JSON and `gzip:` values so small keys and
   * threshold-compressed snapshots share one read path.
   */
  async readKey(key: string): Promise<unknown | null> {
    try {
      return decodeSnapshot(await this.redis.get(`${this.namespace}:${key}`));
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
      return (await this.redis.mget(...keys.map((key) => `${this.namespace}:${key}`))).map((raw) => decodeSnapshot(raw));
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
   * @remarks Values above `COMPRESSION_THRESHOLD_BYTES` are stored gzip
   * compressed; anything smaller stays plain JSON.
   */
  async writeKey(key: string, model: unknown, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.set(`${this.namespace}:${key}`, maybeCompress(JSON.stringify(model)), { ex: ttlSeconds });
    } catch {
      /* best-effort: write failure does not fail the refresh */
    }
  }

  /**
   * Delete a namespaced key after invalidation.
   *
   * @param key - Key suffix appended to the store namespace.
   */
  async deleteKey(key: string): Promise<void> {
    try {
      await this.redis.del(`${this.namespace}:${key}`);
    } catch {
      /* best-effort: delete failure does not fail the mutation */
    }
  }
}
