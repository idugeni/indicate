import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { articleSites, articles, publishingState, taskStatus } from '@/data/schema/editorial';
import { organizations } from '@/data/schema/identity';

export const dispatchStatus = pgEnum('dispatch_status', ['pending', 'scheduled', 'leased', 'acknowledged', 'failed']);
export const replayClaimStatus = pgEnum('replay_claim_status', ['claimed', 'processed', 'rejected']);

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
};

export const publishingJobs = pgTable('publishing_jobs', {
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'restrict' }),
  id: uuid('id').notNull(),
  articleId: uuid('article_id').notNull(),
  idempotencyKey: text('idempotency_key').notNull(),
  fingerprint: text('fingerprint').notNull(),
  fingerprintVersion: integer('fingerprint_version').default(1).notNull(),
  state: publishingState('state').default('queued').notNull(),
  options: jsonb('options').$type<Record<string, unknown>>().default({}).notNull(),
  dispatchStatus: dispatchStatus('dispatch_status').default('pending').notNull(),
  dispatchAttempts: integer('dispatch_attempts').default(0).notNull(),
  nextDispatchAt: timestamp('next_dispatch_at', { withTimezone: true }).defaultNow().notNull(),
  leaseOwner: text('lease_owner'),
  leaseExpiresAt: timestamp('lease_expires_at', { withTimezone: true }),
  fencingToken: integer('fencing_token').default(0).notNull(),
  reconciliationClaimToken: uuid('reconciliation_claim_token'),
  reconciliationClaimExpiresAt: timestamp('reconciliation_claim_expires_at', { withTimezone: true }),
  finalizedAt: timestamp('finalized_at', { withTimezone: true }),
  version: integer('version').default(1).notNull(),
  ...timestamps,
}, (table) => [
  primaryKey({ name: 'publishing_jobs_pk', columns: [table.organizationId, table.id] }),
  unique('publishing_jobs_id_unique').on(table.id),
  unique('publishing_jobs_organization_idempotency_unique').on(table.organizationId, table.idempotencyKey),
  foreignKey({ name: 'publishing_jobs_article_fk', columns: [table.organizationId, table.articleId], foreignColumns: [articles.organizationId, articles.id] }).onDelete('restrict'),
  index('publishing_jobs_dispatch_due_idx').on(table.dispatchStatus, table.nextDispatchAt),
  index('publishing_jobs_state_lease_idx').on(table.state, table.leaseExpiresAt),
  index('publishing_jobs_reconciliation_claim_idx').on(table.dispatchStatus, table.reconciliationClaimExpiresAt),
  index('publishing_jobs_organization_date_idx').on(table.organizationId, table.createdAt),
  index('publishing_jobs_organization_state_idx').on(table.organizationId, table.state),
  check('publishing_jobs_bounded_fields', sql`${table.fingerprintVersion} > 0 AND ${table.dispatchAttempts} >= 0 AND ${table.fencingToken} >= 0 AND ${table.version} > 0`),
  check('publishing_jobs_idempotency_length', sql`length(${table.idempotencyKey}) BETWEEN 1 AND 200`),
]);

export const publishingJobTargets = pgTable('publishing_job_targets', {
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'restrict' }),
  id: uuid('id').notNull(),
  jobId: uuid('job_id').notNull(),
  articleSiteId: uuid('article_site_id').notNull(),
  state: publishingState('state').default('queued').notNull(),
  attempt: integer('attempt').default(0).notNull(),
  fencingToken: integer('fencing_token').default(0).notNull(),
  nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }).defaultNow().notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  publishedUrl: text('published_url'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  sanitizedError: jsonb('sanitized_error').$type<Record<string, unknown>>(),
  ...timestamps,
}, (table) => [
  primaryKey({ name: 'publishing_job_targets_pk', columns: [table.organizationId, table.id] }),
  unique('publishing_job_targets_id_unique').on(table.id),
  unique('publishing_job_targets_job_article_site_unique').on(table.organizationId, table.jobId, table.articleSiteId),
  foreignKey({ name: 'publishing_job_targets_job_fk', columns: [table.organizationId, table.jobId], foreignColumns: [publishingJobs.organizationId, publishingJobs.id] }).onDelete('cascade'),
  foreignKey({ name: 'publishing_job_targets_article_site_fk', columns: [table.organizationId, table.articleSiteId], foreignColumns: [articleSites.organizationId, articleSites.id] }).onDelete('restrict'),
  uniqueIndex('publishing_job_targets_active_article_site_unique').on(table.organizationId, table.articleSiteId).where(sql`${table.state} IN ('queued', 'processing', 'retrying')`),
  index('publishing_job_targets_job_state_idx').on(table.organizationId, table.jobId, table.state),
  index('publishing_job_targets_retry_due_idx').on(table.state, table.nextAttemptAt),
  check('publishing_job_targets_bounded_fields', sql`${table.attempt} >= 0 AND ${table.fencingToken} >= 0`),
  check('publishing_job_targets_published_outcome', sql`${table.state} <> 'published' OR (${table.publishedUrl} IS NOT NULL AND ${table.publishedAt} IS NOT NULL)`),
]);

export const publicationTransitionReceipts = pgTable('publication_transition_receipts', {
  organizationId: uuid('organization_id').notNull(),
  id: uuid('id').notNull(),
  transitionId: uuid('transition_id').notNull(),
  jobId: uuid('job_id').notNull(),
  targetId: uuid('target_id'),
  fromState: publishingState('from_state').notNull(),
  toState: publishingState('to_state').notNull(),
  fencingToken: integer('fencing_token').notNull(),
  acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }),
  reconciliationClaimToken: uuid('reconciliation_claim_token'),
  reconciliationClaimExpiresAt: timestamp('reconciliation_claim_expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  primaryKey({ name: 'publication_transition_receipts_pk', columns: [table.organizationId, table.id] }),
  unique('publication_transition_receipts_transition_unique').on(table.transitionId),
  foreignKey({ name: 'publication_transition_receipts_organization_fk', columns: [table.organizationId], foreignColumns: [organizations.id] }).onDelete('restrict'),
  foreignKey({ name: 'publication_transition_receipts_job_fk', columns: [table.organizationId, table.jobId], foreignColumns: [publishingJobs.organizationId, publishingJobs.id] }).onDelete('cascade'),
  foreignKey({ name: 'publication_transition_receipts_target_fk', columns: [table.organizationId, table.targetId], foreignColumns: [publishingJobTargets.organizationId, publishingJobTargets.id] }).onDelete('cascade'),
  index('publication_transition_receipts_unacknowledged_idx').on(table.acknowledgedAt),
  index('publication_transition_receipts_claim_idx').on(table.acknowledgedAt, table.reconciliationClaimExpiresAt),
]);

export const webhookReplayClaims = pgTable('webhook_replay_claims', {
  source: text('source').notNull(),
  replayId: text('replay_id').notNull(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'restrict' }),
  bodyDigest: text('body_digest').notNull(),
  identityBindingDigest: text('identity_binding_digest'),
  claimToken: uuid('claim_token').defaultRandom().notNull(),
  businessReceipt: jsonb('business_receipt').$type<Record<string, unknown>>(),
  status: replayClaimStatus('status').default('claimed').notNull(),
  pendingStatus: replayClaimStatus('pending_status'),
  outcomeReference: text('outcome_reference'),
  outcome: jsonb('outcome').$type<Record<string, unknown>>(),
  receivedAt: timestamp('received_at', { withTimezone: true }).defaultNow().notNull(),
  leaseExpiresAt: timestamp('lease_expires_at', { withTimezone: true }).notNull(),
  attemptCount: integer('attempt_count').default(1).notNull(),
  outcomeReadyAt: timestamp('outcome_ready_at', { withTimezone: true }),
  processedAt: timestamp('processed_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  primaryKey({ name: 'webhook_replay_claims_pk', columns: [table.source, table.replayId] }),
  index('webhook_replay_claims_expiry_idx').on(table.expiresAt),
  index('webhook_replay_claims_reconciliation_idx').on(table.status, table.pendingStatus, table.leaseExpiresAt),
  check('webhook_replay_claims_bounded_identity', sql`length(${table.source}) BETWEEN 1 AND 100 AND length(${table.replayId}) BETWEEN 1 AND 255 AND length(${table.bodyDigest}) = 64 AND (${table.identityBindingDigest} IS NULL OR length(${table.identityBindingDigest}) = 64) AND ${table.attemptCount} > 0`),
  check('webhook_replay_claims_pending_terminal', sql`${table.pendingStatus} IS NULL OR ${table.pendingStatus} IN ('processed', 'rejected')`),
]);

export const migrationMetadata = pgTable('indicate_schema_migrations', {
  version: integer('version').primaryKey(),
  name: text('name').notNull(),
  checksum: text('checksum').notNull(),
  appliedAt: timestamp('applied_at', { withTimezone: true }).defaultNow().notNull(),
});

export const migrationGateEvents = pgTable('migration_gate_events', {
  id: uuid('id').primaryKey(),
  requiredVersion: integer('required_version').notNull(),
  actualVersion: integer('actual_version'),
  status: taskStatus('status').notNull(),
  checkedAt: timestamp('checked_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  check('migration_gate_required_version_positive', sql`${table.requiredVersion} > 0`),
]);

/**
 * Formal litigation hold per organization (at most one active).
 *
 * @remarks Function-only: RLS enabled+forced with no grant to `indicate_runtime`.
 * Never query directly; use `indicate_private.hold_create/list/release` RPCs.
 */
export const litigationHolds = pgTable('litigation_holds', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  reason: text('reason').notNull(),
  heldBy: text('held_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  releasedAt: timestamp('released_at', { withTimezone: true }),
  releasedBy: text('released_by'),
}, (table) => [
  uniqueIndex('litigation_holds_active_org_unique').on(table.organizationId).where(sql`${table.releasedAt} IS NULL`),
]);

/**
 * Operational erasure queue per organization.
 *
 * @remarks Function-only: RLS enabled+forced with no grant to `indicate_runtime`.
 * Never query directly; use `indicate_private.erasure_request_create/list` + `erasure_sweep()` RPCs.
 */
export const orgErasureRequests = pgTable('org_erasure_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  requestedBy: text('requested_by').notNull(),
  reason: text('reason').notNull(),
  status: text('status').default('pending').notNull(),
  scheduledFor: timestamp('scheduled_for', { withTimezone: true }).notNull(),
  attempts: integer('attempts').default(0).notNull(),
  nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  proof: jsonb('proof').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('org_erasure_requests_due_idx').on(table.status, table.nextAttemptAt),
]);

/**
 * Retention sweep evidence log.
 *
 * @remarks Function-only: RLS enabled+forced with `retention_function_only` deny policy.
 * Read via `indicate_private.retention_list()`; written by `retention_sweep()`.
 * `organizationId` is per-org evidence for `erasure_sweep()` (migration 151);
 * historic global sweeps keep NULL.
 */
export const retentionRuns = pgTable('retention_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  category: text('category').notNull(),
  purgedCount: integer('purged_count').default(0).notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  finishedAt: timestamp('finished_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  check('retention_runs_count_nonnegative', sql`${table.purgedCount} >= 0`),
]);

