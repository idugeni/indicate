import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  date,
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
  uuid,
} from 'drizzle-orm/pg-core';

import { domains, memberships, organizations, recordStatus, regions, sites } from '@/data/schema/identity';
import { seoRobotsDirective } from '@/data/schema/runtime-config';

export const publisherType = pgEnum('publisher_type', [
  'government_institution',
  'correctional_institution',
  'public_relations_office',
  'company',
  'organization',
  'community',
  'independent_publisher',
]);
export const publisherVerificationStatus = pgEnum('publisher_verification_status', ['unverified', 'pending', 'verified', 'rejected']);
export const articleStatus = pgEnum('article_status', ['draft', 'in_review', 'scheduled', 'active', 'archived']);
export const publishingState = pgEnum('publishing_state', ['queued', 'processing', 'published', 'failed', 'retrying', 'unpublished']);
export const mediaState = pgEnum('media_state', ['reserved', 'active', 'rejected', 'archived']);
export const reportStatus = pgEnum('report_status', ['received', 'under_review', 'action_taken', 'rejected']);
export const reservationStatus = pgEnum('reservation_status', ['reserved', 'used', 'occupied', 'expired']);
export const taskStatus = pgEnum('task_status', ['pending', 'processing', 'completed', 'failed']);
export const auditActorType = pgEnum('audit_actor_type', ['user', 'api_key', 'telegram', 'system']);
export const auditEntryPoint = pgEnum('audit_entry_point', ['dashboard', 'api', 'telegram', 'worker', 'reconciler']);
export const auditOutcome = pgEnum('audit_outcome', ['succeeded', 'denied', 'failed']);
export const activationOperation = pgEnum('activation_operation', ['activate', 'deactivate']);

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
};

export const publishers = pgTable('publishers', {
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'restrict' }),
  id: uuid('id').notNull(),
  name: text('name').notNull(),
  type: publisherType('type').notNull(),
  verificationStatus: publisherVerificationStatus('verification_status').default('unverified').notNull(),
  attributionLabel: text('attribution_label').notNull(),
  contacts: jsonb('contacts').$type<Record<string, unknown>>().default({}).notNull(),
  evidenceReference: text('evidence_reference'),
  submittedBy: uuid('submitted_by'),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  verifiedBy: uuid('verified_by'),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  rejectionReason: text('rejection_reason'),
  status: recordStatus('status').default('active').notNull(),
  version: integer('version').default(1).notNull(),
  ...timestamps,
}, (table) => [
  primaryKey({ name: 'publishers_pk', columns: [table.organizationId, table.id] }),
  unique('publishers_id_unique').on(table.id),
  foreignKey({ name: 'publishers_submitter_membership_fk', columns: [table.organizationId, table.submittedBy], foreignColumns: [memberships.organizationId, memberships.userId] }).onDelete('restrict'),
  foreignKey({ name: 'publishers_verifier_membership_fk', columns: [table.organizationId, table.verifiedBy], foreignColumns: [memberships.organizationId, memberships.userId] }).onDelete('restrict'),
  index('publishers_organization_status_type_idx').on(table.organizationId, table.status, table.type),
  check('publishers_version_positive', sql`${table.version} > 0`),
]);

export const categories = pgTable('categories', {
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'restrict' }),
  id: uuid('id').notNull(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  status: recordStatus('status').default('active').notNull(),
  version: integer('version').default(1).notNull(),
  ...timestamps,
}, (table) => [
  primaryKey({ name: 'categories_pk', columns: [table.organizationId, table.id] }),
  unique('categories_id_unique').on(table.id),
  unique('categories_organization_slug_unique').on(table.organizationId, table.slug),
  index('categories_organization_status_idx').on(table.organizationId, table.status),
]);

export const authors = pgTable('authors', {
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'restrict' }),
  id: uuid('id').notNull(),
  displayName: text('display_name').notNull(),
  byline: text('byline').notNull(),
  bio: text('bio'),
  avatarUrl: text('avatar_url'),
  websiteUrl: text('website_url'),
  status: recordStatus('status').default('active').notNull(),
  version: integer('version').default(1).notNull(),
  ...timestamps,
}, (table) => [
  primaryKey({ name: 'authors_pk', columns: [table.organizationId, table.id] }),
  unique('authors_id_unique').on(table.id),
  index('authors_organization_status_name_idx').on(table.organizationId, table.status, table.displayName),
  check('authors_bio_length', sql`(${table.bio} IS NULL OR (char_length(${table.bio}) BETWEEN 1 AND 2000))`),
  check('authors_avatar_shape', sql`(${table.avatarUrl} IS NULL OR (${table.avatarUrl} LIKE '/%' OR ${table.avatarUrl} LIKE 'https://%'))`),
]);

export const articles = pgTable('articles', {
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'restrict' }),
  id: uuid('id').notNull(),
  regionId: uuid('region_id').notNull(),
  publisherId: uuid('publisher_id'),
  categoryId: uuid('category_id'),
  authorId: uuid('author_id'),
  leadMediaId: uuid('lead_media_id'),
  /** External cover URL (e.g. editorial hotlink); used when no R2 media exists. */
  coverImageUrl: text('cover_image_url'),
  slug: text('slug').notNull(),
  title: text('title').notNull(),
  /** Optional subheadline shown under the headline. */
  dek: text('dek'),
  /** Optional explicit excerpt; falls back to a body-derived excerpt. */
  excerpt: text('excerpt'),
  /** Optional canonical URL override; defaults to the tenant article URL. */
  canonicalUrl: text('canonical_url'),
  body: text('body').notNull(),
  source: text('source').notNull(),
  tags: text('tags').array().default(sql`ARRAY[]::text[]`).notNull(),
  status: articleStatus('status').default('draft').notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  /** Optional embargo/scheduled date; enforced by the publishing scheduler. */
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  version: integer('version').default(1).notNull(),
  ...timestamps,
}, (table) => [
  primaryKey({ name: 'articles_pk', columns: [table.organizationId, table.id] }),
  unique('articles_id_unique').on(table.id),
  unique('articles_organization_slug_unique').on(table.organizationId, table.slug),
  foreignKey({ name: 'articles_region_fk', columns: [table.organizationId, table.regionId], foreignColumns: [regions.organizationId, regions.id] }).onDelete('restrict'),
  foreignKey({ name: 'articles_publisher_fk', columns: [table.organizationId, table.publisherId], foreignColumns: [publishers.organizationId, publishers.id] }).onDelete('restrict'),
  foreignKey({ name: 'articles_category_fk', columns: [table.organizationId, table.categoryId], foreignColumns: [categories.organizationId, categories.id] }).onDelete('restrict'),
  foreignKey({ name: 'articles_author_fk', columns: [table.organizationId, table.authorId], foreignColumns: [authors.organizationId, authors.id] }).onDelete('restrict'),
  index('articles_organization_status_date_idx').on(table.organizationId, table.status, table.publishedAt),
  index('articles_organization_region_idx').on(table.organizationId, table.regionId),
  index('articles_organization_category_idx').on(table.organizationId, table.categoryId),
  index('articles_organization_lead_media_idx').on(table.organizationId, table.leadMediaId).where(sql`${table.leadMediaId} IS NOT NULL`),
  check('articles_version_positive', sql`${table.version} > 0`),
]);

/**
 * Immutable content snapshots for diffing and rollback.
 *
 * @remarks One row per saved content version; written by the dashboard commit path on create and on content changes.
 */
export const articleRevisions = pgTable('article_revisions', {
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'restrict' }),
  id: uuid('id').notNull().defaultRandom(),
  articleId: uuid('article_id').notNull(),
  revisionNumber: integer('revision_number').notNull(),
  title: text('title').notNull(),
  dek: text('dek'),
  body: text('body').notNull(),
  snapshot: jsonb('snapshot').$type<Record<string, unknown>>().default({}).notNull(),
  createdBy: text('created_by').notNull(),
  ...timestamps,
}, (table) => [
  primaryKey({ name: 'article_revisions_pk', columns: [table.organizationId, table.id] }),
  unique('article_revisions_id_unique').on(table.id),
  unique('article_revisions_organization_article_number_unique').on(table.organizationId, table.articleId, table.revisionNumber),
  foreignKey({ name: 'article_revisions_article_fk', columns: [table.organizationId, table.articleId], foreignColumns: [articles.organizationId, articles.id] }).onDelete('restrict'),
  index('article_revisions_organization_article_idx').on(table.organizationId, table.articleId, table.revisionNumber),
  check('article_revisions_number_positive', sql`${table.revisionNumber} > 0`),
]);

export const articleSites = pgTable('article_sites', {
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'restrict' }),
  id: uuid('id').notNull(),
  articleId: uuid('article_id').notNull(),
  siteId: uuid('site_id').notNull(),
  state: publishingState('state').default('queued').notNull(),
  stateOccurredAt: timestamp('state_occurred_at', { withTimezone: true }).defaultNow().notNull(),
  publishedUrl: text('published_url'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  sanitizedFailure: jsonb('sanitized_failure').$type<Record<string, unknown>>(),
  attempt: integer('attempt').default(0).notNull(),
  version: integer('version').default(1).notNull(),
  active: boolean('active').default(true).notNull(),
  customTitle: text('custom_title'),
  customDescription: text('custom_description'),
  customImageMediaId: uuid('custom_image_media_id'),
  viewCount: integer('view_count').default(0).notNull(),
  ...timestamps,
}, (table) => [
  primaryKey({ name: 'article_sites_pk', columns: [table.organizationId, table.id] }),
  unique('article_sites_id_unique').on(table.id),
  unique('article_sites_organization_article_site_unique').on(table.organizationId, table.articleId, table.siteId),
  foreignKey({ name: 'article_sites_article_fk', columns: [table.organizationId, table.articleId], foreignColumns: [articles.organizationId, articles.id] }).onDelete('restrict'),
  foreignKey({ name: 'article_sites_site_fk', columns: [table.organizationId, table.siteId], foreignColumns: [sites.organizationId, sites.id] }).onDelete('restrict'),
  index('article_sites_site_state_date_idx').on(table.organizationId, table.siteId, table.state, table.publishedAt),
  index('article_sites_outcome_date_idx').on(table.organizationId, table.siteId, table.state, table.stateOccurredAt),
  index('article_sites_organization_state_idx').on(table.organizationId, table.state),
  check('article_sites_attempt_nonnegative', sql`${table.attempt} >= 0 AND ${table.version} > 0`),
  check('article_sites_view_counts_nonnegative', sql`${table.viewCount} >= 0`),
  check('article_sites_custom_title_shape', sql`${table.customTitle} IS NULL OR (char_length(${table.customTitle}) BETWEEN 10 AND 160)`),
  check('article_sites_custom_description_shape', sql`${table.customDescription} IS NULL OR (char_length(${table.customDescription}) BETWEEN 50 AND 500)`),
  check('article_sites_published_outcome', sql`${table.state} <> 'published' OR (${table.publishedUrl} IS NOT NULL AND ${table.publishedAt} IS NOT NULL)`),
]);

export const articleSiteViewDays = pgTable('article_site_view_days', {
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'restrict' }),
  articleSiteId: uuid('article_site_id').notNull(),
  siteId: uuid('site_id').notNull(),
  day: date('day').notNull(),
  views: integer('views').default(0).notNull(),
}, (table) => [
  primaryKey({ name: 'article_site_view_days_pk', columns: [table.organizationId, table.articleSiteId, table.day] }),
  index('article_site_view_days_organization_day_idx').on(table.organizationId, table.day.desc()),
  check('article_site_view_days_views_nonnegative', sql`${table.views} >= 0`),
]);

export const officialAffiliations = pgTable('official_affiliations', {
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'restrict' }),
  id: uuid('id').notNull(),
  publisherId: uuid('publisher_id').notNull(),
  siteId: uuid('site_id').notNull(),
  institutionName: text('institution_name').notNull(),
  claimScopes: text('claim_scopes').array().notNull(),
  evidenceReference: text('evidence_reference').notNull(),
  active: boolean('active').default(false).notNull(),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  version: integer('version').default(1).notNull(),
  ...timestamps,
}, (table) => [
  primaryKey({ name: 'official_affiliations_pk', columns: [table.organizationId, table.id] }),
  foreignKey({ name: 'official_affiliations_publisher_fk', columns: [table.organizationId, table.publisherId], foreignColumns: [publishers.organizationId, publishers.id] }).onDelete('restrict'),
  foreignKey({ name: 'official_affiliations_site_fk', columns: [table.organizationId, table.siteId], foreignColumns: [sites.organizationId, sites.id] }).onDelete('restrict'),
  unique('official_affiliations_org_publisher_site_institution_unique').on(table.organizationId, table.publisherId, table.siteId, table.institutionName),
  index('official_affiliations_active_idx').on(table.organizationId, table.publisherId, table.siteId, table.active),
]);

export const media = pgTable('media', {
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'restrict' }),
  id: uuid('id').notNull(),
  objectKey: text('object_key').notNull(),
  purpose: text('purpose').notNull(),
  mediaType: text('media_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  checksum: text('checksum').notNull(),
  thumbObjectKey: text('thumb_object_key'),
  /** UU Hak Cipta attribution obligation (migration v76); optional pre-fill. */
  licenseSource: text('license_source'),
  attribution: text('attribution'),
  state: mediaState('state').default('reserved').notNull(),
  articleId: uuid('article_id'),
  siteId: uuid('site_id'),
  organizationAsset: boolean('organization_asset').default(false).notNull(),
  version: integer('version').default(1).notNull(),
  ...timestamps,
}, (table) => [
  primaryKey({ name: 'media_pk', columns: [table.organizationId, table.id] }),
  unique('media_id_unique').on(table.id),
  unique('media_object_key_unique').on(table.objectKey),
  foreignKey({ name: 'media_article_fk', columns: [table.organizationId, table.articleId], foreignColumns: [articles.organizationId, articles.id] }).onDelete('restrict'),
  foreignKey({ name: 'media_site_fk', columns: [table.organizationId, table.siteId], foreignColumns: [sites.organizationId, sites.id] }).onDelete('restrict'),
  check('media_exactly_one_owner', sql`num_nonnulls(${table.articleId}, ${table.siteId}) + CASE WHEN ${table.organizationAsset} THEN 1 ELSE 0 END = 1`),
  check('media_owner_prefix', sql`(
    (${table.articleId} IS NOT NULL AND ${table.objectKey} LIKE ('articles/' || ${table.articleId}::text || '/%'))
    OR (${table.siteId} IS NOT NULL AND ${table.objectKey} LIKE ('sites/' || ${table.siteId}::text || '/%'))
    OR (${table.organizationAsset} AND ${table.objectKey} LIKE 'assets/%')
  )`),
  check('media_size_positive', sql`${table.sizeBytes} > 0 AND ${table.version} > 0`),
  index('media_organization_state_idx').on(table.organizationId, table.state),
]);

/**
 * Store per-site display settings.
 *
 * @remarks Nullable during backfill; required for active Sites.
 */
export const siteSettings = pgTable('site_settings', {
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'restrict' }),
  siteId: uuid('site_id').notNull(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  tagline: text('tagline'),
  colors: jsonb('colors').$type<Record<string, string>>().default({}).notNull(),
  socialLinks: jsonb('social_links').$type<Record<string, string>>().default({}).notNull(),
  seo: jsonb('seo').$type<Record<string, unknown>>().default({}).notNull(),
  navigation: jsonb('navigation').$type<readonly Record<string, unknown>[]>().default([]).notNull(),
  logoMediaId: uuid('logo_media_id'),
  faviconMediaId: uuid('favicon_media_id'),
  defaultMediaId: uuid('default_media_id'),
  locale: text('locale'),
  seoDefaultTitle: text('seo_default_title'),
  seoDefaultDescription: text('seo_default_description'),
  seoRobotsDirective: seoRobotsDirective('seo_robots_directive'),
  seoOpenGraphSiteName: text('seo_open_graph_site_name'),
  seoSchemaVersion: integer('seo_schema_version'),
  version: integer('version').default(1).notNull(),
  ...timestamps,
}, (table) => [
  primaryKey({ name: 'site_settings_pk', columns: [table.organizationId, table.siteId] }),
  foreignKey({ name: 'site_settings_site_fk', columns: [table.organizationId, table.siteId], foreignColumns: [sites.organizationId, sites.id] }).onDelete('cascade'),
  foreignKey({ name: 'site_settings_logo_media_fk', columns: [table.organizationId, table.logoMediaId], foreignColumns: [media.organizationId, media.id] }).onDelete('restrict'),
  foreignKey({ name: 'site_settings_favicon_media_fk', columns: [table.organizationId, table.faviconMediaId], foreignColumns: [media.organizationId, media.id] }).onDelete('restrict'),
  foreignKey({ name: 'site_settings_default_media_fk', columns: [table.organizationId, table.defaultMediaId], foreignColumns: [media.organizationId, media.id] }).onDelete('restrict'),
  check('site_settings_version_positive', sql`${table.version} > 0`),
  check('site_settings_locale_shape', sql`${table.locale} IS NULL OR ${table.locale} ~ '^[a-z]{2}-[A-Z]{2}$'`),
  check('site_settings_seo_schema_version_bounds', sql`${table.seoSchemaVersion} IS NULL OR (${table.seoSchemaVersion} >= 1 AND ${table.seoSchemaVersion} <= 2147483647)`),
]);

export const mediaKeyReservations = pgTable('media_key_reservations', {
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'restrict' }),
  id: uuid('id').notNull(),
  objectKey: text('object_key').notNull(),
  purpose: text('purpose').notNull(),
  articleId: uuid('article_id'),
  siteId: uuid('site_id'),
  organizationAsset: boolean('organization_asset').default(false).notNull(),
  expectedMediaType: text('expected_media_type').notNull(),
  expectedSizeBytes: integer('expected_size_bytes').notNull(),
  expectedChecksum: text('expected_checksum').notNull(),
  status: reservationStatus('status').default('reserved').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ...timestamps,
}, (table) => [
  primaryKey({ name: 'media_key_reservations_pk', columns: [table.organizationId, table.id] }),
  unique('media_key_reservations_object_key_unique').on(table.objectKey),
  foreignKey({ name: 'media_key_reservations_article_fk', columns: [table.organizationId, table.articleId], foreignColumns: [articles.organizationId, articles.id] }).onDelete('restrict'),
  foreignKey({ name: 'media_key_reservations_site_fk', columns: [table.organizationId, table.siteId], foreignColumns: [sites.organizationId, sites.id] }).onDelete('restrict'),
  check('media_key_reservation_exactly_one_owner', sql`num_nonnulls(${table.articleId}, ${table.siteId}) + CASE WHEN ${table.organizationAsset} THEN 1 ELSE 0 END = 1`),
  check('media_key_reservation_owner_prefix', sql`(
    (${table.articleId} IS NOT NULL AND ${table.objectKey} LIKE ('articles/' || ${table.articleId}::text || '/%'))
    OR (${table.siteId} IS NOT NULL AND ${table.objectKey} LIKE ('sites/' || ${table.siteId}::text || '/%'))
    OR (${table.organizationAsset} AND ${table.objectKey} LIKE 'assets/%')
  )`),
  check('media_key_reservation_size_positive', sql`${table.expectedSizeBytes} > 0`),
  check('media_key_reservation_sha256_checksum', sql`${table.expectedChecksum} ~ '^[A-Za-z0-9+/]{43}=$'`),
  index('media_key_reservations_expiry_status_idx').on(table.status, table.expiresAt),
]);

export const objectCleanupTasks = pgTable('object_cleanup_tasks', {
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'restrict' }),
  id: uuid('id').notNull(),
  objectKey: text('object_key').notNull(),
  reason: text('reason').notNull(),
  status: taskStatus('status').default('pending').notNull(),
  attempts: integer('attempts').default(0).notNull(),
  nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }).defaultNow().notNull(),
  reconciliationClaimToken: uuid('reconciliation_claim_token'),
  reconciliationClaimExpiresAt: timestamp('reconciliation_claim_expires_at', { withTimezone: true }),
  sanitizedFailure: jsonb('sanitized_failure').$type<Record<string, unknown>>(),
  ...timestamps,
}, (table) => [
  primaryKey({ name: 'object_cleanup_tasks_pk', columns: [table.organizationId, table.id] }),
  index('object_cleanup_tasks_due_idx').on(table.status, table.nextAttemptAt),
  index('object_cleanup_tasks_claim_idx').on(table.status, table.reconciliationClaimExpiresAt),
  check('object_cleanup_tasks_attempts_nonnegative', sql`${table.attempts} >= 0`),
]);

export const auditLogs = pgTable('audit_logs', {
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'restrict' }),
  id: uuid('id').notNull(),
  actorType: auditActorType('actor_type').notNull(),
  actorId: text('actor_id').notNull(),
  entryPoint: auditEntryPoint('entry_point').notNull(),
  action: text('action').notNull(),
  targetType: text('target_type').notNull(),
  targetId: text('target_id'),
  outcome: auditOutcome('outcome').notNull(),
  changedFields: text('changed_fields').array().default(sql`ARRAY[]::text[]`).notNull(),
  before: jsonb('before').$type<Record<string, unknown>>(),
  after: jsonb('after').$type<Record<string, unknown>>(),
  requestId: text('request_id').notNull(),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
  /** Phase C hash chain (migration v74): filled by a DB trigger, never written by the app. */
  seq: bigint('seq', { mode: 'number' }),
  prevHash: text('prev_hash'),
  signature: text('signature'),
}, (table) => [
  primaryKey({ name: 'audit_logs_pk', columns: [table.organizationId, table.id] }),
  index('audit_logs_organization_date_idx').on(table.organizationId, table.occurredAt),
  index('audit_logs_organization_action_target_idx').on(table.organizationId, table.action, table.targetType),
  index('audit_logs_organization_actor_outcome_idx').on(table.organizationId, table.actorId, table.outcome),
]);

export const contentReports = pgTable('content_reports', {
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'restrict' }),
  id: uuid('id').primaryKey().defaultRandom(),
  siteId: uuid('site_id'),
  articleId: uuid('article_id'),
  reporterContact: text('reporter_contact').notNull(),
  reasonCategory: text('reason_category').notNull(),
  details: text('details').notNull(),
  articleUrl: text('article_url'),
  status: reportStatus('status').default('received').notNull(),
  decidedBy: uuid('decided_by'),
  decidedAt: timestamp('decided_at', { withTimezone: true }),
  decisionNote: text('decision_note'),
  ...timestamps,
}, (table) => [
  foreignKey({ name: 'content_reports_site_fk', columns: [table.organizationId, table.siteId], foreignColumns: [sites.organizationId, sites.id] }).onDelete('restrict'),
  foreignKey({ name: 'content_reports_article_fk', columns: [table.organizationId, table.articleId], foreignColumns: [articles.organizationId, articles.id] }).onDelete('restrict'),
  index('content_reports_org_status_idx').on(table.organizationId, table.status),
  index('content_reports_org_site_idx').on(table.organizationId, table.siteId),
  index('content_reports_org_article_idx').on(table.organizationId, table.articleId),
]);

export const domainActivationAttempts = pgTable('domain_activation_attempts', {
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'restrict' }),
  id: uuid('id').notNull(),
  siteId: uuid('site_id').notNull(),
  hostname: text('hostname').notNull(),
  previousHostname: text('previous_hostname'),
  operation: activationOperation('operation').default('activate').notNull(),
  activationState: text('activation_state').notNull(),
  status: taskStatus('status').default('pending').notNull(),
  attempts: integer('attempts').default(0).notNull(),
  nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }).defaultNow().notNull(),
  reconciliationClaimToken: uuid('reconciliation_claim_token'),
  reconciliationClaimExpiresAt: timestamp('reconciliation_claim_expires_at', { withTimezone: true }),
  sanitizedFailure: jsonb('sanitized_failure').$type<Record<string, unknown>>(),
  externalStatus: jsonb('external_status').$type<Record<string, unknown>>().default({}).notNull(),
  ...timestamps,
}, (table) => [
  primaryKey({ name: 'domain_activation_attempts_pk', columns: [table.organizationId, table.id] }),
  foreignKey({ name: 'domain_activation_attempts_site_fk', columns: [table.organizationId, table.siteId], foreignColumns: [sites.organizationId, sites.id] }).onDelete('cascade'),
  index('domain_activation_attempts_due_idx').on(table.status, table.nextAttemptAt),
  index('domain_activation_attempts_claim_idx').on(table.status, table.nextAttemptAt, table.reconciliationClaimExpiresAt),
  check('domain_activation_attempts_operation_check', sql`${table.operation} IN ('activate', 'deactivate')`),
  check('domain_activation_attempts_nonnegative', sql`${table.attempts} >= 0`),
]);

export const invalidationTasks = pgTable('invalidation_tasks', {
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'restrict' }),
  id: uuid('id').notNull(),
  siteId: uuid('site_id').notNull(),
  previousHostname: text('previous_hostname'),
  currentHostname: text('current_hostname'),
  tags: text('tags').array().default(sql`ARRAY[]::text[]`).notNull(),
  paths: text('paths').array().default(sql`ARRAY[]::text[]`).notNull(),
  urls: text('urls').array().default(sql`ARRAY[]::text[]`).notNull(),
  reason: text('reason').notNull(),
  status: taskStatus('status').default('pending').notNull(),
  attempts: integer('attempts').default(0).notNull(),
  nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }).defaultNow().notNull(),
  reconciliationClaimToken: uuid('reconciliation_claim_token'),
  reconciliationClaimExpiresAt: timestamp('reconciliation_claim_expires_at', { withTimezone: true }),
  sanitizedFailure: jsonb('sanitized_failure').$type<Record<string, unknown>>(),
  ...timestamps,
}, (table) => [
  primaryKey({ name: 'invalidation_tasks_pk', columns: [table.organizationId, table.id] }),
  unique('invalidation_tasks_id_unique').on(table.id),
  foreignKey({ name: 'invalidation_tasks_site_fk', columns: [table.organizationId, table.siteId], foreignColumns: [sites.organizationId, sites.id] }).onDelete('cascade'),
  index('invalidation_tasks_due_idx').on(table.status, table.nextAttemptAt),
  index('invalidation_tasks_claim_idx').on(table.status, table.reconciliationClaimExpiresAt),
  check('invalidation_tasks_attempts_nonnegative', sql`${table.attempts} >= 0`),
]);

export const cacheBypasses = pgTable('cache_bypasses', {
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'restrict' }),
  siteId: uuid('site_id').notNull(),
  bypass: boolean('bypass').default(true).notNull(),
  version: integer('version').default(1).notNull(),
  reason: text('reason').notNull(),
  ...timestamps,
}, (table) => [
  primaryKey({ name: 'cache_bypasses_pk', columns: [table.organizationId, table.siteId] }),
  foreignKey({ name: 'cache_bypasses_site_fk', columns: [table.organizationId, table.siteId], foreignColumns: [sites.organizationId, sites.id] }).onDelete('cascade'),
  check('cache_bypasses_version_positive', sql`${table.version} > 0`),
]);

void domains;
