import 'server-only';

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import type { BootstrapConfig } from '@/core/config/bootstrap/bootstrap-schema';
import * as schema from '@/data/schema';

/** Open the pooled runtime database.
 *
 * @param config - Bootstrap configuration providing the pooled URL.
 * @returns Frozen runtime client, database, and closer.
 * @remarks Max 5 connections: one shared pool per process × N Fluid instances stays far below the Supavisor pool (default 15–30 server connections); short public queries + Next cache keep the connection queue shallow. Connections recycle every 30 min so stale pooler connections (once a mass CONNECT_TIMEOUT) are replaced proactively before serving requests. Fail-fast 15s per statement (Postgres GUC = milliseconds, verified via node_modules/postgres ConnectionParameters + runtime-config docs): stuck queries (once 1× statement timeout 57014 in production) must not hang the instance (= memory billing keeps running) without bound.
 */
export function createRuntimeDatabase(config: BootstrapConfig) {
  const client = postgres(config.database.pooledUrl.reveal(), {
    max: 5,
    prepare: false,
    idle_timeout: 20,
    connect_timeout: 10,
    max_lifetime: 60 * 30,
    connection: { statement_timeout: 15000 },
  });
  return Object.freeze({
    client,
    db: drizzle(client, { schema }),
    close: async () => client.end({ timeout: 5 }),
  });
}

const sharedPools = new Map<string, Pick<ReturnType<typeof createRuntimeDatabase>, 'client' | 'db'>>();

/**
 * Process-wide pool keyed by connection URL; never closed by callers so hot
 * paths skip the ~1s TLS handshake per request. Idle connections still
 * self-close via `idle_timeout`. Shape omits `close` so owned-vs-shared
 * misuse fails at compile time.
 */
export function getSharedRuntimeDatabase(config: BootstrapConfig) {
  const key = config.database.pooledUrl.reveal();
  const existing = sharedPools.get(key);
  if (existing !== undefined) return existing;
  const { client, db } = createRuntimeDatabase(config);
  const shared = Object.freeze({ client, db });
  sharedPools.set(key, shared);
  return shared;
}