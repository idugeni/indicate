import 'server-only';

import { getBootstrapConfig } from '@/core/config/bootstrap/bootstrap-config';
import type { BootstrapConfig } from '@/core/config/bootstrap/bootstrap-schema';
import type { RuntimeConfigSnapshot } from '@/core/config/persisted/parser';
import { DrizzleRuntimeConfigRepository } from '@/data/repos/runtime-config/reader';
import { RuntimeConfigSnapshotCache } from '@/core/system/runtime-config-snapshot-cache';
import { UpstashSnapshotStore } from '@/integrations/redis/upstash-snapshot-store';
import { HrTimeMonotonicClock } from '@/core/system/monotonic-clock';
import { createRuntimeDatabase } from '@/data/client';
import { deriveRedisNamespace } from '@/core/config/runtime/derived-values';
import { RuntimeConfigReadError } from '@/modules/persisted-config/ports';
import type { RuntimeConfig } from '@/core/config/runtime/runtime-schema';

export interface RuntimeContext {
  readonly bootstrap: BootstrapConfig;
  /** Valid PostgreSQL snapshot; absence fails closed, never falls back. */
  readonly snapshot: RuntimeConfigSnapshot;
  /** Service configuration assembled from Bootstrap + snapshot. */
  readonly config: RuntimeConfig;
}

let hydratedPromise: Promise<RuntimeContext> | null = null;

/** Single-flight server runtime context via the bounded cache. */
export async function getServerRuntimeContext(): Promise<RuntimeContext> {
  if (hydratedPromise === null) {
    hydratedPromise = initializeContext();
  }
  return hydratedPromise;
}

let cache: RuntimeConfigSnapshotCache | null = null;

function buildServiceConfig(bootstrap: BootstrapConfig, snapshot: RuntimeConfigSnapshot): RuntimeConfig {
  const shared = snapshot.sharedDeployment;
  const policies = snapshot.policies;
  return Object.freeze({
    environment: bootstrap.environment,
    schemaGateMode: bootstrap.schemaGateMode,
    hosts: Object.freeze({
      dashboard: bootstrap.controlHosts.dashboard,
      api: bootstrap.controlHosts.api,
      webhook: bootstrap.controlHosts.webhook,
      reserved: new Set(bootstrap.controlHosts.reserved),
    }),
    supabase: Object.freeze({
      pooledDatabaseUrl: bootstrap.database.pooledUrl.reveal(),
    }),
    cloudflare: Object.freeze({
      accountId: shared.cloudflareAccountId,
      apiToken: bootstrap.credentials.cloudflareApiToken.reveal(),
      originSecret: bootstrap.credentials.cloudflareOriginSecret.reveal(),
    }),
    vercel: Object.freeze({
      projectId: shared.vercelProjectId,
      teamId: shared.vercelTeamId,
      apiToken: bootstrap.credentials.vercelApiToken.reveal(),
      productionTarget: shared.vercelProductionTargetHostname,
    }),
    r2: Object.freeze({
      accountId: shared.r2AccountId,
      bucketName: shared.r2BucketName,
      accessKeyId: bootstrap.credentials.r2AccessKeyId.reveal(),
      secretAccessKey: bootstrap.credentials.r2SecretAccessKey.reveal(),
      maxBytes: policies.media.maxObjectBytes,
      uploadTtlSeconds: policies.media.uploadAuthorizationSeconds,
      readTtlSeconds: policies.media.readAuthorizationSeconds,
      allowedTypes: policies.media.allowedMimeTypes,
      audit: bootstrap.credentials.r2AuditBucketName === null
        ? null
        : {
            bucketName: bootstrap.credentials.r2AuditBucketName,
            accessKeyId: bootstrap.credentials.r2AuditAccessKeyId?.reveal() ?? bootstrap.credentials.r2AccessKeyId.reveal(),
            secretAccessKey: bootstrap.credentials.r2AuditSecretAccessKey?.reveal() ?? bootstrap.credentials.r2SecretAccessKey.reveal(),
          },
    }),
    redis: Object.freeze({
      url: bootstrap.credentials.upstashRestUrl,
      token: bootstrap.credentials.upstashRestToken.reveal(),
      resourceId: shared.upstashRedisResourceId,
      namespace: deriveRedisNamespace(bootstrap.environment, policies.cache.cacheVersion),
    }),
    publishing: Object.freeze({
      maxAttempts: policies.publication.maxAttempts,
      retryDelaysSeconds: policies.publication.retryDelaysSeconds,
      leaseSeconds: policies.publication.leaseSeconds,
      batchSize: policies.publication.batchSize,
      functionDeadlineSeconds: policies.publication.functionDeadlineSeconds,
    }),
    telegram: Object.freeze({
      botToken: bootstrap.credentials.telegramBotToken.reveal(),
      webhookSecret: bootstrap.credentials.telegramWebhookSecret.reveal(),
    }),
    security: Object.freeze({
      webhookFreshnessSeconds: policies.webhook.freshnessSeconds,
      webhookReplayTtlSeconds: policies.webhook.replayRetentionSeconds,
      genericWebhookSecret: bootstrap.credentials.genericWebhookSecret.reveal(),
      cronSecret: bootstrap.credentials.cronSecret.reveal(),
    }),
    cache: Object.freeze({
      defaultTtlSeconds: policies.cache.publicCacheSeconds,
    }),
    rateLimits: Object.freeze({
      mutation: Object.freeze({
        allowance: policies.rateLimit.mutation.allowance,
        windowSeconds: policies.rateLimit.mutation.windowSeconds,
      }),
      webhook: Object.freeze({
        allowance: policies.rateLimit.webhook.allowance,
        windowSeconds: policies.rateLimit.webhook.windowSeconds,
      }),
      publicRead: Object.freeze({
        allowance: policies.rateLimit.public_read.allowance,
        windowSeconds: policies.rateLimit.public_read.windowSeconds,
      }),
    }),
    seo: Object.freeze({
      defaultLocale: bootstrap.seo.defaultLocale,
      defaultAssetUrl: bootstrap.seo.defaultAssetUrl,
    }),
  });
}

/**
 * Fail-closed schema gate (docs/MIGRATIONS.md promotion gate): when a
 * required_version row exists, the applied ledger must satisfy it or the
 * process refuses to activate. No row means disarmed (pre-production) and
 * behavior is unchanged. Versions are not secrets.
 */
async function assertSchemaGate(client: Pick<ReturnType<typeof createRuntimeDatabase>, 'client'>['client']): Promise<void> {
  const gates = await client<{ required_version: number }[]>`SELECT required_version FROM public.migration_gate_events ORDER BY checked_at DESC LIMIT 1`;
  const required = gates[0]?.required_version;
  if (required === undefined) return;
  const ledgers = await client<{ applied_version: number | null }[]>`SELECT max(version)::int AS applied_version FROM public.indicate_schema_migrations`;
  const applied = ledgers[0]?.applied_version ?? 0;
  if (applied < required) {
    throw new Error(`schema_gate_unsatisfied: applied=${applied} required=${required}`);
  }
}

async function initializeContext(): Promise<RuntimeContext> {
  const bootstrap = getBootstrapConfig();

  if (cache === null) {
    const runtime = createRuntimeDatabase(bootstrap);
    await assertSchemaGate(runtime.client);
    const repository = new DrizzleRuntimeConfigRepository(runtime.db);
    const snapshotStore = new UpstashSnapshotStore({
      url: bootstrap.credentials.upstashRestUrl,
      token: bootstrap.credentials.upstashRestToken.reveal(),
      namespace: `indicate:shared:${bootstrap.environment}`,
    });
    cache = new RuntimeConfigSnapshotCache({ repository, clock: new HrTimeMonotonicClock(), snapshotStore });
    // Singleton owns the client for the app lifetime (covers 300s refreshes).
    void runtime;
  }

  const entry = await cache.get(bootstrap.environment).catch((error: unknown) => {
    const fault = error as { code?: unknown; message?: unknown; detail?: unknown } | null;
    const code = typeof fault?.code === 'string' ? fault.code : 'unknown';
    const message = typeof fault?.message === 'string' ? fault.message.slice(0, 200) : 'unknown';
    throw new RuntimeConfigReadError(
      `runtime configuration snapshot unavailable [${code}]: ${message}`,
    );
  });
  const context: RuntimeContext = Object.freeze({
    bootstrap,
    snapshot: entry.snapshot,
    config: buildServiceConfig(bootstrap, entry.snapshot),
  });
  return context;
}

let registerPromise: Promise<RuntimeContext> | null = null;
export function registerServerRuntime(): Promise<RuntimeContext> {
  if (registerPromise === null) {
    registerPromise = getServerRuntimeContext();
  }
  return registerPromise;
}
