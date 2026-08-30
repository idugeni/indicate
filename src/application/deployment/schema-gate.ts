import type { SchemaGateResult, SchemaVersionPort } from '@/ports/schema-version';

export const REQUIRED_SCHEMA_VERSION = 12;

export async function checkSchemaVersion(
  port: SchemaVersionPort,
  requiredVersion = REQUIRED_SCHEMA_VERSION,
): Promise<SchemaGateResult> {
  const actualVersion = await port.readCurrentVersion();
  return Object.freeze({
    ready: actualVersion !== null && actualVersion >= requiredVersion,
    requiredVersion,
    actualVersion,
  });
}

export async function assertSchemaVersion(port: SchemaVersionPort): Promise<void> {
  const result = await checkSchemaVersion(port);
  if (!result.ready) {
    throw new Error(`Required database schema version is unavailable (required=${result.requiredVersion}, actual=${result.actualVersion ?? 'none'})`);
  }
}
