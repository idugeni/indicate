import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import type * as schema from '@/data/schema';
import { INTEGRATIONS_PERMISSIONS } from '@/modules/integrations/permissions';
import { sqlStringArray } from '@/data/repos/shared/sql-array';

type Database = PostgresJsDatabase<typeof schema>;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

export class RuntimeConfigAdminAccessDeniedError extends Error {
  constructor() { super('Runtime configuration administration requires a platform grant.'); }
}

export class RuntimeConfigAdminConflictError extends Error {
  constructor() { super('The runtime configuration changed before the update.'); }
}

/**
 * The security-definer reads returned no policy row.
 *
 * @remarks Distinct from a denial: every runtime-config table carries
 * `config_deny_all` for the runtime role, so a missing row means the read path
 * or the seed is broken. Reporting it as a denial turns a server fault into a
 * 404 that reads as "not allowed" and hides the outage.
 */
export class RuntimeConfigAdminUnavailableError extends Error {
  constructor(policyKind: string) { super(`Runtime configuration policy is unreadable: ${policyKind}`); }
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

/** Read-only snapshot of platform policies for the UI overview (no secrets). */
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
    readonly functionDeadlineSeconds: number; readonly version: number;
  } | null;
  readonly webhook: {
    readonly freshnessSeconds: number; readonly replayRetentionSeconds: number;
    readonly version: number;
  } | null;
  readonly cache: {
    readonly publicCacheSeconds: number; readonly cacheVersion: number;
    readonly version: number;
  } | null;
  readonly rateLimits: readonly {
    readonly endpointClass: string; readonly allowance: number;
    readonly windowSeconds: number; readonly version: number;
  }[];
}

function isVersionConflict(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '55000';
}

/** One row of the security-definer policy projection; `fields` arrives camelCased. */
type PolicyProjection = {
  readonly policy_kind: string;
  readonly endpoint_class: string | null;
  readonly fields: Record<string, unknown>;
};
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

  /**
   * Read every policy through the security-definer projection.
   *
   * @returns One row per policy, including the three `rate_limit_policy` rows keyed by endpoint class.
   * @remarks The underlying tables are `config_deny_all` for the runtime role, so
   * a direct `SELECT` returns nothing and looks like a denial. The definer
   * function is the only sanctioned read path — the same one the runtime
   * snapshot reader uses.
   */
  private async readPolicyRows(transaction: Transaction): Promise<readonly PolicyProjection[]> {
    return transaction.execute<PolicyProjection>(sql`SELECT * FROM indicate_private.read_runtime_config_policies()`);
  }

  async readMediaPolicy(authUserId: string, localUserId: string): Promise<MediaPolicyRecord> {
    return this.database.transaction(async (transaction) => {
      await verifiedPlatformActor(transaction, authUserId, localUserId);
      const fields = (await this.readPolicyRows(transaction)).find((row) => row.policy_kind === 'media_policy')?.fields;
      if (fields === undefined) throw new RuntimeConfigAdminUnavailableError('media_policy');
      return Object.freeze({
        allowedMimeTypes: [...(fields.allowedMimeTypes as readonly string[])],
        maxObjectBytes: fields.maxObjectBytes as number,
        uploadAuthorizationSeconds: fields.uploadAuthorizationSeconds as number,
        readAuthorizationSeconds: fields.readAuthorizationSeconds as number,
        version: fields.version as number,
      });
    });
  }

  async updateMediaPolicy(authUserId: string, localUserId: string, input: MediaPolicyUpdate): Promise<{ version: number }> {    try {
      return await this.database.transaction(async (transaction) => {
        await verifiedPlatformActor(transaction, authUserId, localUserId);
        const rows = await transaction.execute<{ update_media_policy: number }>(sql`
          SELECT indicate_private.mutate_runtime_config_media_policy(${localUserId}::uuid, ${input.expectedVersion}, ${sqlStringArray(input.allowedMimeTypes)}::text[], ${input.maxObjectBytes}, ${input.uploadAuthorizationSeconds}, ${input.readAuthorizationSeconds}) AS update_media_policy
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
      const [policyRows, sharedRows] = await Promise.all([
        this.readPolicyRows(transaction),
        transaction.execute<{
          supabase_project_ref: string; cloudflare_account_id: string; vercel_project_id: string;
          vercel_team_id: string; vercel_production_target_hostname: string; r2_account_id: string;
          r2_bucket_name: string; upstash_redis_resource_id: string; version: number; updated_at_iso: string;
        }>(sql`
          SELECT shared.supabase_project_ref, shared.cloudflare_account_id, shared.vercel_project_id,
                 shared.vercel_team_id, shared.vercel_production_target_hostname, shared.r2_account_id,
                 shared.r2_bucket_name, shared.upstash_redis_resource_id, shared.version,
                 to_char(shared.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS updated_at_iso
          FROM indicate_private.read_runtime_config_shared() AS shared`),
      ]);
      const fieldsOf = (kind: string): Record<string, unknown> | undefined =>
        policyRows.find((row) => row.policy_kind === kind)?.fields;
      const deployment = sharedRows[0];
      const publication = fieldsOf('publication_policy');
      const webhook = fieldsOf('webhook_policy');
      const cache = fieldsOf('cache_policy');
      const rateLimits = policyRows
        .filter((row) => row.policy_kind === 'rate_limit_policy')
        .sort((left, right) => (left.endpoint_class ?? '').localeCompare(right.endpoint_class ?? ''));
      return Object.freeze({
        deployment: deployment === undefined ? null : {
          supabaseProjectRef: deployment.supabase_project_ref, cloudflareAccountId: deployment.cloudflare_account_id,
          vercelProjectId: deployment.vercel_project_id, vercelTeamId: deployment.vercel_team_id,
          vercelProductionTargetHostname: deployment.vercel_production_target_hostname, r2AccountId: deployment.r2_account_id,
          r2BucketName: deployment.r2_bucket_name, upstashRedisResourceId: deployment.upstash_redis_resource_id,
          version: deployment.version, updatedAt: deployment.updated_at_iso,
        },
        publication: publication === undefined ? null : {
          maxAttempts: publication.maxAttempts as number, retryDelaysSeconds: [...(publication.retryDelaysSeconds as readonly number[])],
          leaseSeconds: publication.leaseSeconds as number, batchSize: publication.batchSize as number,
          functionDeadlineSeconds: publication.functionDeadlineSeconds as number, version: publication.version as number,
        },
        webhook: webhook === undefined ? null : {
          freshnessSeconds: webhook.freshnessSeconds as number, replayRetentionSeconds: webhook.replayRetentionSeconds as number,
          version: webhook.version as number,
        },
        cache: cache === undefined ? null : {
          publicCacheSeconds: cache.publicCacheSeconds as number, cacheVersion: cache.cacheVersion as number,
          version: cache.version as number,
        },
        rateLimits: rateLimits.map((row) => ({
          endpointClass: row.endpoint_class ?? '', allowance: row.fields.allowance as number,
          windowSeconds: row.fields.windowSeconds as number, version: row.fields.version as number,
        })),
      });
    });
  }
}
