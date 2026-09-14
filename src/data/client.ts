import 'server-only';

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import type { BootstrapConfig } from '@/core/config/bootstrap/bootstrap-schema';
import * as schema from '@/data/schema';

/** Opens the pooled runtime DB; URL resolved from BootstrapConfig. */
export function createRuntimeDatabase(config: BootstrapConfig) {
  const client = postgres(config.database.pooledUrl.reveal(), {
    // max 5: satu pool shared per proses × N instance Fluid tetap jauh di
    // bawah pool Supavisor (default 15–30 koneksi server); query publik
    // pendek + Next-cache membuat antrean koneksi tidak pernah dalam.
    max: 5,
    prepare: false,
    idle_timeout: 20,
    connect_timeout: 10,
    // Fail-fast 15 dtk per statement (GUC Postgres = milidetik, diverifikasi
    // via node_modules/postgres ConnectionParameters + runtime-config docs):
    // query macet (pernah 1× statement timeout 57014 di production) tidak
    // boleh menggantung instance (= memory billing jalan terus) tanpa batas.
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