import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

import { validateRuntimeConfig } from '../src/config/schema';

const result = validateRuntimeConfig(process.env);
if (!result.success) {
  console.error(JSON.stringify({ ok: false, issues: result.issues }));
  process.exit(1);
}

const client = postgres(result.config.supabase.directDatabaseUrl, {
  max: 1,
  prepare: false,
  connect_timeout: 10,
});

try {
  await migrate(drizzle(client), { migrationsFolder: './drizzle' });
  console.log(JSON.stringify({ ok: true, migration: 'complete' }));
} catch {
  console.error(JSON.stringify({ ok: false, migration: 'failed' }));
  process.exitCode = 1;
} finally {
  await client.end({ timeout: 5 });
}
