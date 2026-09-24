import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { getSharedRuntimeDatabase } from '@/data/client';
import type * as schema from '@/data/schema';
import { readContactChannels, readFaqs, readPublicNetworkSites, readPublicPartners, readTestimonials } from '@/data/repos/content/queries';
import type { FaqRow, NetworkSiteRow, PartnerRow, TestimonialRow } from '@/data/repos/content/queries';
import type { FeatureItem } from '@/ui/site/marketing-content';

async function withRuntimeDatabase<T>(read: (db: PostgresJsDatabase<typeof schema>) => Promise<T>): Promise<T> {
  const context = await getServerRuntimeContext();
  const runtime = getSharedRuntimeDatabase(context.bootstrap);
  return read(runtime.db);
}

export async function getFaqs(): Promise<readonly FaqRow[]> {
  'use cache';
  cacheLife('hours');
  cacheTag('site-content');
  return withRuntimeDatabase((db) => readFaqs(db));
}

export async function getTestimonials(): Promise<readonly TestimonialRow[]> {
  'use cache';
  cacheLife('hours');
  cacheTag('site-content');
  return withRuntimeDatabase((db) => readTestimonials(db));
}

export async function getContactChannels(): Promise<readonly FeatureItem[]> {
  'use cache';
  cacheLife('hours');
  cacheTag('site-content');
  return withRuntimeDatabase((db) => readContactChannels(db));
}

export async function getNetworkSites(): Promise<readonly NetworkSiteRow[]> {
  'use cache';
  cacheLife('hours');
  cacheTag('public-directory');
  return withRuntimeDatabase((db) => readPublicNetworkSites(db));
}

export async function getPartnerOrganizations(): Promise<readonly PartnerRow[]> {
  'use cache';
  cacheLife('hours');
  cacheTag('public-directory');
  return withRuntimeDatabase((db) => readPublicPartners(db));
}

export type { FaqRow, FeatureItem, NetworkSiteRow, PartnerRow, TestimonialRow };
