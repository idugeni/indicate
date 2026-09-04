import { sql } from 'drizzle-orm';
import {
  bigint,
  check,
  foreignKey,
  integer,
  index,
  pgEnum,
  pgSchema,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

export const runtimeConfigEnvironment = pgEnum('runtime_config_environment', ['development', 'test', 'production']);
export const runtimeConfigMutationKind = pgEnum('runtime_config_mutation_kind', [
  'shared_deployment_config',
  'media_policy',
  'publication_policy',
  'webhook_policy',
  'cache_policy',
  'rate_limit_policy',
  'domain_provider_mapping',
  'site_settings',
]);
export const rateLimitEndpointClass = pgEnum('rate_limit_endpoint_class', ['mutation', 'webhook', 'public_read']);
export const invalidationPartitionKind = pgEnum('invalidation_partition_kind', ['shared', 'domain', 'site', 'policy', 'all']);
export const configAuditOutcome = pgEnum('config_audit_outcome', ['succeeded', 'denied', 'conflicted', 'failed']);
export const configAuditActorType = pgEnum('config_audit_actor_type', ['user', 'api_key', 'telegram', 'system', 'migration']);
export const seoRobotsDirective = pgEnum('seo_robots_directive', ['index,follow', 'noindex,nofollow']);

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
};

/** One row per successful configuration mutation transaction; latest per env is the snapshot's configuration version. */
export const runtimeConfigRevisions = pgTable('runtime_config_revisions', {
  version: bigint('version', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  environment: runtimeConfigEnvironment('environment').notNull(),
  committedAt: timestamp('committed_at', { withTimezone: true }).notNull(),
  mutationKind: runtimeConfigMutationKind('mutation_kind').notNull(),
}, (table) => [
  index('runtime_config_revisions_environment_idx').on(table.environment),
]);

/** Singleton deployment metadata; fixed key constrains to one row, allowlisted non-secret IDs only. */
export const sharedDeploymentConfig = pgTable('shared_deployment_config', {
  id: text('id').primaryKey(),
  supabaseProjectRef: text('supabase_project_ref').notNull(),
  cloudflareAccountId: text('cloudflare_account_id').notNull(),
  vercelProjectId: text('vercel_project_id').notNull(),
  vercelTeamId: text('vercel_team_id').notNull(),
  vercelProductionTargetHostname: text('vercel_production_target_hostname').notNull(),
  r2AccountId: text('r2_account_id').notNull(),
  r2BucketName: text('r2_bucket_name').notNull(),
  upstashRedisResourceId: text('upstash_redis_resource_id').notNull(),
  version: integer('version').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
}, (table) => [
  check('shared_deployment_config_version_positive', sql`${table.version} > 0`),
  check('shared_deployment_config_singleton', sql`${table.id} = 'singleton'`),
]);

const singletonKey = text('singleton_key').primaryKey();

export const mediaPolicy = pgTable('media_policy', {
  id: singletonKey,
  allowedMimeTypes: text('allowed_mime_types').array().notNull(),
  maxObjectBytes: integer('max_object_bytes').notNull(),
  uploadAuthorizationSeconds: integer('upload_authorization_seconds').notNull(),
  readAuthorizationSeconds: integer('read_authorization_seconds').notNull(),
  version: integer('version').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
}, (table) => [
  check('media_policy_version_positive', sql`${table.version} > 0`),
  check('media_policy_max_bytes_positive', sql`${table.maxObjectBytes} > 0`),
  check('media_policy_upload_positive', sql`${table.uploadAuthorizationSeconds} > 0`),
  check('media_policy_read_positive', sql`${table.readAuthorizationSeconds} > 0`),
  check('media_policy_mime_nonempty', sql`cardinality(${table.allowedMimeTypes}) > 0`),
]);

export const publicationPolicy = pgTable('publication_policy', {
  id: singletonKey,
  maxAttempts: integer('max_attempts').notNull(),
  retryDelaysSeconds: integer('retry_delays_seconds').array().notNull(),
  leaseSeconds: integer('lease_seconds').notNull(),
  batchSize: integer('batch_size').notNull(),
  functionDeadlineSeconds: integer('function_deadline_seconds').notNull(),
  version: integer('version').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
}, (table) => [
  check('publication_policy_max_attempts_bounds', sql`${table.maxAttempts} BETWEEN 1 AND 10`),
  check('publication_policy_lease_bounds', sql`${table.leaseSeconds} BETWEEN 10 AND 300`),
  check('publication_policy_batch_bounds', sql`${table.batchSize} BETWEEN 1 AND 100`),
  check('publication_policy_deadline_bounds', sql`${table.functionDeadlineSeconds} BETWEEN 10 AND 300`),
  check('publication_policy_retry_count', sql`cardinality(${table.retryDelaysSeconds}) <= ${table.maxAttempts} - 1`),
  // Per-element retry bounds live in a trigger (scalar CHECK cannot constrain array elements).
]);

export const webhookPolicy = pgTable('webhook_policy', {
  id: singletonKey,
  freshnessSeconds: integer('freshness_seconds').notNull(),
  replayRetentionSeconds: integer('replay_retention_seconds').notNull(),
  version: integer('version').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
}, (table) => [
  check('webhook_policy_freshness_bounds', sql`${table.freshnessSeconds} BETWEEN 1 AND 900`),
  check('webhook_policy_replay_bounds', sql`${table.replayRetentionSeconds} BETWEEN 1 AND 86400`),
  check('webhook_policy_replay_ge_freshness', sql`${table.replayRetentionSeconds} >= ${table.freshnessSeconds}`),
]);

export const cachePolicy = pgTable('cache_policy', {
  id: singletonKey,
  publicCacheSeconds: integer('public_cache_seconds').notNull(),
  cacheVersion: integer('cache_version').notNull(),
  version: integer('version').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
}, (table) => [
  check('cache_policy_public_cache_bounds', sql`${table.publicCacheSeconds} BETWEEN 0 AND 3600`),
  check('cache_policy_cache_version_positive', sql`${table.cacheVersion} > 0`),
]);

export const rateLimitPolicies = pgTable('rate_limit_policies', {
  endpointClass: rateLimitEndpointClass('endpoint_class').primaryKey(),
  allowance: integer('allowance').notNull(),
  windowSeconds: integer('window_seconds').notNull(),
  version: integer('version').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
}, (table) => [
  check('rate_limit_policies_allowance_positive', sql`${table.allowance} > 0`),
  check('rate_limit_policies_window_bounds', sql`${table.windowSeconds} BETWEEN 1 AND 3600`),
  check('rate_limit_policies_version_positive', sql`${table.version} > 0`),
  check('rate_limit_policies_mutation_cap', sql`${table.endpointClass} <> 'mutation' OR ${table.allowance} <= 1000`),
  check('rate_limit_policies_webhook_cap', sql`${table.endpointClass} <> 'webhook' OR ${table.allowance} <= 2000`),
  check('rate_limit_policies_public_read_cap', sql`${table.endpointClass} <> 'public_read' OR ${table.allowance} <= 10000`),
]);

/** Append-only configuration audit log. No before/after raw values stored. */
export const runtimeConfigAuditLogs = pgTable('runtime_config_audit_logs', {
  id: uuid('id').primaryKey(),
  organizationId: uuid('organization_id'),
  actorType: configAuditActorType('actor_type').notNull(),
  actorId: uuid('actor_id'),
  environment: runtimeConfigEnvironment('environment').notNull(),
  action: text('action').notNull(),
  targetType: text('target_type').notNull(),
  targetId: uuid('target_id'),
  expectedVersion: integer('expected_version'),
  resultingVersion: integer('resulting_version'),
  changedFields: text('changed_fields').array().notNull(),
  outcome: configAuditOutcome('outcome').notNull(),
  requestId: text('request_id'),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('runtime_config_audit_org_time_idx').on(table.organizationId, table.occurredAt),
]);

/** Durable invalidation intent committed with a configuration mutation. */
export const runtimeConfigInvalidationIntents = pgTable('runtime_config_invalidation_intents', {
  id: uuid('id').primaryKey(),
  runtimeRevision: bigint('runtime_revision', { mode: 'number' }).notNull(),
  environment: runtimeConfigEnvironment('environment').notNull(),
  partitionKind: invalidationPartitionKind('partition_kind').notNull(),
  organizationId: uuid('organization_id'),
  domainId: uuid('domain_id'),
  siteId: uuid('site_id'),
  status: text('status').notNull().default('pending'),
  attempts: integer('attempts').notNull().default(0),
  nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }),
  claimToken: uuid('claim_token'),
  claimExpiresAt: timestamp('claim_expires_at', { withTimezone: true }),
  failureCategory: text('failure_category'),
  ...timestamps,
}, (table) => [
  unique('runtime_config_invalidation_unique').on(table.runtimeRevision, table.partitionKind, table.organizationId, table.domainId, table.siteId),
  check('runtime_config_invalidation_attempts_nonnegative', sql`${table.attempts} >= 0`),
]);

/** Immutable rollout manifest header (parity/cutover tooling). */
export const runtimeConfigReleaseManifests = pgTable('runtime_config_release_manifests', {
  id: uuid('id').primaryKey(),
  grammarVersion: integer('grammar_version').notNull(),
  parityStart: timestamp('parity_start', { withTimezone: true }).notNull(),
  parityEnd: timestamp('parity_end', { withTimezone: true }).notNull(),
  legacySourceVersion: text('legacy_source_version').notNull(),
  expectedSourceCount: integer('expected_source_count').notNull(),
  targetSchemaVersion: integer('target_schema_version').notNull(),
  candidateAppVersion: text('candidate_app_version').notNull(),
  rollbackAppVersion: text('rollback_app_version').notNull(),
  rollbackSchemaMin: integer('rollback_schema_min').notNull(),
  rollbackSchemaMax: integer('rollback_schema_max').notNull(),
  status: text('status').notNull().default('proposed'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check('runtime_config_release_manifests_parity_window', sql`${table.parityEnd} - ${table.parityStart} <= interval '7 days'`),
  check('runtime_config_release_manifests_grammar_positive', sql`${table.grammarVersion} > 0`),
  check('runtime_config_release_manifests_source_positive', sql`${table.expectedSourceCount} > 0`),
  check('runtime_config_release_manifests_schema_bounds', sql`${table.rollbackSchemaMax} >= ${table.rollbackSchemaMin}`),
]);

/** Explicit Domain-to-zone mapping rows, immutable after insert. */
export const runtimeConfigReleaseDomainZones = pgTable('runtime_config_release_domain_zones', {
  manifestId: uuid('manifest_id').notNull(),
  domainId: uuid('domain_id').notNull(),
  zoneId: text('zone_id').notNull(),
}, (table) => [
  primaryKey({ name: 'runtime_config_release_domain_zones_pk', columns: [table.manifestId, table.domainId] }),
  foreignKey({ name: 'runtime_config_release_domain_zones_manifest_fk', columns: [table.manifestId], foreignColumns: [runtimeConfigReleaseManifests.id] }).onDelete('cascade'),
  unique('runtime_config_release_domain_zones_zone_unique').on(table.zoneId),
]);

/** Backfill run accounting; counts satisfy created+updated+unchanged+conflicted+failed = processed. */
export const runtimeConfigBackfillRuns = pgTable('runtime_config_backfill_runs', {
  id: uuid('id').primaryKey(),
  manifestId: uuid('manifest_id').notNull(),
  sourceVersion: text('source_version').notNull(),
  schemaVersion: integer('schema_version').notNull(),
  createdCount: integer('created_count').notNull(),
  updatedCount: integer('updated_count').notNull(),
  unchangedCount: integer('unchanged_count').notNull(),
  conflictedCount: integer('conflicted_count').notNull(),
  failedCount: integer('failed_count').notNull(),
  processedCount: integer('processed_count').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
}, (table) => [
  check('runtime_config_backfill_created_nonnegative', sql`${table.createdCount} >= 0`),
  check('runtime_config_backfill_sum', sql`${table.createdCount} + ${table.updatedCount} + ${table.unchangedCount} + ${table.conflictedCount} + ${table.failedCount} = ${table.processedCount}`),
  foreignKey({ name: 'runtime_config_backfill_runs_manifest_fk', columns: [table.manifestId], foreignColumns: [runtimeConfigReleaseManifests.id] }).onDelete('cascade'),
]);

/** Parity evidence rows: metadata + categories only, never raw values. */
export const runtimeConfigParityEvidence = pgTable('runtime_config_parity_evidence', {
  id: uuid('id').primaryKey(),
  manifestId: uuid('manifest_id').notNull(),
  checkName: text('check_name').notNull(),
  sourceVersion: text('source_version').notNull(),
  persistedVersion: integer('persisted_version').notNull(),
  authorizedTargetId: uuid('authorized_target_id'),
  category: text('category').notNull(),
  recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull().defaultNow(),
  ...timestamps,
}, (table) => [
  foreignKey({ name: 'runtime_config_parity_evidence_manifest_fk', columns: [table.manifestId], foreignColumns: [runtimeConfigReleaseManifests.id] }).onDelete('cascade'),
]);

export const indicatePrivate = pgSchema('indicate_private');

// Drizzle requires one declaration per schema; indicate_private functions live in migrations.
void indicatePrivate;