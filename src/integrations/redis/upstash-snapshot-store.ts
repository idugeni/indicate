import 'server-only';

import { gunzipSync, gzipSync } from 'node:zlib';

import { Redis } from '@upstash/redis';

import { logEvent } from '@/core/observability/logger';
import { recordOperation } from '@/core/observability/operation-metrics';

/**
 * Wire-byte threshold above which a snapshot write emits a bandwidth warning.
 *
 * @remarks Warn-only, never a hard block: the live fleet wire size sits near
 * ~73 KiB (3.65 MB raw at ~50x gzip), so 512 KiB leaves ~7x headroom before a
 * revision starts approaching the quota-exhaustion regime documented above.
 * Crossing it means tenant/config growth is re-inflating the blob and the
 * snapshot shape needs attention, not that the write should fail.
 */
export const SNAPSHOT_WIRE_WARN_BYTES = 512 * 1024;

/** Measure the Upstash REST wire size of an encoded snapshot value. */
export function snapshotWireSizeOf(encoded: string): number {
  return Buffer.byteLength(encoded, 'utf8');
}

function warnOversize(kind: 'snapshot' | 'cache-aside', key: string, wireBytes: number): void {
  try {
    logEvent('warn', {
      event: 'redis.snapshot.oversize',
      context: { kind, key, wireBytes, thresholdBytes: SNAPSHOT_WIRE_WARN_BYTES },
    });
  } catch {
    /* telemetry must never fail the write */
  }
}

/** Wire bytes of a Redis payload without logging its content. */
function wireBytesOf(raw: unknown): number {
  if (typeof raw === 'string') return Buffer.byteLength(raw, 'utf8');
  if (raw !== null && typeof raw === 'object') {
    try {
      return Buffer.byteLength(JSON.stringify(raw), 'utf8');
    } catch {
      return 0;
    }
  }
  return 0;
}

/** Record one Redis call into the operation rollup; never throws. */
function recordRedisCall(operation: string, started: number, commands: number, bytes: number, hit: boolean): void {
  const durationMs = Date.now() - started;
  recordOperation({
    route: 'cache',
    operation,
    provider: 'upstash-redis',
    durationMs,
    redisCommands: commands,
    redisMs: durationMs,
    payloadBytes: bytes,
    ...(hit ? { cacheHit: 1 } : { cacheMiss: 1 }),
  });
}

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
      const started = Date.now();
      const raw = await this.redis.get(`${this.namespace}:snapshot:${environment}:v${revision}`);
      const value = decodeSnapshot(raw);
      recordRedisCall('redis.get', started, 1, wireBytesOf(raw), value !== null);
      return value;
    } catch {
      return null;
    }
  }

  async write(environment: string, revision: number, model: unknown, ttlSeconds: number): Promise<void> {
    try {
      const encoded = encodeSnapshot(model);
      const started = Date.now();
      const key = `snapshot:${environment}:v${revision}`;
      if (snapshotWireSizeOf(encoded) > SNAPSHOT_WIRE_WARN_BYTES) warnOversize('snapshot', key, snapshotWireSizeOf(encoded));
      await this.redis.set(`${this.namespace}:${key}`, encoded, { ex: ttlSeconds });
      recordRedisCall('redis.set', started, 1, snapshotWireSizeOf(encoded), true);
    } catch {
      /* best-effort: write failure does not fail the refresh */
    }
  }

  async touch(environment: string, revision: number, ttlSeconds: number): Promise<void> {
    try {
      const started = Date.now();
      await this.redis.expire(`${this.namespace}:snapshot:${environment}:v${revision}`, ttlSeconds);
      recordRedisCall('redis.expire', started, 1, 0, true);
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
      const started = Date.now();
      const raw = await this.redis.get(`${this.namespace}:${key}`);
      const value = decodeSnapshot(raw);
      recordRedisCall('redis.get', started, 1, wireBytesOf(raw), value !== null);
      return value;
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
      const started = Date.now();
      const raws = await this.redis.mget(...keys.map((key) => `${this.namespace}:${key}`));
      const values = raws.map((raw) => decodeSnapshot(raw));
      recordRedisCall('redis.mget', started, 1, raws.reduce<number>((total, raw) => total + wireBytesOf(raw), 0), values.some((value) => value !== null));
      return values;
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
      const encoded = maybeCompress(JSON.stringify(model));
      const started = Date.now();
      if (snapshotWireSizeOf(encoded) > SNAPSHOT_WIRE_WARN_BYTES) warnOversize('cache-aside', key, snapshotWireSizeOf(encoded));
      await this.redis.set(`${this.namespace}:${key}`, encoded, { ex: ttlSeconds });
      recordRedisCall('redis.set', started, 1, snapshotWireSizeOf(encoded), true);
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
