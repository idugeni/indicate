import 'server-only';

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import type { RuntimeConfig } from '@/config/schema';
import type { SchemaVersionPort } from '@/ports/schema-version';
import * as schema from './schema';

export function createRuntimeDatabase(config: RuntimeConfig) {
  const client = postgres(config.supabase.pooledDatabaseUrl, {
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

export function createMigrationDatabase(config: RuntimeConfig) {
  const client = postgres(config.supabase.directDatabaseUrl, {
    max: 1,
    prepare: false,
    idle_timeout: 10,
    connect_timeout: 10,
  });
  return Object.freeze({
    client,
    db: drizzle(client, { schema }),
    close: async () => client.end({ timeout: 5 }),
  });
}

export function createPostgresSchemaVersionPort(client: ReturnType<typeof postgres>): SchemaVersionPort {
  return {
    async readCurrentVersion() {
      const rows = await client<{ version: number | null }[]>`
        SELECT max(version)::integer AS version FROM indicate_schema_migrations
      `;
      return rows[0]?.version ?? null;
    },
  };
}
