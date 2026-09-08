import 'server-only';

import { asc, eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import type * as schema from '@/data/schema';
import {
  colorPresets,
  contactChannels,
  faqs,
  mediaShowcase,
  templatePresets,
  testimonials,
} from '@/data/schema';

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

export interface ColorPresetRow {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly primary: string;
  readonly accent: string;
  readonly headerBg: string | null;
}

export interface TemplatePresetRow {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: string;
}

export async function readTestimonials(db: Database): Promise<readonly TestimonialRow[]> {
  const rows = await db.select().from(testimonials).where(eq(testimonials.active, true)).orderBy(asc(testimonials.sortOrder), asc(testimonials.id));
  return Object.freeze(rows.map((row) => Object.freeze({
    quote: row.quote, author: row.author, role: row.role, media: row.media,
  })));
}

export async function readFaqs(db: Database): Promise<readonly FaqRow[]> {
  const rows = await db.select().from(faqs).where(eq(faqs.active, true)).orderBy(asc(faqs.sortOrder), asc(faqs.id));
  return Object.freeze(rows.map((row) => Object.freeze({
    id: row.id, question: row.question, answer: row.answer,
  })));
}

export async function readShowcaseNames(db: Database): Promise<readonly string[]> {
  const rows = await db.select().from(mediaShowcase).where(eq(mediaShowcase.active, true)).orderBy(asc(mediaShowcase.sortOrder), asc(mediaShowcase.id));
  return Object.freeze(rows.map((row) => row.name));
}

export async function readContactChannels(db: Database): Promise<readonly { readonly title: string; readonly description: string; readonly href?: string }[]> {
  const rows = await db.select().from(contactChannels).orderBy(asc(contactChannels.sortOrder), asc(contactChannels.key));
  return Object.freeze(rows.map((row) => Object.freeze({
    title: row.title,
    description: row.description,
    ...(typeof row.href === 'string' && row.href.trim() !== '' ? { href: row.href } : {}),
  })));
}

export async function readColorPresets(db: Database): Promise<readonly ColorPresetRow[]> {
  const rows = await db.select().from(colorPresets).orderBy(asc(colorPresets.id));
  return Object.freeze(rows.map((row) => Object.freeze({
    id: row.id, name: row.name, description: row.description,
    primary: row.primary, accent: row.accent, headerBg: row.headerBg,
  })));
}

export async function readTemplatePresets(db: Database): Promise<readonly TemplatePresetRow[]> {
  const rows = await db.select().from(templatePresets).orderBy(asc(templatePresets.id));
  return Object.freeze(rows.map((row) => Object.freeze({
    id: row.id, name: row.name, description: row.description, category: row.category,
  })));
}
