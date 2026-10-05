import { beforeEach, describe, expect, it, vi } from 'vitest';

const logEvent = vi.fn();

vi.mock('@/core/observability/logger', () => ({
  logEvent,
}));

const { flushOperationMetrics, recordOperation, resetOperationMetrics } = await import(
  '@/core/observability/operation-metrics'
);

function rollupContext(): { windowSeconds: number; operations: Record<string, unknown>[] } {
  const call = logEvent.mock.calls.find(([level, fields]) => level === 'info' && (fields as { event: string }).event === 'metrics.rollup');
  expect(call).toBeDefined();
  return (call?.[1] as { context: { windowSeconds: number; operations: Record<string, unknown>[] } }).context;
}

describe('recordOperation aggregation', () => {
  beforeEach(() => {
    logEvent.mockReset();
    resetOperationMetrics(Date.now());
  });

  it('menggabungkan durasi, perintah, dan hit/miss per route+operation+provider', () => {
    recordOperation({ route: 'GET /api/internal/publishing', operation: 'http', provider: 'vercel', durationMs: 100, status: 200 });
    recordOperation({ route: 'GET /api/internal/publishing', operation: 'http', provider: 'vercel', durationMs: 300, status: 200 });
    recordOperation({ route: 'GET /api/internal/publishing', operation: 'redis.eval', provider: 'upstash-redis', durationMs: 20, redisCommands: 1, redisMs: 18, cacheMiss: 1, payloadBytes: 512 });
    flushOperationMetrics(1_060_000);
    const { operations } = rollupContext();
    expect(operations).toHaveLength(2);
    const http = operations.find((entry) => entry.operation === 'http');
    expect(http).toMatchObject({ route: 'GET /api/internal/publishing', provider: 'vercel', count: 2, avgDurationMs: 200, maxDurationMs: 300 });
    expect(http?.statuses).toEqual({ '200': 2 });
    expect(operations.find((entry) => entry.operation === 'redis.eval')).toMatchObject({
      redisCommands: 1,
      redisMs: 18,
      cacheMisses: 1,
      totalPayloadBytes: 512,
      maxPayloadBytes: 512,
    });
  });

  it('melacak kardinalitas tenant dan pemimpin tanpa peta tak terbatas', () => {
    for (let index = 0; index < 5; index += 1) {
      recordOperation({ route: 'r', operation: 'o', provider: 'p', durationMs: 1, tenantId: 'org-berat' });
    }
    recordOperation({ route: 'r', operation: 'o', provider: 'p', durationMs: 1, tenantId: 'org-ringan' });
    flushOperationMetrics(1_060_000);
    const { operations } = rollupContext();
    expect(operations[0]).toMatchObject({ tenantCount: 2, topTenant: 'org-berat', topTenantCount: 5 });
  });

  it('tidak pernah melempar dan mengabaikan angka tak valid', () => {
    expect(() =>
      recordOperation({ route: 'r', operation: 'o', provider: 'p', durationMs: Number.NaN, redisCommands: -3, payloadBytes: Number.POSITIVE_INFINITY }),
    ).not.toThrow();
    flushOperationMetrics(1_060_000);
    const { operations } = rollupContext();
    expect(operations[0]).toMatchObject({ count: 1, avgDurationMs: 0, redisCommands: 0, totalPayloadBytes: 0 });
  });

  it('konteks rollup hanya berisi kunci agregat yang diizinkan', () => {
    recordOperation({ route: 'r', operation: 'o', provider: 'p', durationMs: 1, tenantId: 'org-1', status: 200 });
    flushOperationMetrics(1_060_000);
    const { operations } = rollupContext();
    const allowed = new Set([
      'route', 'operation', 'provider', 'count', 'avgDurationMs', 'maxDurationMs', 'dbQueries', 'dbMs',
      'redisCommands', 'redisMs', 'cacheHits', 'cacheMisses', 'totalPayloadBytes', 'maxPayloadBytes',
      'bytesKinds', 'tenantCount', 'tenantOverflow', 'topTenant', 'topTenantCount', 'statuses',
    ]);
    for (const entry of operations) {
      for (const key of Object.keys(entry)) expect(allowed.has(key)).toBe(true);
    }
    expect(JSON.stringify(operations)).not.toMatch(/body|prompt|token|secret|cookie|authorization/i);
  });

  it('flush kosong tidak me-log dan me-reset jendela', () => {
    flushOperationMetrics(1_060_000);
    expect(logEvent).not.toHaveBeenCalled();
    recordOperation({ route: 'r', operation: 'o', provider: 'p', durationMs: 1 });
    flushOperationMetrics(1_061_000);
    expect(logEvent).toHaveBeenCalledOnce();
  });

  it('menandai lapisan byte agar wire dan proyeksi tidak dijumlah silang', () => {
    recordOperation({ route: 'cache', operation: 'redis.set', provider: 'upstash-redis', durationMs: 5, payloadBytes: 100, bytesKind: 'wire' });
    recordOperation({ route: 'dashboard', operation: 'cache.dashboard', provider: 'supabase-postgres', durationMs: 50, payloadBytes: 100, bytesKind: 'projection' });
    flushOperationMetrics(1_060_000);
    const { operations } = rollupContext();
    expect(operations.find((entry) => entry.operation === 'redis.set')).toMatchObject({ bytesKinds: ['wire'] });
    expect(operations.find((entry) => entry.operation === 'cache.dashboard')).toMatchObject({ bytesKinds: ['projection'] });
  });

  it('menjumlah hit/miss per kunci, bukan satu bendera per batch', () => {
    recordOperation({ route: 'cache', operation: 'redis.mget', provider: 'upstash-redis', durationMs: 3, cacheHit: 7, cacheMiss: 3 });
    flushOperationMetrics(1_060_000);
    const { operations } = rollupContext();
    expect(operations.find((entry) => entry.operation === 'redis.mget')).toMatchObject({ cacheHits: 7, cacheMisses: 3 });
  });

  it('membatasi operasi dan tenant agar memori rollup terbatas', () => {
    for (let index = 0; index < 60; index += 1) {
      recordOperation({ route: 'r', operation: `op-${index}`, provider: 'p', durationMs: 1 });
    }
    for (let index = 0; index < 210; index += 1) {
      recordOperation({ route: 'r', operation: 'capped', provider: 'p', durationMs: 1, tenantId: `org-${index}` });
    }
    flushOperationMetrics(1_060_000);
    const { operations } = rollupContext();
    expect(operations.length).toBeLessThanOrEqual(50);
    expect(operations.find((entry) => entry.operation === 'capped')).toMatchObject({ tenantCount: 200, tenantOverflow: 10 });
  });
});
