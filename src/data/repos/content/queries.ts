import 'server-only';

import { asc, eq, sql } from 'drizzle-orm';
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
  readonly category: string | null;
}

export async function readFaqs(db: Database): Promise<readonly FaqRow[]> {
  const rows = await db
    .select({ id: faqs.id, question: faqs.question, answer: faqs.answer, category: faqs.category })
    .from(faqs)
    .where(eq(faqs.active, true))
    .orderBy(asc(faqs.sortOrder), asc(faqs.question));
  return Object.freeze(rows.map((row) => Object.freeze({ id: row.id, question: row.question, answer: row.answer, category: row.category })));
}

export async function readTestimonials(db: Database): Promise<readonly TestimonialRow[]> {
  const rows = await db
    .select({ quote: testimonials.quote, author: testimonials.author, role: testimonials.role, media: testimonials.media })
    .from(testimonials)
    .where(eq(testimonials.active, true))
    .orderBy(asc(testimonials.sortOrder), asc(testimonials.author));
  return Object.freeze(
    rows.map((row) => Object.freeze({ quote: row.quote, author: row.author, role: row.role, media: row.media })),
  );
}

export async function readContactChannels(db: Database): Promise<readonly { readonly title: string; readonly description: string; readonly href?: string }[]> {
  const rows = await db
    .select({ title: contactChannels.title, description: contactChannels.description, href: contactChannels.href })
    .from(contactChannels)
    .orderBy(asc(contactChannels.sortOrder), asc(contactChannels.key));
  return Object.freeze(rows.map((row) => Object.freeze({
    title: row.title,
    description: row.description,
    ...(typeof row.href === 'string' && row.href.trim() !== '' ? { href: row.href } : {}),
  })));
}

/**
 * One portal as the public directory needs it.
 *
 * `description` and `tagline` are only filled for apex portals: the regional
 * ledger renders a count per city, so shipping thousands of regional
 * descriptions to the browser would bloat the page for nothing.
 */
export interface DirectoryEntry {
  readonly hostname: string;
  readonly siteName: string;
  readonly siteLevel: 'apex' | 'region' | 'city';
  readonly areaName: string | null;
  readonly tagline: string | null;
  readonly description: string | null;
}

export interface NetworkSiteRow extends DirectoryEntry {
  readonly parentHostname: string | null;
  readonly parentAreaName: string | null;
}

export interface PartnerRow {
  readonly name: string;
  readonly slug: string;
}

/**
 * List every active portal for the public network directory.
 *
 * @param db - Runtime database; the reader is a fixed-shape SECURITY DEFINER
 * function exposing only public display fields (no PII, no identifiers).
 * @returns Active portals ordered by hostname, frozen.
 */
export async function readPublicNetworkSites(db: Database): Promise<readonly NetworkSiteRow[]> {
  const rows = await db.execute<{
    readonly hostname: string;
    readonly parent_hostname: string | null;
    readonly site_level: 'apex' | 'region' | 'city';
    readonly site_name: string;
    readonly description: string;
    readonly tagline: string | null;
    readonly area_name: string | null;
    readonly parent_area_name: string | null;
  }>(sql`SELECT * FROM indicate_private.list_public_network_sites()`);
  return Object.freeze(rows.map((row) => Object.freeze({
    hostname: row.hostname,
    parentHostname: row.parent_hostname,
    siteLevel: row.site_level,
    siteName: row.site_name,
    description: row.description,
    tagline: row.tagline,
    areaName: row.area_name,
    parentAreaName: row.parent_area_name,
  })));
}

/**
 * List every subscribed customer organization for the public partner directory.
 *
 * @param db - Runtime database; the reader exposes only the public name and
 * slug of active customer organizations with an active subscription.
 * @returns Subscribed partners ordered by name, frozen.
 */
export async function readPublicPartners(db: Database): Promise<readonly PartnerRow[]> {
  const rows = await db.execute<{
    readonly name: string;
    readonly slug: string;
  }>(sql`SELECT * FROM indicate_private.list_public_partners()`);
  return Object.freeze(rows.map((row) => Object.freeze({ name: row.name, slug: row.slug })));
}
