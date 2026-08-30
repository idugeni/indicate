import postgres from 'postgres';

import { checkSchemaVersion, REQUIRED_SCHEMA_VERSION } from '../src/application/deployment/schema-gate';
import { validateRuntimeConfig } from '../src/config/schema';

const result = validateRuntimeConfig(process.env);
if (!result.success) {
  console.error(JSON.stringify({ ok: false, issues: result.issues }));
  process.exit(1);
}

const client = postgres(result.config.supabase.pooledDatabaseUrl, {
  max: 1,
  prepare: false,
  connect_timeout: 10,
});

try {
  const gate = await checkSchemaVersion({
    async readCurrentVersion() {
      const rows = await client<{ version: number | null }[]>`
        SELECT max(version)::integer AS version FROM indicate_schema_migrations
      `;
      return rows[0]?.version ?? null;
    },
  });
  console.log(JSON.stringify({ ok: gate.ready, requiredVersion: REQUIRED_SCHEMA_VERSION, actualVersion: gate.actualVersion }));
  if (!gate.ready) process.exitCode = 1;
} catch {
  console.error(JSON.stringify({ ok: false, category: 'schema_version_unavailable', requiredVersion: REQUIRED_SCHEMA_VERSION }));
  process.exitCode = 1;
} finally {
  await client.end({ timeout: 5 });
}
