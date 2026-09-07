import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import type * as schema from '@/data/schema';

type Database = PostgresJsDatabase<typeof schema>;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

export class RuntimeConfigAdminAccessDeniedError extends Error {
  constructor() { super('Runtime configuration administration requires a platform grant.'); }
}

export class RuntimeConfigAdminConflictError extends Error {
  constructor() { super('The runtime configuration changed before the update.'); }
}

export interface MediaPolicyRecord {
  readonly allowedMimeTypes: readonly string[];
  readonly maxObjectBytes: number;
  readonly uploadAuthorizationSeconds: number;
  readonly readAuthorizationSeconds: number;
  readonly version: number;
}

export interface MediaPolicyUpdate {
  readonly allowedMimeTypes: readonly string[];
  readonly maxObjectBytes: number;
  readonly uploadAuthorizationSeconds: number;
  readonly readAuthorizationSeconds: number;
  readonly expectedVersion: number;
}

function isVersionConflict(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '55000';
}

/**
 * Binds the verified session identity into the transaction and proves the
 * platform grant. Mirrors the content-admin precedent: the database function
 * re-checks authority, so this gate is defense in depth, never the sole check.
 */
async function verifiedPlatformActor(
  transaction: Transaction,
  authUserId: string,
  localUserId: string,
): Promise<void> {
  await transaction.execute(sql`SELECT set_config('app.auth_user_id', ${authUserId}, true)`);
  await transaction.execute(sql`SELECT set_config('app.actor_id', ${localUserId}, true)`);
  await transaction.execute(sql`SELECT indicate_private.set_verified_user_context(${authUserId}::uuid)`);
  const rows = await transaction.execute<{ allowed: boolean }>(sql`
    SELECT indicate_private.permission_has_platform(${localUserId}::uuid, 'platform.runtime_config.manage') AS allowed
  `);
  if (rows[0]?.allowed !== true) throw new RuntimeConfigAdminAccessDeniedError();
}

export class DrizzleRuntimeConfigAdminRepository {
  constructor(private readonly database: Database) {}

  async readMediaPolicy(authUserId: string, localUserId: string): Promise<MediaPolicyRecord> {
    return this.database.transaction(async (transaction) => {
      await verifiedPlatformActor(transaction, authUserId, localUserId);
      const rows = await transaction.execute<{
        allowed_mime_types: string[]; max_object_bytes: number;
        upload_authorization_seconds: number; read_authorization_seconds: number; version: number;
      }>(sql`SELECT allowed_mime_types, max_object_bytes, upload_authorization_seconds, read_authorization_seconds, version FROM public.media_policy WHERE singleton_key = 'singleton'`);
      const row = rows[0];
      if (row === undefined) throw new RuntimeConfigAdminAccessDeniedError();
      return Object.freeze({
        allowedMimeTypes: [...row.allowed_mime_types],
        maxObjectBytes: row.max_object_bytes,
        uploadAuthorizationSeconds: row.upload_authorization_seconds,
        readAuthorizationSeconds: row.read_authorization_seconds,
        version: row.version,
      });
    });
  }

  async updateMediaPolicy(authUserId: string, localUserId: string, input: MediaPolicyUpdate): Promise<{ version: number }> {
    try {
      return await this.database.transaction(async (transaction) => {
        await verifiedPlatformActor(transaction, authUserId, localUserId);
        const rows = await transaction.execute<{ update_media_policy: number }>(sql`
          SELECT indicate_private.mutate_runtime_config_media_policy(${localUserId}::uuid, ${input.expectedVersion}, ${[...input.allowedMimeTypes]}::text[], ${input.maxObjectBytes}, ${input.uploadAuthorizationSeconds}, ${input.readAuthorizationSeconds}) AS update_media_policy
        `);
        const version = rows[0]?.update_media_policy;
        if (typeof version !== 'number') throw new RuntimeConfigAdminAccessDeniedError();
        return { version };
      });
    } catch (error) {
      if (error instanceof RuntimeConfigAdminAccessDeniedError) throw error;
      if (isVersionConflict(error)) throw new RuntimeConfigAdminConflictError();
      throw error;
    }
  }
}
