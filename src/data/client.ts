import 'server-only';

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import type { BootstrapConfig } from '@/core/config/bootstrap/bootstrap-schema';
import * as schema from '@/data/schema';

/** Opens the pooled runtime DB; URL resolved from BootstrapConfig. */
export function createRuntimeDatabase(config: BootstrapConfig) {
  const client = postgres(config.database.pooledUrl.reveal(), {
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