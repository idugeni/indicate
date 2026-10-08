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
function recordRedisCall(
  operation: string,
  started: number,
  commands: number,
  bytes: number,
  outcome: { readonly hits?: number | undefined; readonly misses?: number | undefined; readonly status?: number | undefined } = {},
): void {
  const durationMs = Date.now() - started;
  recordOperation({
    route: 'cache',
    operation,
    provider: 'upstash-redis',
    durationMs,
    redisCommands: commands,
    redisMs: durationMs,
    ...(bytes > 0 ? { payloadBytes: bytes, bytesKind: 'wire' as const } : {}),
    ...(outcome.hits === undefined || outcome.hits <= 0 ? {} : { cacheHit: outcome.hits }),
    ...(outcome.misses === undefined || outcome.misses <= 0 ? {} : { cacheMiss: outcome.misses }),
    ...(outcome.status === undefined ? {} : { status: outcome.status }),
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
    const started = Date.now();
    try {
      const raw = await this.redis.get(`${this.namespace}:snapshot:${environment}:v${revision}`);
      const value = decodeSnapshot(raw);
      recordRedisCall('redis.get', started, 1, wireBytesOf(raw), value !== null ? { hits: 1 } : { misses: 1 });
      return value;
    } catch {
      recordRedisCall('redis.get', started, 1, 0, { misses: 1, status: 500 });
      return null;
    }
  }

  async write(environment: string, revision: number, model: unknown, ttlSeconds: number): Promise<void> {
    const started = Date.now();
    try {
      const encoded = encodeSnapshot(model);
      const key = `snapshot:${environment}:v${revision}`;
      if (snapshotWireSizeOf(encoded) > SNAPSHOT_WIRE_WARN_BYTES) warnOversize('snapshot', key, snapshotWireSizeOf(encoded));
      await this.redis.set(`${this.namespace}:${key}`, encoded, { ex: ttlSeconds });
      recordRedisCall('redis.set', started, 1, snapshotWireSizeOf(encoded), { status: 200 });
    } catch {
      recordRedisCall('redis.set', started, 1, 0, { status: 500 });
      /* best-effort: write failure does not fail the refresh */
    }
  }

  async touch(environment: string, revision: number, ttlSeconds: number): Promise<void> {
    const started = Date.now();
    try {
      await this.redis.expire(`${this.namespace}:snapshot:${environment}:v${revision}`, ttlSeconds);
      recordRedisCall('redis.expire', started, 1, 0, { status: 200 });
    } catch {
      recordRedisCall('redis.expire', started, 1, 0, { status: 500 });
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
  async readRevision(organizationId: string): Promise<number> {
    const started = Date.now();
    try {
      const raw = await this.redis.get(`${this.namespace}:revision:${organizationId}`);
      const revision = typeof raw === 'number' ? raw : Number(raw);
      if (!Number.isInteger(revision) || revision < 0) {
        recordRedisCall('redis.get.revision', started, 1, wireBytesOf(raw), { misses: 1, status: 500 });
        return 0;
      }
      recordRedisCall('redis.get.revision', started, 1, wireBytesOf(raw), { hits: 1 });
      return revision;
    } catch {
      recordRedisCall('redis.get.revision', started, 1, 0, { misses: 1, status: 500 });
      return 0;
    }
  }

  async bumpRevision(organizationId: string): Promise<number> {
    const started = Date.now();
    try {
      const revision = await this.redis.incr(`${this.namespace}:revision:${organizationId}`);
      recordRedisCall('redis.incr.revision', started, 1, 0, { status: 200 });
      return revision;
    } catch {
      recordRedisCall('redis.incr.revision', started, 1, 0, { status: 500 });
      /* best-effort: the committed mutation must not fail on cache infrastructure */
      return 0;
    }
  }

  async readKey(key: string): Promise<unknown | null> {
    const started = Date.now();
    try {
      const raw = await this.redis.get(`${this.namespace}:${key}`);
      const value = decodeSnapshot(raw);
      recordRedisCall('redis.get', started, 1, wireBytesOf(raw), value !== null ? { hits: 1 } : { misses: 1 });
      return value;
    } catch {
      recordRedisCall('redis.get', started, 1, 0, { misses: 1, status: 500 });
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
    const started = Date.now();
    try {
      const raws = await this.redis.mget(...keys.map((key) => `${this.namespace}:${key}`));
      const values = raws.map((raw) => decodeSnapshot(raw));
      const hits = values.filter((value) => value !== null).length;
      recordRedisCall('redis.mget', started, 1, raws.reduce<number>((total, raw) => total + wireBytesOf(raw), 0), { hits, misses: values.length - hits });
      return values;
    } catch {
      recordRedisCall('redis.mget', started, 1, 0, { misses: keys.length, status: 500 });
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
    const started = Date.now();
    try {
      const encoded = maybeCompress(JSON.stringify(model));
      if (snapshotWireSizeOf(encoded) > SNAPSHOT_WIRE_WARN_BYTES) warnOversize('cache-aside', key, snapshotWireSizeOf(encoded));
      await this.redis.set(`${this.namespace}:${key}`, encoded, { ex: ttlSeconds });
      recordRedisCall('redis.set', started, 1, snapshotWireSizeOf(encoded), { status: 200 });
    } catch {
      recordRedisCall('redis.set', started, 1, 0, { status: 500 });
      /* best-effort: write failure does not fail the refresh */
    }
  }

  /**
   * Delete a namespaced key after invalidation.
   *
   * @param key - Key suffix appended to the store namespace.
   */
  async deleteKey(key: string): Promise<void> {
    const started = Date.now();
    try {
      await this.redis.del(`${this.namespace}:${key}`);
      recordRedisCall('redis.del', started, 1, 0, { status: 200 });
    } catch {
      recordRedisCall('redis.del', started, 1, 0, { status: 500 });
      /* best-effort: delete failure does not fail the mutation */
    }
  }
}
