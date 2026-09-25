import 'server-only';

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import type { BootstrapConfig } from '@/core/config/bootstrap/bootstrap-schema';
import * as schema from '@/data/schema';

const RUNTIME_DATABASE_OPTIONS = '-c statement_timeout=15000 -c lock_timeout=5000 -c idle_in_transaction_session_timeout=30000';

function withRuntimeDatabaseOptions(rawUrl: string): string {
  const url = new URL(rawUrl);
  url.searchParams.set('options', RUNTIME_DATABASE_OPTIONS);
  return url.toString();
}

/**
 * Open the pooled runtime database.
 *
 * @param config - Bootstrap configuration providing the pooled URL.
 * @returns Frozen runtime client, database, and closer.
 * @remarks The Supabase transaction pooler multiplexes server connections, but each warm Vercel instance still owns its client pool. Runtime uses one connection per warm instance; the build phase uses two because its parallel prerender workers can briefly overlap cache fills. Startup options carry the timeout limits through transaction-mode Supavisor.
 */
export function createRuntimeDatabase(config: BootstrapConfig) {
  const client = postgres(withRuntimeDatabaseOptions(config.database.pooledUrl.reveal()), {
    max: process.env.NEXT_PHASE === 'phase-production-build' ? 2 : 1,
    prepare: false,
    ssl: 'require',
    idle_timeout: 20,
    connect_timeout: 10,
    max_lifetime: 60 * 30,
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