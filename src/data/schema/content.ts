import {
  boolean,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { permissionScope } from '@/data/schema/identity';

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
};

export const testimonials = pgTable('testimonials', {
  id: uuid('id').primaryKey(),
  quote: text('quote').notNull(),
  author: text('author').notNull(),
  role: text('role').notNull(),
  media: text('media').notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  active: boolean('active').default(true).notNull(),
  ...timestamps,
});

export const faqs = pgTable('faqs', {
  id: uuid('id').primaryKey(),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  active: boolean('active').default(true).notNull(),
  ...timestamps,
});

export const mediaShowcase = pgTable('media_showcase', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  active: boolean('active').default(true).notNull(),
  ...timestamps,
});

export const contactChannels = pgTable('contact_channels', {
  key: text('key').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  href: text('href'),
  sortOrder: integer('sort_order').default(0).notNull(),
  ...timestamps,
});

export const permissionDefinitions = pgTable('permission_definitions', {
  scope: permissionScope('scope').notNull(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
}, (table) => [
  primaryKey({ name: 'permission_definitions_pk', columns: [table.scope, table.name] }),
]);

export const colorPresets = pgTable('color_presets', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  primary: text('primary').notNull(),
  accent: text('accent').notNull(),
  headerBg: text('header_bg'),
  ...timestamps,
});

export const templatePresets = pgTable('template_presets', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  category: text('category').notNull(),
  ...timestamps,
});
