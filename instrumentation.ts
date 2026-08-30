export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { getRuntimeConfig } = await import('@/config/server');
  const config = getRuntimeConfig();
  if (config.schemaGateMode === 'live') {
    const [{ assertSchemaVersion }, { createPostgresSchemaVersionPort, createRuntimeDatabase }] = await Promise.all([
      import('@/application/deployment/schema-gate'),
      import('@/infrastructure/db/client'),
    ]);
    const runtime = createRuntimeDatabase(config);
    try {
      await assertSchemaVersion(createPostgresSchemaVersionPort(runtime.client));
    } finally {
      await runtime.close();
    }
  }
}
