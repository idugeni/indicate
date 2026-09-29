import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { organizations } from '@/data/schema/identity';

export const aiCredentialStatus = pgEnum('ai_credential_status', ['active', 'inactive', 'disabled', 'exhausted', 'invalid', 'cooldown']);
export const aiRotationStrategy = pgEnum('ai_rotation_strategy', ['round_robin', 'random', 'least_used', 'lowest_error_rate', 'priority_based', 'health_aware']);

export const aiProviders = pgTable('ai_providers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  isActive: boolean('is_active').default(true).notNull(),
  isPrimary: boolean('is_primary').default(false).notNull(),
  priority: integer('priority').default(100).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  check('ai_providers_priority_nonnegative', sql`${table.priority} >= 0`),
]);

export const aiModels = pgTable('ai_models', {
  id: text('id').primaryKey(),
  providerId: text('provider_id').notNull().references(() => aiProviders.id, { onDelete: 'restrict' }),
  modelName: text('model_name').notNull(),
  displayName: text('display_name').notNull(),
  description: text('description'),
  contextWindow: integer('context_window').notNull(),
  inputTokenLimit: integer('input_token_limit'),
  outputTokenLimit: integer('output_token_limit'),
  supportedModalities: text('supported_modalities').array().notNull(),
  releaseStage: text('release_stage'),
  rpmLimit: integer('rpm_limit'),
  tpmLimit: integer('tpm_limit'),
  rpdLimit: integer('rpd_limit'),
  taskRecommendation: text('task_recommendation'),
  supportsTools: boolean('supports_tools').default(false).notNull(),
  supportsVision: boolean('supports_vision').default(false).notNull(),
  isDefault: boolean('is_default').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  priority: integer('priority').default(100).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique('ai_models_provider_model_unique').on(table.providerId, table.modelName),
  index('ai_models_provider_idx').on(table.providerId),
  check('ai_models_window_positive', sql`${table.contextWindow} > 0`),
  check('ai_models_priority_nonnegative', sql`${table.priority} >= 0`),
]);

export const aiCredentials = pgTable('ai_credentials', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  providerId: text('provider_id').notNull().references(() => aiProviders.id, { onDelete: 'restrict' }),
  label: text('label').notNull(),
  keyEncrypted: text('key_encrypted').notNull(),
  keyMasked: text('key_masked').notNull(),
  status: aiCredentialStatus('status').default('active').notNull(),
  priority: integer('priority').default(1).notNull(),
  weight: integer('weight').default(100).notNull(),
  cooldownUntil: timestamp('cooldown_until', { withTimezone: true }),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  lastSuccessAt: timestamp('last_success_at', { withTimezone: true }),
  lastFailureAt: timestamp('last_failure_at', { withTimezone: true }),
  lastErrorMessage: text('last_error_message'),
  lastErrorClass: text('last_error_class'),
  totalRequests: integer('total_requests').default(0).notNull(),
  successfulRequests: integer('successful_requests').default(0).notNull(),
  failedRequests: integer('failed_requests').default(0).notNull(),
  rateLimitCount: integer('rate_limit_count').default(0).notNull(),
  quotaExhaustedCount: integer('quota_exhausted_count').default(0).notNull(),
  avgLatencyMs: integer('avg_latency_ms').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('ai_credentials_provider_status_priority_idx').on(table.providerId, table.status, table.priority),
  index('ai_credentials_cooldown_idx').on(table.cooldownUntil),
  index('ai_credentials_org_provider_idx').on(table.organizationId, table.providerId),
  check('ai_credentials_label_length', sql`length(${table.label}) BETWEEN 1 AND 200`),
  check('ai_credentials_priority_positive', sql`${table.priority} >= 1`),
  check('ai_credentials_weight_nonnegative', sql`${table.weight} >= 0`),
  check('ai_credentials_counters_nonnegative', sql`${table.totalRequests} >= 0 AND ${table.successfulRequests} >= 0 AND ${table.failedRequests} >= 0 AND ${table.rateLimitCount} >= 0 AND ${table.quotaExhaustedCount} >= 0 AND ${table.avgLatencyMs} >= 0`),
]);

export const aiRoutingPolicies = pgTable('ai_routing_policies', {
  id: text('id').primaryKey(),
  rotationStrategy: aiRotationStrategy('rotation_strategy').default('health_aware').notNull(),
  primaryProviderId: text('primary_provider_id').references(() => aiProviders.id, { onDelete: 'restrict' }),
  fallbackProviderId: text('fallback_provider_id').references(() => aiProviders.id, { onDelete: 'restrict' }),
  defaultModel: text('default_model').notNull(),
  fallbackModel: text('fallback_model').notNull(),
  maxRetries: integer('max_retries').default(5).notNull(),
  perKeyRetryLimit: integer('per_key_retry_limit').default(2).notNull(),
  cooldownDurationSec: integer('cooldown_duration_sec').default(60).notNull(),
  requestTimeoutMs: integer('request_timeout_ms').default(60000).notNull(),
  globalConcurrencyLimit: integer('global_concurrency_limit').default(100).notNull(),
  version: integer('version').default(1).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  check('ai_routing_policies_singleton', sql`${table.id} = 'default'`),
  check('ai_routing_policies_retry_bounds', sql`${table.maxRetries} BETWEEN 1 AND 10 AND ${table.perKeyRetryLimit} BETWEEN 1 AND 5`),
  check('ai_routing_policies_cooldown_bounds', sql`${table.cooldownDurationSec} BETWEEN 10 AND 3600`),
  check('ai_routing_policies_timeout_bounds', sql`${table.requestTimeoutMs} BETWEEN 1000 AND 300000`),
  check('ai_routing_policies_concurrency_bounds', sql`${table.globalConcurrencyLimit} BETWEEN 1 AND 1000`),
  check('ai_routing_policies_version_positive', sql`${table.version} > 0`),
]);

export const aiRequestLogs = pgTable('ai_request_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  correlationId: text('correlation_id'),
  channel: text('channel').default('web').notNull(),
  providerId: text('provider_id').notNull(),
  modelName: text('model_name').notNull(),
  credentialId: uuid('credential_id').references(() => aiCredentials.id, { onDelete: 'set null' }),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'set null' }),
  status: text('status').notNull(),
  retryCount: integer('retry_count').default(0).notNull(),
  latencyMs: integer('latency_ms').default(0).notNull(),
  promptTokens: integer('prompt_tokens').default(0).notNull(),
  completionTokens: integer('completion_tokens').default(0).notNull(),
  totalTokens: integer('total_tokens').default(0).notNull(),
  toolsExecuted: text('tools_executed').array(),
  errorClass: text('error_class'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('ai_request_logs_created_status_idx').on(table.createdAt, table.status),
  index('ai_request_logs_credential_idx').on(table.credentialId),
  index('ai_request_logs_org_created_idx').on(table.organizationId, table.createdAt.desc()),
  check('ai_request_logs_status_known', sql`${table.status} IN ('success', 'failed', 'blocked')`),
  check('ai_request_logs_counters_nonnegative', sql`${table.retryCount} >= 0 AND ${table.latencyMs} >= 0 AND ${table.promptTokens} >= 0 AND ${table.completionTokens} >= 0 AND ${table.totalTokens} >= 0`),
]);

export const aiQueryInsights = pgTable('ai_query_insights', {
  id: uuid('id').primaryKey().defaultRandom(),
  query: text('query').notNull(),
  channel: text('channel').default('web').notNull(),
  status: text('status').default('open').notNull(),
  feedbackReason: text('feedback_reason'),
  modelUsed: text('model_used'),
  suggestedAction: text('suggested_action'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('ai_query_insights_created_idx').on(table.createdAt),
  index('ai_query_insights_status_idx').on(table.status),
  check('ai_query_insights_query_length', sql`length(${table.query}) BETWEEN 1 AND 1000`),
]);

export const aiMasterSecrets = pgTable('ai_master_secrets', {
  id: uuid('id').primaryKey().defaultRandom(),
  secret: text('secret').notNull(),
  version: integer('version').default(1).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  rotatedAt: timestamp('rotated_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('ai_master_secrets_single_active_unique').on(table.isActive).where(sql`${table.isActive} = true`),
  check('ai_master_secrets_secret_length', sql`length(${table.secret}) >= 32`),
  check('ai_master_secrets_version_positive', sql`${table.version} > 0`),
]);
