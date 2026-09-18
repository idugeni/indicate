import 'server-only';

import { asc, eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import type * as schema from '@/data/schema';
import { contactChannels, faqs, testimonials } from '@/data/schema';

type Database = PostgresJsDatabase<typeof schema>;

export interface TestimonialRow {
  readonly quote: string;
  readonly author: string;
  readonly role: string;
  readonly media: string;
}

export interface FaqRow {
  readonly id: string;
  readonly question: string;
  readonly answer: string;
}

export async function readFaqs(db: Database): Promise<readonly FaqRow[]> {
  const rows = await db
    .select()
    .from(faqs)
    .where(eq(faqs.active, true))
    .orderBy(asc(faqs.sortOrder), asc(faqs.question));
  return Object.freeze(rows.map((row) => Object.freeze({ id: row.id, question: row.question, answer: row.answer })));
}

export async function readTestimonials(db: Database): Promise<readonly TestimonialRow[]> {
  const rows = await db
    .select()
    .from(testimonials)
    .where(eq(testimonials.active, true))
    .orderBy(asc(testimonials.sortOrder), asc(testimonials.author));
  return Object.freeze(
    rows.map((row) => Object.freeze({ quote: row.quote, author: row.author, role: row.role, media: row.media })),
  );
}

export async function readContactChannels(db: Database): Promise<readonly { readonly title: string; readonly description: string; readonly href?: string }[]> {
  const rows = await db.select().from(contactChannels).orderBy(asc(contactChannels.sortOrder), asc(contactChannels.key));
  return Object.freeze(rows.map((row) => Object.freeze({
    title: row.title,
    description: row.description,
    ...(typeof row.href === 'string' && row.href.trim() !== '' ? { href: row.href } : {}),
  })));
}
