import { sql } from 'drizzle-orm';
import {
  boolean,
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

export const recordStatus = pgEnum('record_status', ['active', 'inactive', 'archived']);
export const regionKind = pgEnum('region_kind', ['region', 'city']);
export const roleTier = pgEnum('role_tier', ['admin', 'user', 'superadmin']);
export const permissionScope = pgEnum('permission_scope', ['organization', 'platform']);
export const subscriptionStatus = pgEnum('subscription_status', ['trialing', 'active', 'past_due', 'suspended', 'cancelled']);
export const apiKeyStatus = pgEnum('api_key_status', ['active', 'revoked', 'expired']);
export const siteActivationState = pgEnum('site_activation_state', ['inactive', 'pending', 'active', 'failed']);
export const privacyRequestType = pgEnum('privacy_request_type', ['access', 'correction', 'deletion', 'portability', 'restriction']);
export const privacyRequestStatus = pgEnum('privacy_request_status', ['open', 'in_progress', 'fulfilled', 'rejected']);

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
};

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  status: recordStatus('status').default('active').notNull(),
  kind: text('kind').default('customer').notNull(),
  customerMetadata: jsonb('customer_metadata').$type<Record<string, unknown>>().default({}).notNull(),
  version: integer('version').default(1).notNull(),
  ...timestamps,
}, (table) => [
  unique('organizations_slug_unique').on(table.slug),
  check('organizations_version_positive', sql`${table.version} > 0`),
  check('organizations_kind_check', sql`${table.kind} IN ('operator', 'customer')`),
  index('organizations_status_idx').on(table.status),
  index('organizations_kind_idx').on(table.kind),
]);

export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  authUserId: uuid('auth_user_id').notNull(),
  displayName: text('display_name').notNull(),
  email: text('email'),
  avatarUrl: text('avatar_url'),
  bio: text('bio'),
  locale: text('locale'),
  timezone: text('timezone'),
  status: recordStatus('status').default('active').notNull(),
  ...timestamps,
}, (table) => [
  unique('users_auth_user_id_unique').on(table.authUserId),
  index('users_status_idx').on(table.status),
]);

export const roles = pgTable('roles', {
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'restrict' }),
  id: uuid('id').notNull(),
  name: text('name').notNull(),
  tier: roleTier('tier').default('user').notNull(),
  active: boolean('active').default(true).notNull(),
  version: integer('version').default(1).notNull(),
  ...timestamps,
}, (table) => [
  primaryKey({ name: 'roles_pk', columns: [table.organizationId, table.id] }),
  unique('roles_organization_name_unique').on(table.organizationId, table.name),
  index('roles_organization_active_idx').on(table.organizationId, table.active),
  check('roles_version_positive', sql`${table.version} > 0`),
]);

export const permissions = pgTable('permissions', {
  id: uuid('id').primaryKey(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  scope: permissionScope('scope').notNull(),
  description: text('description').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  check('permissions_scope_organization_check', sql`(
    (${table.scope} = 'platform' AND ${table.organizationId} IS NULL)
    OR (${table.scope} = 'organization' AND ${table.organizationId} IS NOT NULL)
  )`),
  uniqueIndex('permissions_platform_name_unique').on(table.name).where(sql`${table.scope} = 'platform'`),
  uniqueIndex('permissions_organization_name_unique').on(table.organizationId, table.name).where(sql`${table.scope} = 'organization'`),
]);

export const platformUserPermissions = pgTable('platform_user_permissions', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  permissionId: uuid('permission_id').notNull().references(() => permissions.id, { onDelete: 'restrict' }),
  provisionedBy: text('provisioned_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  primaryKey({ name: 'platform_user_permissions_pk', columns: [table.userId, table.permissionId] }),
  index('platform_user_permissions_user_idx').on(table.userId),
]);

/** Platform-org registry; 'superadmin' tier allowed only inside a registered org (fail-closed trigger). */
export const platformOrganizations = pgTable('platform_organizations', {
  organizationId: uuid('organization_id').primaryKey().references(() => organizations.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const memberships = pgTable('memberships', {
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  roleId: uuid('role_id').notNull(),
  status: recordStatus('status').default('active').notNull(),
  version: integer('version').default(1).notNull(),
  /** Optional region key: NULL means all regions (central/superadmin). */
  regionId: uuid('region_id'),
  ...timestamps,
}, (table) => [
  primaryKey({ name: 'memberships_pk', columns: [table.organizationId, table.userId] }),
  foreignKey({ name: 'memberships_role_fk', columns: [table.organizationId, table.roleId], foreignColumns: [roles.organizationId, roles.id] }).onDelete('restrict'),
  foreignKey({ name: 'memberships_region_fk', columns: [table.organizationId, table.regionId], foreignColumns: [regions.organizationId, regions.id] }).onDelete('restrict'),
  index('memberships_user_status_idx').on(table.userId, table.status),
  index('memberships_organization_role_idx').on(table.organizationId, table.roleId, table.status),
  index('memberships_organization_region_idx').on(table.organizationId, table.regionId, table.status),
  check('memberships_version_positive', sql`${table.version} > 0`),
]);

export const rolePermissions = pgTable('role_permissions', {
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  roleId: uuid('role_id').notNull(),
  permissionId: uuid('permission_id').notNull().references(() => permissions.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  primaryKey({ name: 'role_permissions_pk', columns: [table.organizationId, table.roleId, table.permissionId] }),
  foreignKey({ name: 'role_permissions_role_fk', columns: [table.organizationId, table.roleId], foreignColumns: [roles.organizationId, roles.id] }).onDelete('cascade'),
]);

export const domains = pgTable('domains', {
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'restrict' }),
  id: uuid('id').notNull(),
  normalizedHostname: text('normalized_hostname').notNull(),
  status: recordStatus('status').default('inactive').notNull(),
  cloudflareZoneId: text('cloudflare_zone_id'),
  routingVersion: integer('routing_version').default(1).notNull(),
  version: integer('version').default(1).notNull(),
  ...timestamps,
}, (table) => [
  primaryKey({ name: 'domains_pk', columns: [table.organizationId, table.id] }),
  unique('domains_id_unique').on(table.id),
  unique('domains_normalized_hostname_unique').on(table.normalizedHostname),
  index('domains_organization_status_idx').on(table.organizationId, table.status),
  check('domains_hostname_length', sql`length(${table.normalizedHostname}) BETWEEN 3 AND 253`),
  check('domains_versions_positive', sql`${table.routingVersion} > 0 AND ${table.version} > 0`),
]);

export const regions = pgTable('regions', {
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'restrict' }),
  id: uuid('id').notNull(),
  externalKey: text('external_key').notNull(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  status: recordStatus('status').default('active').notNull(),
  kind: regionKind('kind').default('region').notNull(),
  parentRegionId: uuid('parent_region_id'),
  version: integer('version').default(1).notNull(),
  ...timestamps,
}, (table) => [
  primaryKey({ name: 'regions_pk', columns: [table.organizationId, table.id] }),
  unique('regions_id_unique').on(table.id),
  unique('regions_organization_external_key_unique').on(table.organizationId, table.externalKey),
  unique('regions_organization_slug_unique').on(table.organizationId, table.slug),
  index('regions_organization_status_idx').on(table.organizationId, table.status),
  index('regions_parent_idx').on(table.organizationId, table.parentRegionId),
  foreignKey({ name: 'regions_parent_fk', columns: [table.organizationId, table.parentRegionId], foreignColumns: [table.organizationId, table.id] }).onDelete('restrict'),
  check('regions_slug_format', sql`${table.slug} ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'`),
  check('regions_kind_parent_consistent', sql`(${table.kind} = 'city') = (${table.parentRegionId} IS NOT NULL)`),
]);

export const sites = pgTable('sites', {
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'restrict' }),
  id: uuid('id').notNull(),
  domainId: uuid('domain_id').notNull(),
  regionId: uuid('region_id'),
  normalizedHostname: text('normalized_hostname').notNull(),
  status: recordStatus('status').default('inactive').notNull(),
  activationState: siteActivationState('activation_state').default('inactive').notNull(),
  routingVersion: integer('routing_version').default(1).notNull(),
  contentVersion: integer('content_version').default(1).notNull(),
  version: integer('version').default(1).notNull(),
  ...timestamps,
}, (table) => [
  primaryKey({ name: 'sites_pk', columns: [table.organizationId, table.id] }),
  unique('sites_id_unique').on(table.id),
  unique('sites_normalized_hostname_unique').on(table.normalizedHostname),
  foreignKey({ name: 'sites_domain_fk', columns: [table.organizationId, table.domainId], foreignColumns: [domains.organizationId, domains.id] }).onDelete('restrict'),
  foreignKey({ name: 'sites_region_fk', columns: [table.organizationId, table.regionId], foreignColumns: [regions.organizationId, regions.id] }).onDelete('restrict'),
  index('sites_exact_active_hostname_idx').on(table.normalizedHostname, table.status, table.activationState),
  index('sites_organization_domain_idx').on(table.organizationId, table.domainId),
  index('sites_organization_status_idx').on(table.organizationId, table.status),
  check('sites_versions_positive', sql`${table.routingVersion} > 0 AND ${table.contentVersion} > 0 AND ${table.version} > 0`),
]);

export const subscriptions = pgTable('subscriptions', {
  organizationId: uuid('organization_id').primaryKey().references(() => organizations.id, { onDelete: 'cascade' }),
  status: subscriptionStatus('status').notNull(),
  version: integer('version').default(1).notNull(),
  ...timestamps,
}, (table) => [
  check('subscriptions_version_positive', sql`${table.version} > 0`),
]);

export const apiKeys = pgTable('api_keys', {
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  id: uuid('id').notNull(),
  lookupId: text('lookup_id').notNull(),
  name: text('name').notNull(),
  salt: text('salt').notNull(),
  verificationHash: text('verification_hash').notNull(),
  scopes: text('scopes').array().default(sql`ARRAY[]::text[]`).notNull(),
  status: apiKeyStatus('status').default('active').notNull(),
  predecessorId: uuid('predecessor_id'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  version: integer('version').default(1).notNull(),
  /** Optional region key: NULL means all regions. */
  regionId: uuid('region_id'),
  ...timestamps,
}, (table) => [
  primaryKey({ name: 'api_keys_pk', columns: [table.organizationId, table.id] }),
  unique('api_keys_lookup_id_unique').on(table.lookupId),
  foreignKey({ name: 'api_keys_predecessor_fk', columns: [table.organizationId, table.predecessorId], foreignColumns: [table.organizationId, table.id] }).onDelete('restrict'),
  foreignKey({ name: 'api_keys_region_fk', columns: [table.organizationId, table.regionId], foreignColumns: [regions.organizationId, regions.id] }).onDelete('restrict'),
  index('api_keys_organization_status_idx').on(table.organizationId, table.status),
  index('api_keys_organization_region_idx').on(table.organizationId, table.regionId),
  check('api_keys_version_positive', sql`${table.version} > 0`),
  check('api_keys_bounded_identity', sql`length(${table.lookupId}) BETWEEN 16 AND 128 AND length(${table.name}) BETWEEN 1 AND 120`),
]);

export const privacyRequests = pgTable('privacy_requests', {
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'restrict' }),
  id: uuid('id').primaryKey().defaultRandom(),
  ticketNumber: text('ticket_number').notNull(),
  requesterUserId: uuid('requester_user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  requestType: privacyRequestType('request_type').notNull(),
  details: text('details').notNull(),
  status: privacyRequestStatus('status').default('open').notNull(),
  decidedBy: uuid('decided_by'),
  decidedAt: timestamp('decided_at', { withTimezone: true }),
  decisionNote: text('decision_note'),
  ...timestamps,
}, (table) => [
  unique('privacy_requests_ticket_unique').on(table.ticketNumber),
  index('privacy_requests_org_status_idx').on(table.organizationId, table.status),
  index('privacy_requests_requester_idx').on(table.requesterUserId),
]);

export const telegramIdentityMappings = pgTable('telegram_identity_mappings', {
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  id: uuid('id').notNull(),
  telegramUserId: text('telegram_user_id').notNull(),
  telegramChatId: text('telegram_chat_id').notNull(),
  userId: uuid('user_id').notNull(),
  roleId: uuid('role_id').notNull(),
  status: recordStatus('status').default('active').notNull(),
  version: integer('version').default(1).notNull(),
  consentedAt: timestamp('consented_at', { withTimezone: true }),
  consentTextVersion: text('consent_text_version'),
  ipHash: text('ip_hash'),
  ...timestamps,
}, (table) => [
  primaryKey({ name: 'telegram_identity_mappings_pk', columns: [table.organizationId, table.id] }),
  unique('telegram_identity_org_user_chat_unique').on(table.organizationId, table.telegramUserId, table.telegramChatId),
  foreignKey({ name: 'telegram_identity_membership_fk', columns: [table.organizationId, table.userId], foreignColumns: [memberships.organizationId, memberships.userId] }).onDelete('cascade'),
  foreignKey({ name: 'telegram_identity_role_fk', columns: [table.organizationId, table.roleId], foreignColumns: [roles.organizationId, roles.id] }).onDelete('restrict'),
  index('telegram_identity_status_idx').on(table.organizationId, table.status),
  check('telegram_identity_mappings_version_positive', sql`${table.version} > 0`),
  check('telegram_identity_mappings_ip_hash', sql`${table.ipHash} IS NULL OR ${table.ipHash} ~ '^[0-9a-f]{64}$'`),
]);
