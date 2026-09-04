import 'server-only';

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import type { BootstrapConfig } from '@/core/config/bootstrap/bootstrap-schema';
import type { RuntimeConfig } from '@/core/config/runtime/runtime-schema';
import * as schema from '@/data/schema';

type PooledUrlSource = Pick<RuntimeConfig, 'supabase'> | Pick<BootstrapConfig, 'database'>;

function pooledUrlOf(config: PooledUrlSource): string {
  if ('database' in config) {
    return config.database.pooledUrl.reveal();
  }
  return config.supabase.pooledDatabaseUrl;
}

/** Opens the pooled runtime DB; URL resolved from RuntimeConfig or BootstrapConfig. */
export function createRuntimeDatabase(config: RuntimeConfig | BootstrapConfig) {
  const client = postgres(pooledUrlOf(config as PooledUrlSource), {
    max: 10,
    prepare: false,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  return Object.freeze({
    client,
    db: drizzle(client, { schema }),
    close: async () => client.end({ timeout: 5 }),
  });
}