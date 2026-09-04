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
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { organizations, users } from '@/data/schema/identity';

export const billingOrderStatus = pgEnum('billing_order_status', [
  'pending_payment',
  'waiting_verification',
  'active',
  'rejected',
]);

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
};

/** Katalog paket jual; `plan` 1:1 ke `subscription_plan`. */
export const packages = pgTable('packages', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  plan: text('plan').notNull(),
  priceIdr: integer('price_idr').notNull(),
  maxDomains: integer('max_domains'),
  maxSites: integer('max_sites'),
  maxMembers: integer('max_members'),
  maxApiKeys: integer('max_api_keys'),
  active: boolean('active').default(true).notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex('packages_plan_unique').on(table.plan),
  check('packages_price_nonnegative', sql`${table.priceIdr} >= 0`),
  check('packages_plan_values', sql`${table.plan} IN ('starter', 'growth', 'pro', 'enterprise')`),
  check(
    'packages_quota_nonnegative',
    sql`(${table.maxDomains} IS NULL OR ${table.maxDomains} > 0) AND (${table.maxSites} IS NULL OR ${table.maxSites} > 0) AND (${table.maxMembers} IS NULL OR ${table.maxMembers} > 0) AND (${table.maxApiKeys} IS NULL OR ${table.maxApiKeys} > 0)`,
  ),
  index('packages_active_idx').on(table.active),
]);

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  orgId: uuid('org_id').references(() => organizations.id, { onDelete: 'restrict' }),
  packageId: uuid('package_id').notNull().references(() => packages.id, { onDelete: 'restrict' }),
  status: billingOrderStatus('status').default('pending_payment').notNull(),
  proofUrl: text('proof_url'),
  decidedBy: uuid('decided_by'),
  decidedAt: timestamp('decided_at', { withTimezone: true }),
  ...timestamps,
}, (table) => [
  index('orders_org_status_idx').on(table.orgId, table.status),
  index('orders_user_idx').on(table.userId),
  index('orders_package_idx').on(table.packageId),
  index('orders_status_idx').on(table.status),
]);

export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  check('invoices_amount_nonnegative', sql`${table.amount} >= 0`),
  index('invoices_order_idx').on(table.orderId),
]);

export const enterpriseLeads = pgTable('enterprise_leads', {
  id: uuid('id').primaryKey(),
  nama: text('nama').notNull(),
  email: text('email').notNull(),
  kebutuhan: text('kebutuhan').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('enterprise_leads_email_idx').on(table.email),
  check('enterprise_leads_bounded', sql`length(${table.nama}) BETWEEN 1 AND 200 AND length(${table.email}) BETWEEN 3 AND 320 AND length(${table.kebutuhan}) BETWEEN 1 AND 4000`),
]);

export const orgInvitations = pgTable('org_invitations', {
  id: uuid('id').primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  tokenHash: text('token_hash').notNull(),
  roleId: uuid('role_id'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  ...timestamps,
}, (table) => [
  uniqueIndex('org_invitations_token_hash_unique').on(table.tokenHash),
  index('org_invitations_org_email_idx').on(table.orgId, table.email),
  index('org_invitations_expires_idx').on(table.expiresAt),
  check('org_invitations_email_bounded', sql`length(${table.email}) BETWEEN 3 AND 320`),
]);
