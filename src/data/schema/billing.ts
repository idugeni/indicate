import { sql } from 'drizzle-orm';
import {
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

export const invoiceStatus = pgEnum('invoice_status', ['paid', 'voided', 'unpaid']);

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
};

/** Manual invoice from the manual-activation era: recorded by a superadmin after confirmed payment. */
export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'restrict' }),
  number: text('number').notNull(),
  amountIdr: integer('amount_idr').notNull(),
  currency: text('currency').default('IDR').notNull(),
  status: invoiceStatus('status').default('paid').notNull(),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  dueAt: timestamp('due_at', { withTimezone: true }),
  billingNote: text('billing_note'),
  paymentMethod: text('payment_method').default('Transfer bank').notNull(),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  voidedAt: timestamp('voided_at', { withTimezone: true }),
  voidReason: text('void_reason'),
  version: integer('version').default(1).notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex('invoices_number_unique').on(table.number),
  check('invoices_amount_positive', sql`${table.amountIdr} > 0`),
  check('invoices_payment_method_bounded', sql`length(${table.paymentMethod}) BETWEEN 1 AND 40`),
  check('invoices_version_positive', sql`${table.version} > 0`),
  index('invoices_org_paid_idx').on(table.organizationId, table.paidAt),
]);

/** Single-use member invitation (not billing; membership onboarding). */
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
