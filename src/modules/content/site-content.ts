import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { getBootstrapConfig } from '@/core/config/bootstrap/bootstrap-config';
import { getSharedRuntimeDatabase, withQueryDeadline } from '@/data/client';
import type * as schema from '@/data/schema';
import { readContactChannels, readFaqs, readPublicNetworkSites, readPublicPartners, readTestimonials } from '@/data/repos/content/queries';
import type { DirectoryEntry, FaqRow, NetworkSiteRow, PartnerRow, TestimonialRow } from '@/data/repos/content/queries';
import type { FeatureItem } from '@/ui/site/marketing-content';

/**
 * Resolve the shared runtime pool for a cache fill.
 *
 * @remarks Deliberately synchronous. A `use cache` fill may not await a promise
 * created outside its own scope, so this must not go through
 * `getServerRuntimeContext`, whose module-scoped single-flight hydration is
 * exactly that. Next.js 16 rejects such a fill with "appears to be stuck on
 * shared state from the outer render scope", which surfaces to visitors as a
 * stream that never completes. `getBootstrapConfig` and
 * `getSharedRuntimeDatabase` are both synchronous, so the fill only awaits its
 * own query.
 */
function withRuntimeDatabase<T>(read: (db: PostgresJsDatabase<typeof schema>) => Promise<T>): Promise<T> {
  return read(getSharedRuntimeDatabase(getBootstrapConfig()).db);
}

export async function getFaqs(): Promise<readonly FaqRow[]> {
  'use cache';
  cacheLife('hours');
  cacheTag('site-content');
  return withQueryDeadline('faqs', () => withRuntimeDatabase((db) => readFaqs(db)));
}

export async function getTestimonials(): Promise<readonly TestimonialRow[]> {
  'use cache';
  cacheLife('hours');
  cacheTag('site-content');
  return withQueryDeadline('testimonials', () => withRuntimeDatabase((db) => readTestimonials(db)));
}

export async function getContactChannels(): Promise<readonly FeatureItem[]> {
  'use cache';
  cacheLife('hours');
  cacheTag('site-content');
  return withQueryDeadline('contact_channels', () => withRuntimeDatabase((db) => readContactChannels(db)));
}

export async function getNetworkSites(): Promise<readonly NetworkSiteRow[]> {
  'use cache';
  cacheLife('hours');
  cacheTag('public-directory');
  return withQueryDeadline('network_sites', () => withRuntimeDatabase((db) => readPublicNetworkSites(db)));
}

export async function getPartnerOrganizations(): Promise<readonly PartnerRow[]> {
  'use cache';
  cacheLife('hours');
  cacheTag('public-directory');
  return withQueryDeadline('partner_organizations', () => withRuntimeDatabase((db) => readPublicPartners(db)));
}

export type { DirectoryEntry, FaqRow, FeatureItem, NetworkSiteRow, PartnerRow, TestimonialRow };
