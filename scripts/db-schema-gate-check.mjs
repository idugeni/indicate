import { readFile } from 'node:fs/promises';

import postgres from 'postgres';

class SchemaGateError extends Error {}

async function main() {
  const databaseUrl = process.env.DATABASE_POOL_URL?.trim();
  if (!databaseUrl) {
    throw new SchemaGateError('db_schema_gate_check_failed: DATABASE_POOL_URL is not configured');
  }

  const journal = JSON.parse(
    await readFile(new URL('../src/data/migrations/meta/_journal.json', import.meta.url), 'utf8'),
  );
  if (!Array.isArray(journal.entries) || journal.entries.length === 0) {
    throw new SchemaGateError('db_schema_gate_check_failed: migration journal is empty or invalid');
  }

  // The schema-version module is covered by a unit test that keeps it equal
  // to the migration journal entry count. The CI preflight derives the same
  // contract directly from JSON so it can run without a TypeScript loader.
  const codeRequiredVersion = journal.entries.length;
  const client = postgres(databaseUrl, {
    ssl: 'require',
    prepare: false,
    max: 1,
    connect_timeout: 10,
    idle_timeout: 5,
  });

  try {
    const ledger = await client`
      SELECT COALESCE(MAX(version), 0)::int AS applied_version
        FROM public.indicate_schema_migrations
    `;
    const gates = await client`
      SELECT required_version
        FROM public.migration_gate_events
       ORDER BY checked_at DESC
       LIMIT 1
    `;
    const appliedVersion = Number(ledger[0]?.applied_version ?? 0);
    const configuredRequiredVersion = Number(gates[0]?.required_version ?? 0);
    const requiredVersion = Math.max(codeRequiredVersion, configuredRequiredVersion);

    if (!Number.isSafeInteger(appliedVersion) || appliedVersion < requiredVersion) {
      throw new SchemaGateError(
        `db_schema_gate_unsatisfied: applied=${appliedVersion} required=${requiredVersion} journal_entries=${codeRequiredVersion}`,
      );
    }

    console.log(
      `db schema gate passed: applied=${appliedVersion} required=${requiredVersion}`,
    );
  } finally {
    await client.end({ timeout: 5 });
  }
}

main().catch((error) => {
  if (error instanceof SchemaGateError) {
    console.error(error.message);
  } else {
    const fault = error && typeof error === 'object' ? error : null;
    const code = fault && typeof fault.code === 'string' ? fault.code : 'unknown';
    console.error(`db_schema_gate_check_failed: code=${code}`);
  }
  process.exitCode = 1;
});
