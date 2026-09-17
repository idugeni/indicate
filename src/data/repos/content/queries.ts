import 'server-only';

import { asc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import type * as schema from '@/data/schema';
import { contactChannels } from '@/data/schema';

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

export async function readContactChannels(db: Database): Promise<readonly { readonly title: string; readonly description: string; readonly href?: string }[]> {
  const rows = await db.select().from(contactChannels).orderBy(asc(contactChannels.sortOrder), asc(contactChannels.key));
  return Object.freeze(rows.map((row) => Object.freeze({
    title: row.title,
    description: row.description,
    ...(typeof row.href === 'string' && row.href.trim() !== '' ? { href: row.href } : {}),
  })));
}
