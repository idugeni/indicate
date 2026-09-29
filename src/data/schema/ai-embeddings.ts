import { sql } from 'drizzle-orm';
import {
  check,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { organizations } from '@/data/schema/identity';

/**
 * Cermin Drizzle untuk `public.document_embeddings`.
 *
 * @remarks Potongan artikel per tenant untuk pencarian arsip; `embedding`
 * tetap nullable sampai transport embedding tiba, sehingga pembaca arsip
 * memakai `chunk` ILIKE. Tabel dibuat oleh `20260930050000`, dikeraskan oleh
 * `20260930070000`; cermin ini tidak membuat apa pun.
 */
export const documentEmbeddings = pgTable('document_embeddings', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'restrict' }),
  articleId: uuid('article_id'),
  chunk: text('chunk').notNull(),
  embedding: jsonb('embedding').$type<readonly number[] | null>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('document_embeddings_org_article_idx').on(table.organizationId, table.articleId),
  index('document_embeddings_org_created_idx').on(table.organizationId, table.createdAt),
  check('document_embeddings_chunk_nonempty', sql`char_length(${table.chunk}) BETWEEN 1 AND 2000`),
]);
