import 'server-only';

import { logEvent } from '@/core/observability/logger';

/**
 * One measured operation. Only numeric aggregates and code-constant
 * dimensions travel here — never bodies, prompts, tokens, secrets,
 * cookies, or authorization headers (the type has no such fields).
 */
export interface OperationSample {
  /** Route label, e.g. `GET /api/internal/publishing`. */
  readonly route: string;
  /** Operation within the route, e.g. `http`, `redis.get`, `db:faqs`. */
  readonly operation: string;
  /** Provider dimension, e.g. `vercel`, `upstash-redis`, `supabase-postgres`. */
  readonly provider: string;
  /** Tenant UUID when the caller knows it; omitted otherwise. */
  readonly tenantId?: string | undefined;
  /** Wall-clock duration of the operation. */
  readonly durationMs: number;
  /** Database queries issued by the operation. */
  readonly dbQueries?: number | undefined;
  /** Database time inside the operation. */
  readonly dbMs?: number | undefined;
  /** Redis commands issued by the operation. */
  readonly redisCommands?: number | undefined;
  /** Redis time inside the operation. */
  readonly redisMs?: number | undefined;
  /** Cache hits credited to the operation. */
  readonly cacheHit?: number | undefined;
  /** Cache misses credited to the operation. */
  readonly cacheMiss?: number | undefined;
  /** Payload bytes transferred (request, response, or blob).
   *
   * @remarks Layer-tagged by `bytesKind`: `wire` = Redis REST bytes on the
   * wire, `projection` = serialized cache payload measured at the DAL.
   * Never sum one logical payload across layers (`redis.set` wire bytes and
   * the `cache.dashboard` projection bytes describe the same object at two
   * layers); compare within one `operation` instead.
   */
  readonly payloadBytes?: number | undefined;
  /** Which layer `payloadBytes` was measured at; omitted when not a byte-bearing sample. */
  readonly bytesKind?: 'wire' | 'projection' | undefined;
  /** Outcome code: HTTP status for requests; 200 ok / 500 error for background operations. */
  readonly status?: number | undefined;
}

interface OperationAggregate {
  count: number;
  totalDurationMs: number;
  maxDurationMs: number;
  dbQueries: number;
  dbMs: number;
  redisCommands: number;
  redisMs: number;
  cacheHits: number;
  cacheMisses: number;
  totalPayloadBytes: number;
  maxPayloadBytes: number;
  tenants: Set<string>;
  tenantCounts: Map<string, number>;
  tenantOverflow: number;
  statuses: Map<number, number>;
  bytesKinds: Set<string>;
}

/** Operations aggregated before one rollup line is emitted. */
const ROLLUP_OPERATION_THRESHOLD = 500;
/** Milliseconds between rollup emissions. */
const ROLLUP_INTERVAL_MS = 60_000;
/** Distinct tenants tracked per aggregate; beyond this only the count grows. */
const MAX_TENANTS_PER_AGGREGATE = 200;
/** Operations included per rollup line, ranked by count. */
const MAX_OPERATIONS_PER_ROLLUP = 50;

const aggregates = new Map<string, OperationAggregate>();
let operationsSinceFlush = 0;
let lastFlushAt = 0;

function aggregateKey(sample: OperationSample): string {
  return `${sample.route}|${sample.operation}|${sample.provider}`;
}

function toFiniteNumber(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;
}

/**
 * Record one operation into the in-process rollup.
 *
 * @param sample - Measured operation; numeric aggregates and code-constant dimensions only.
 * @remarks Serverless-safe: no timers, flush is evaluated on record. Never
 * throws; telemetry must not break the request path. Best-effort across
 * instance recycles — the log drain aggregates rollups, instances do not coordinate.
 */
export function recordOperation(sample: OperationSample): void {
  try {
    const key = aggregateKey(sample);
    let aggregate = aggregates.get(key);
    if (aggregate === undefined) {
      aggregate = {
        count: 0,
        totalDurationMs: 0,
        maxDurationMs: 0,
        dbQueries: 0,
        dbMs: 0,
        redisCommands: 0,
        redisMs: 0,
        cacheHits: 0,
        cacheMisses: 0,
        totalPayloadBytes: 0,
        maxPayloadBytes: 0,
        tenants: new Set<string>(),
        tenantCounts: new Map<string, number>(),
        tenantOverflow: 0,
        statuses: new Map<number, number>(),
        bytesKinds: new Set<string>(),
      };
      aggregates.set(key, aggregate);
    }
    const durationMs = toFiniteNumber(sample.durationMs);
    aggregate.count += 1;
    aggregate.totalDurationMs += durationMs;
    if (durationMs > aggregate.maxDurationMs) aggregate.maxDurationMs = durationMs;
    aggregate.dbQueries += toFiniteNumber(sample.dbQueries);
    aggregate.dbMs += toFiniteNumber(sample.dbMs);
    aggregate.redisCommands += toFiniteNumber(sample.redisCommands);
    aggregate.redisMs += toFiniteNumber(sample.redisMs);
    aggregate.cacheHits += toFiniteNumber(sample.cacheHit);
    aggregate.cacheMisses += toFiniteNumber(sample.cacheMiss);
    const payloadBytes = toFiniteNumber(sample.payloadBytes);
    aggregate.totalPayloadBytes += payloadBytes;
    if (payloadBytes > aggregate.maxPayloadBytes) aggregate.maxPayloadBytes = payloadBytes;
    if (sample.bytesKind !== undefined) aggregate.bytesKinds.add(sample.bytesKind);
    if (sample.tenantId !== undefined && sample.tenantId !== '') {
      if (aggregate.tenantCounts.has(sample.tenantId)) {
        aggregate.tenantCounts.set(sample.tenantId, (aggregate.tenantCounts.get(sample.tenantId) ?? 0) + 1);
      } else if (aggregate.tenants.size < MAX_TENANTS_PER_AGGREGATE) {
        aggregate.tenants.add(sample.tenantId);
        aggregate.tenantCounts.set(sample.tenantId, 1);
      } else {
        aggregate.tenantOverflow += 1;
      }
    }
    if (sample.status !== undefined && Number.isInteger(sample.status)) {
      aggregate.statuses.set(sample.status, (aggregate.statuses.get(sample.status) ?? 0) + 1);
    }
    operationsSinceFlush += 1;
    const now = Date.now();
    if (operationsSinceFlush >= ROLLUP_OPERATION_THRESHOLD || now - lastFlushAt >= ROLLUP_INTERVAL_MS) {
      flushOperationMetrics(now);
    }
  } catch {
    /* telemetry must never fail the caller */
  }
}

/**
 * Emit one `metrics.rollup` line with the aggregated window and reset.
 *
 * @param now - Clock in epoch ms; defaults to the current time.
 * @remarks Operations ranked by count, capped so the line stays small.
 * Tenant attribution is cardinality + leader only: full per-tenant
 * breakdowns belong to the log drain, not to an unbounded log line.
 */
export function flushOperationMetrics(now: number = Date.now()): void {
  try {
    if (operationsSinceFlush === 0) {
      lastFlushAt = now;
      return;
    }
    const windowSeconds = Math.max(1, Math.round((now - lastFlushAt) / 1000));
    const ranked = [...aggregates.entries()]
      .sort((left, right) => right[1].count - left[1].count)
      .slice(0, MAX_OPERATIONS_PER_ROLLUP);
    const operations = ranked.map(([key, aggregate]) => {
      const separator = key.indexOf('|');
      const second = key.indexOf('|', separator + 1);
      const statuses: Record<string, number> = {};
      for (const [status, count] of aggregate.statuses) statuses[String(status)] = count;
      let topTenant: string | null = null;
      let topTenantCount = 0;
      for (const [tenantId, count] of aggregate.tenantCounts) {
        if (count > topTenantCount) {
          topTenant = tenantId;
          topTenantCount = count;
        }
      }
      return {
        route: key.slice(0, separator),
        operation: key.slice(separator + 1, second),
        provider: key.slice(second + 1),
        count: aggregate.count,
        avgDurationMs: aggregate.count === 0 ? 0 : Math.round((aggregate.totalDurationMs / aggregate.count) * 10) / 10,
        maxDurationMs: Math.round(aggregate.maxDurationMs * 10) / 10,
        dbQueries: aggregate.dbQueries,
        dbMs: Math.round(aggregate.dbMs),
        redisCommands: aggregate.redisCommands,
        redisMs: Math.round(aggregate.redisMs),
        cacheHits: aggregate.cacheHits,
        cacheMisses: aggregate.cacheMisses,
        totalPayloadBytes: aggregate.totalPayloadBytes,
        maxPayloadBytes: aggregate.maxPayloadBytes,
        ...(aggregate.bytesKinds.size === 0 ? {} : { bytesKinds: [...aggregate.bytesKinds].sort() }),
        tenantCount: aggregate.tenants.size,
        tenantOverflow: aggregate.tenantOverflow,
        ...(topTenant === null ? {} : { topTenant, topTenantCount }),
        ...(Object.keys(statuses).length === 0 ? {} : { statuses }),
      };
    });
    logEvent('info', {
      event: 'metrics.rollup',
      context: { windowSeconds, operations },
    });
    aggregates.clear();
    operationsSinceFlush = 0;
    lastFlushAt = now;
  } catch {
    /* telemetry must never fail the caller */
  }
}

/** Clear all aggregated state; test-only. */
export function resetOperationMetrics(now: number = Date.now()): void {
  aggregates.clear();
  operationsSinceFlush = 0;
  lastFlushAt = now;
}
