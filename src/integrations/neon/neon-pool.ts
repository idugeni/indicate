import 'server-only';

import postgres from 'postgres';

import type { NeonSnapshotExecutor } from '@/integrations/neon/neon-snapshot-store';

const pools = new Map<string, postgres.Sql>();

/**
 * Open a process-wide Neon pool keyed by connection URL; never closed by callers.
 *
 * @param pooledUrl - Neon pooled connection URL (`-pooler` host).
 * @returns Shared postgres.js client for the URL.
 * @remarks No startup options: the pooled endpoint rejects `options`
 * parameters, so statement timeouts cannot ride along. The guard here is
 * structural instead — snapshot traffic is single-row primary-key lookups
 * and the pool is capped at two connections per warm instance.
 */
export function getSharedNeonPool(pooledUrl: string): postgres.Sql {
  const existing = pools.get(pooledUrl);
  if (existing !== undefined) return existing;
  const pool = postgres(pooledUrl, {
    max: 2,
    prepare: false,
    ssl: 'require',
    idle_timeout: 120,
    connect_timeout: 10,
    max_lifetime: 1800,
  });
  pools.set(pooledUrl, pool);
  return pool;
}

/**
 * Build the snapshot-store executor over the shared pool.
 *
 * @param pooledUrl - Neon pooled connection URL (`-pooler` host).
 * @returns Template-tag executor matching the store port.
 */
export function createNeonSnapshotExecutor(pooledUrl: string): NeonSnapshotExecutor {
  const sql = getSharedNeonPool(pooledUrl);
  return async (strings, ...values) => {
    const rows = await sql(strings, ...(values as never[]));
    return rows as readonly Record<string, unknown>[];
  };
}
