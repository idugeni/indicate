import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { z } from 'zod';

import { reconcileMvpSeed, SeedExecutionError } from '../src/application/seed/reconcile-mvp-seed';
import { validateRuntimeConfig } from '../src/config/schema';
import { DrizzleSeedRepository } from '../src/infrastructure/db/repositories/drizzle-seed-repository';
import * as schema from '../src/infrastructure/db/schema';
import { UuidGenerator } from '../src/infrastructure/system/uuid-generator';

const configResult = validateRuntimeConfig(process.env);
const organizationResult = z.uuid().safeParse(process.env.SEED_ORGANIZATION_ID);
if (!configResult.success || !organizationResult.success) {
  console.error(JSON.stringify({ ok: false, category: 'seed_configuration_invalid' }));
  process.exit(1);
}

const client = postgres(configResult.config.supabase.directDatabaseUrl, { max: 1, prepare: false, connect_timeout: 10 });
try {
  const database = drizzle(client, { schema });
  const report = await reconcileMvpSeed({
    organizationId: organizationResult.data,
    rootHostnames: configResult.config.hosts.mvpRoots,
    reservedHostnames: configResult.config.hosts.reserved,
  }, new DrizzleSeedRepository(database), new UuidGenerator());
  console.log(JSON.stringify({ ok: true, ...report }));
} catch (error) {
  const report = error instanceof SeedExecutionError
    ? error.report
    : { created: 0, updated: 0, unchanged: 0, failed: 1 };
  console.error(JSON.stringify({ ok: false, category: 'seed_reconciliation_failed', ...report }));
  process.exitCode = 1;
} finally {
  await client.end({ timeout: 5 });
}
