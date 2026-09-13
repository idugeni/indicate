import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import type * as schema from '@/data/schema';
import { INTEGRATIONS_PERMISSIONS } from '@/modules/integrations/permissions';

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

/** Cuplikan read-only kebijakan platform untuk overview UI (tanpa secret). */
export interface RuntimePoliciesOverview {
  readonly deployment: {
    readonly supabaseProjectRef: string; readonly cloudflareAccountId: string;
    readonly vercelProjectId: string; readonly vercelTeamId: string;
    readonly vercelProductionTargetHostname: string; readonly r2AccountId: string;
    readonly r2BucketName: string; readonly upstashRedisResourceId: string;
    readonly version: number; readonly updatedAt: string;
  } | null;
  readonly publication: {
    readonly maxAttempts: number; readonly retryDelaysSeconds: readonly number[];
    readonly leaseSeconds: number; readonly batchSize: number;
    readonly functionDeadlineSeconds: number; readonly version: number; readonly updatedAt: string;
  } | null;
  readonly webhook: {
    readonly freshnessSeconds: number; readonly replayRetentionSeconds: number;
    readonly version: number; readonly updatedAt: string;
  } | null;
  readonly cache: {
    readonly publicCacheSeconds: number; readonly cacheVersion: number;
    readonly version: number; readonly updatedAt: string;
  } | null;
  readonly rateLimits: readonly {
    readonly endpointClass: string; readonly allowance: number;
    readonly windowSeconds: number; readonly version: number; readonly updatedAt: string;
  }[];
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
    SELECT indicate_private.permission_has_platform(${localUserId}::uuid, ${INTEGRATIONS_PERMISSIONS.runtimeConfigManage}) AS allowed
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

  async updateMediaPolicy(authUserId: string, localUserId: string, input: MediaPolicyUpdate): Promise<{ version: number }> {    try {
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

  async readPoliciesOverview(authUserId: string, localUserId: string): Promise<RuntimePoliciesOverview> {
    return this.database.transaction(async (transaction) => {
      await verifiedPlatformActor(transaction, authUserId, localUserId);
      const [deploymentRows, publicationRows, webhookRows, cacheRows, rateLimitRows] = await Promise.all([
        transaction.execute<{
          supabase_project_ref: string; cloudflare_account_id: string; vercel_project_id: string;
          vercel_team_id: string; vercel_production_target_hostname: string; r2_account_id: string;
          r2_bucket_name: string; upstash_redis_resource_id: string; version: number; updated_at: Date;
        }>(sql`SELECT supabase_project_ref, cloudflare_account_id, vercel_project_id, vercel_team_id, vercel_production_target_hostname, r2_account_id, r2_bucket_name, upstash_redis_resource_id, version, updated_at FROM public.shared_deployment_config WHERE id = 'singleton'`),
        transaction.execute<{
          max_attempts: number; retry_delays_seconds: number[]; lease_seconds: number;
          batch_size: number; function_deadline_seconds: number; version: number; updated_at: Date;
        }>(sql`SELECT max_attempts, retry_delays_seconds, lease_seconds, batch_size, function_deadline_seconds, version, updated_at FROM public.publication_policy WHERE singleton_key = 'singleton'`),
        transaction.execute<{
          freshness_seconds: number; replay_retention_seconds: number; version: number; updated_at: Date;
        }>(sql`SELECT freshness_seconds, replay_retention_seconds, version, updated_at FROM public.webhook_policy WHERE singleton_key = 'singleton'`),
        transaction.execute<{
          public_cache_seconds: number; cache_version: number; version: number; updated_at: Date;
        }>(sql`SELECT public_cache_seconds, cache_version, version, updated_at FROM public.cache_policy WHERE singleton_key = 'singleton'`),
        transaction.execute<{
          endpoint_class: string; allowance: number; window_seconds: number; version: number; updated_at: Date;
        }>(sql`SELECT endpoint_class, allowance, window_seconds, version, updated_at FROM public.rate_limit_policies ORDER BY endpoint_class`),
      ]);
      const deployment = deploymentRows[0];
      const publication = publicationRows[0];
      const webhook = webhookRows[0];
      const cache = cacheRows[0];
      return Object.freeze({
        deployment: deployment === undefined ? null : {
          supabaseProjectRef: deployment.supabase_project_ref, cloudflareAccountId: deployment.cloudflare_account_id,
          vercelProjectId: deployment.vercel_project_id, vercelTeamId: deployment.vercel_team_id,
          vercelProductionTargetHostname: deployment.vercel_production_target_hostname, r2AccountId: deployment.r2_account_id,
          r2BucketName: deployment.r2_bucket_name, upstashRedisResourceId: deployment.upstash_redis_resource_id,
          version: deployment.version, updatedAt: deployment.updated_at.toISOString(),
        },
        publication: publication === undefined ? null : {
          maxAttempts: publication.max_attempts, retryDelaysSeconds: [...publication.retry_delays_seconds],
          leaseSeconds: publication.lease_seconds, batchSize: publication.batch_size,
          functionDeadlineSeconds: publication.function_deadline_seconds, version: publication.version,
          updatedAt: publication.updated_at.toISOString(),
        },
        webhook: webhook === undefined ? null : {
          freshnessSeconds: webhook.freshness_seconds, replayRetentionSeconds: webhook.replay_retention_seconds,
          version: webhook.version, updatedAt: webhook.updated_at.toISOString(),
        },
        cache: cache === undefined ? null : {
          publicCacheSeconds: cache.public_cache_seconds, cacheVersion: cache.cache_version,
          version: cache.version, updatedAt: cache.updated_at.toISOString(),
        },
        rateLimits: rateLimitRows.map((row) => ({
          endpointClass: row.endpoint_class, allowance: row.allowance,
          windowSeconds: row.window_seconds, version: row.version, updatedAt: row.updated_at.toISOString(),
        })),
      });
    });
  }
}
