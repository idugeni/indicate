import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

import { organizations } from '@/data/schema/identity';

/**
 * Cermin Drizzle untuk `public.ai_semantic_cache`.
 *
 * @remarks Satu baris per (organisasi, model, hash prompt); `organizationId`
 * `null` menandai entri global bersama. Unik `NULLS NOT DISTINCT` ditegakkan
 * di SQL (`20260930060000`); cermin ini memakai `unique()` biasa karena
 * dialect 0.45 tidak mengekspresikan varian null tersebut.
 */
export const aiSemanticCache = pgTable('ai_semantic_cache', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  modelName: text('model_name').notNull(),
  promptHash: text('prompt_hash').notNull(),
  promptPrefix: text('prompt_prefix').notNull(),
  responseText: text('response_text').notNull(),
  hits: integer('hits').default(0).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique('ai_semantic_cache_org_model_hash_unique').on(table.organizationId, table.modelName, table.promptHash),
  index('ai_semantic_cache_expires_idx').on(table.expiresAt),
  check('ai_semantic_cache_model_name_shape', sql`char_length(${table.modelName}) BETWEEN 1 AND 200`),
  check('ai_semantic_cache_prompt_hash_shape', sql`${table.promptHash} ~ '^[0-9a-f]{64}$'`),
  check('ai_semantic_cache_prompt_prefix_shape', sql`char_length(${table.promptPrefix}) BETWEEN 1 AND 300`),
  check('ai_semantic_cache_response_shape', sql`char_length(${table.responseText}) BETWEEN 1 AND 8000`),
  check('ai_semantic_cache_hits_nonnegative', sql`${table.hits} >= 0`),
]);
