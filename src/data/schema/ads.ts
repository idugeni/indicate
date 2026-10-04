import { sql } from 'drizzle-orm';
import {
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

import { organizations, recordStatus, sites } from '@/data/schema/identity';

export const adCreativeKind = pgEnum('ad_creative_kind', ['image', 'html', 'provider']);
export const adCampaignStatus = pgEnum('ad_campaign_status', ['draft', 'scheduled', 'active', 'paused', 'ended']);

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
};

export const advertisers = pgTable('advertisers', {
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'restrict' }),
  id: uuid('id').notNull(),
  name: text('name').notNull(),
  contactEmail: text('contact_email'),
  status: recordStatus('status').default('active').notNull(),
  version: integer('version').default(1).notNull(),
  ...timestamps,
}, (table) => [
  primaryKey({ name: 'advertisers_pk', columns: [table.organizationId, table.id] }),
  unique('advertisers_id_unique').on(table.id),
  unique('advertisers_organization_name_unique').on(table.organizationId, table.name),
  index('advertisers_organization_status_idx').on(table.organizationId, table.status),
  check('advertisers_version_positive', sql`${table.version} > 0`),
]);

export const campaigns = pgTable('campaigns', {
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'restrict' }),
  id: uuid('id').notNull(),
  advertiserId: uuid('advertiser_id').notNull(),
  name: text('name').notNull(),
  status: adCampaignStatus('status').default('draft').notNull(),
  priority: integer('priority').default(0).notNull(),
  startsAt: timestamp('starts_at', { withTimezone: true }),
  endsAt: timestamp('ends_at', { withTimezone: true }),
  version: integer('version').default(1).notNull(),
  ...timestamps,
}, (table) => [
  primaryKey({ name: 'campaigns_pk', columns: [table.organizationId, table.id] }),
  unique('campaigns_id_unique').on(table.id),
  foreignKey({ name: 'campaigns_advertiser_fk', columns: [table.organizationId, table.advertiserId], foreignColumns: [advertisers.organizationId, advertisers.id] }).onDelete('restrict'),
  index('campaigns_organization_status_idx').on(table.organizationId, table.status),
  index('campaigns_organization_advertiser_idx').on(table.organizationId, table.advertiserId),
  check('campaigns_priority_nonnegative', sql`${table.priority} >= 0 AND ${table.version} > 0`),
  check('campaigns_window_sane', sql`${table.startsAt} IS NULL OR ${table.endsAt} IS NULL OR ${table.endsAt} > ${table.startsAt}`),
]);

export const adCreatives = pgTable('ad_creatives', {
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'restrict' }),
  id: uuid('id').notNull(),
  campaignId: uuid('campaign_id'),
  kind: adCreativeKind('kind').notNull(),
  imageUrl: text('image_url'),
  href: text('href'),
  altText: text('alt_text'),
  widthPx: integer('width_px'),
  heightPx: integer('height_px'),
  html: text('html'),
  provider: text('provider'),
  providerClientId: text('provider_client_id'),
  providerSlotId: text('provider_slot_id'),
  status: recordStatus('status').default('active').notNull(),
  version: integer('version').default(1).notNull(),
  ...timestamps,
}, (table) => [
  primaryKey({ name: 'ad_creatives_pk', columns: [table.organizationId, table.id] }),
  unique('ad_creatives_id_unique').on(table.id),
  foreignKey({ name: 'ad_creatives_campaign_fk', columns: [table.organizationId, table.campaignId], foreignColumns: [campaigns.organizationId, campaigns.id] }).onDelete('restrict'),
  index('ad_creatives_organization_campaign_idx').on(table.organizationId, table.campaignId),
  index('ad_creatives_organization_status_idx').on(table.organizationId, table.status),
  check('ad_creatives_image_shape', sql`${table.kind} <> 'image' OR ${table.imageUrl} IS NOT NULL`),
  check('ad_creatives_html_shape', sql`${table.kind} <> 'html' OR ${table.html} IS NOT NULL`),
  check('ad_creatives_provider_shape', sql`${table.kind} <> 'provider' OR ${table.provider} = 'adsense'`),
  check('ad_creatives_dimensions_positive', sql`(${table.widthPx} IS NULL AND ${table.heightPx} IS NULL) OR (${table.widthPx} IS NOT NULL AND ${table.heightPx} IS NOT NULL AND ${table.widthPx} > 0 AND ${table.heightPx} > 0)`),
  check('ad_creatives_version_positive', sql`${table.version} > 0`),
]);

/**
 * Global semantic slot catalog mirrored from `src/modules/ads/slots.ts`.
 *
 * @remarks No organization column: slot meaning is network-wide, exactly like
 * `template_presets`. Tenant scoping lives in `tenant_ad_settings` and
 * `ad_placements`, never here.
 */
export const adSlots = pgTable('ad_slots', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  maxWidthPx: integer('max_width_px').notNull(),
  allowedFormats: text('allowed_formats').array().default(sql`ARRAY[]::text[]`).notNull(),
  devices: text('devices').array().default(sql`ARRAY[]::text[]`).notNull(),
  active: boolean('active').default(true).notNull(),
  ...timestamps,
}, (table) => [
  check('ad_slots_max_width_positive', sql`${table.maxWidthPx} > 0`),
]);

export const adPlacements = pgTable('ad_placements', {
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'restrict' }),
  id: uuid('id').notNull(),
  campaignId: uuid('campaign_id').notNull(),
  creativeId: uuid('creative_id').notNull(),
  slotId: text('slot_id').notNull().references(() => adSlots.id, { onDelete: 'restrict' }),
  siteId: uuid('site_id'),
  templateId: text('template_id'),
  device: text('device'),
  priority: integer('priority').default(0).notNull(),
  startsAt: timestamp('starts_at', { withTimezone: true }),
  endsAt: timestamp('ends_at', { withTimezone: true }),
  active: boolean('active').default(true).notNull(),
  version: integer('version').default(1).notNull(),
  ...timestamps,
}, (table) => [
  primaryKey({ name: 'ad_placements_pk', columns: [table.organizationId, table.id] }),
  unique('ad_placements_id_unique').on(table.id),
  foreignKey({ name: 'ad_placements_campaign_fk', columns: [table.organizationId, table.campaignId], foreignColumns: [campaigns.organizationId, campaigns.id] }).onDelete('restrict'),
  foreignKey({ name: 'ad_placements_creative_fk', columns: [table.organizationId, table.creativeId], foreignColumns: [adCreatives.organizationId, adCreatives.id] }).onDelete('restrict'),
  foreignKey({ name: 'ad_placements_site_fk', columns: [table.organizationId, table.siteId], foreignColumns: [sites.organizationId, sites.id] }).onDelete('cascade'),
  index('ad_placements_organization_site_slot_idx').on(table.organizationId, table.siteId, table.slotId, table.active),
  index('ad_placements_organization_campaign_idx').on(table.organizationId, table.campaignId),
  index('ad_placements_organization_creative_idx').on(table.organizationId, table.creativeId),
  index('ad_placements_slot_idx').on(table.slotId),
  check('ad_placements_device_values', sql`${table.device} IS NULL OR ${table.device} IN ('desktop', 'tablet', 'mobile')`),
  check('ad_placements_priority_nonnegative', sql`${table.priority} >= 0 AND ${table.version} > 0`),
  check('ad_placements_window_sane', sql`${table.startsAt} IS NULL OR ${table.endsAt} IS NULL OR ${table.endsAt} > ${table.startsAt}`),
]);

/**
 * Per-site slot switches owned by the dashboard.
 *
 * @remarks This table outranks the transitional `site_settings.seo.ads`
 * carrier per slot; slots without a row keep reading that carrier until the
 * admin UI writes here.
 */
export const tenantAdSettings = pgTable('tenant_ad_settings', {
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'restrict' }),
  siteId: uuid('site_id').notNull(),
  slotId: text('slot_id').notNull().references(() => adSlots.id, { onDelete: 'restrict' }),
  enabled: boolean('enabled').default(true).notNull(),
  creativeId: uuid('creative_id'),
  version: integer('version').default(1).notNull(),
  ...timestamps,
}, (table) => [
  primaryKey({ name: 'tenant_ad_settings_pk', columns: [table.organizationId, table.siteId, table.slotId] }),
  foreignKey({ name: 'tenant_ad_settings_site_fk', columns: [table.organizationId, table.siteId], foreignColumns: [sites.organizationId, sites.id] }).onDelete('cascade'),
  foreignKey({ name: 'tenant_ad_settings_creative_fk', columns: [table.organizationId, table.creativeId], foreignColumns: [adCreatives.organizationId, adCreatives.id] }).onDelete('restrict'),
  index('tenant_ad_settings_organization_site_idx').on(table.organizationId, table.siteId),
  index('tenant_ad_settings_organization_creative_idx').on(table.organizationId, table.creativeId),
  index('tenant_ad_settings_slot_idx').on(table.slotId),
  check('tenant_ad_settings_version_positive', sql`${table.version} > 0`),
]);

const eventColumns = {
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'restrict' }),
  siteId: uuid('site_id').notNull(),
  slotId: text('slot_id').notNull(),
  placementId: uuid('placement_id'),
  creativeId: uuid('creative_id'),
  device: text('device').notNull(),
  day: date('day').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
};

/** Append-only impression events; aggregated downstream, never updated. */
export const adImpressions = pgTable('ad_impressions', {
  id: uuid('id').primaryKey().defaultRandom(),
  ...eventColumns,
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
}, (table) => [
  foreignKey({ name: 'ad_impressions_site_fk', columns: [table.organizationId, table.siteId], foreignColumns: [sites.organizationId, sites.id] }).onDelete('cascade'),
  foreignKey({ name: 'ad_impressions_placement_fk', columns: [table.organizationId, table.placementId], foreignColumns: [adPlacements.organizationId, adPlacements.id] }).onDelete('set null'),
  foreignKey({ name: 'ad_impressions_creative_fk', columns: [table.organizationId, table.creativeId], foreignColumns: [adCreatives.organizationId, adCreatives.id] }).onDelete('set null'),
  index('ad_impressions_organization_site_day_idx').on(table.organizationId, table.siteId, table.day),
  index('ad_impressions_organization_slot_day_idx').on(table.organizationId, table.slotId, table.day),
  index('ad_impressions_organization_placement_idx').on(table.organizationId, table.placementId),
  index('ad_impressions_organization_creative_idx').on(table.organizationId, table.creativeId),
  check('ad_impressions_device_values', sql`${table.device} IN ('desktop', 'tablet', 'mobile', 'unknown')`),
]);

/** Append-only click events with the outbound target for audit. */
export const adClicks = pgTable('ad_clicks', {
  id: uuid('id').primaryKey().defaultRandom(),
  ...eventColumns,
  targetUrl: text('target_url').notNull(),
}, (table) => [
  foreignKey({ name: 'ad_clicks_site_fk', columns: [table.organizationId, table.siteId], foreignColumns: [sites.organizationId, sites.id] }).onDelete('cascade'),
  foreignKey({ name: 'ad_clicks_placement_fk', columns: [table.organizationId, table.placementId], foreignColumns: [adPlacements.organizationId, adPlacements.id] }).onDelete('set null'),
  foreignKey({ name: 'ad_clicks_creative_fk', columns: [table.organizationId, table.creativeId], foreignColumns: [adCreatives.organizationId, adCreatives.id] }).onDelete('set null'),
  index('ad_clicks_organization_site_day_idx').on(table.organizationId, table.siteId, table.day),
  index('ad_clicks_organization_slot_day_idx').on(table.organizationId, table.slotId, table.day),
  index('ad_clicks_organization_placement_idx').on(table.organizationId, table.placementId),
  index('ad_clicks_organization_creative_idx').on(table.organizationId, table.creativeId),
  check('ad_clicks_device_values', sql`${table.device} IN ('desktop', 'tablet', 'mobile', 'unknown')`),
]);
