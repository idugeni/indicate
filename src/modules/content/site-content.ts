import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { getSharedRuntimeDatabase } from '@/data/client';
import {
  readColorPresets,
  readContactChannels,
  readFaqs,
  readServiceTiers,
  readShowcaseNames,
  readTemplatePresets,
  readTestimonials,
  type FaqRow,
  type ServiceTierRow,
  type TestimonialRow,
} from '@/data/repos/content/queries';
import {
  CONTACT_CHANNELS,
  FAQ_ITEMS,
  PRICING_PLANS,
  type FeatureItem,
} from '@/ui/site/marketing-content';
import {
  MASTER_TEMPLATE_PRESETS,
  NETWORK_COLOR_PRESETS,
  type MasterTemplatePreset,
  type NetworkColorPreset,
} from '@/ui/themes';

async function withRuntimeDatabase<T>(read: (db: Parameters<typeof readServiceTiers>[0]) => Promise<T>): Promise<T | null> {
  const context = await getServerRuntimeContext();
  // Pool bersama proses (bukan buka-tutup per getter): tiap handshake TLS ke
  // Seoul ±1 dtk; pool idle menutup sendiri via idle_timeout.
  const runtime = getSharedRuntimeDatabase(context.bootstrap);
  try {
    return await read(runtime.db);
  } catch {
    return null;
  }
}

export async function getServiceTiers(): Promise<readonly ServiceTierRow[]> {
  'use cache';
  cacheLife('hours');
  cacheTag('site-content');
  const rows = await withRuntimeDatabase((db) => readServiceTiers(db));
  if (rows !== null && rows.length > 0) return rows;
  return Object.freeze(PRICING_PLANS.map((plan) => Object.freeze({
    slug: plan.slug, name: plan.name, target: plan.target, summary: plan.summary,
    price: plan.price, period: plan.period, features: plan.features,
    highlighted: plan.highlighted, cta: plan.cta,
  })));
}

export async function getTestimonials(): Promise<readonly TestimonialRow[]> {
  'use cache';
  cacheLife('hours');
  cacheTag('site-content');
  const rows = await withRuntimeDatabase((db) => readTestimonials(db));
  if (rows !== null && rows.length > 0) return rows;
  // Tanpa fallback: testimoni fiktif dilarang tayang sebagai konten nyata.
  return Object.freeze([]);
}

export async function getFaqs(): Promise<readonly (FaqRow & { readonly id: string })[]> {
  'use cache';
  cacheLife('hours');
  cacheTag('site-content');
  const rows = await withRuntimeDatabase((db) => readFaqs(db));
  if (rows !== null && rows.length > 0) return rows;
  return Object.freeze(FAQ_ITEMS.map((item, index) => Object.freeze({
    id: item.id ?? `faq-${index + 1}`, question: item.question, answer: item.answer,
  })));
}

export async function getShowcaseNames(): Promise<readonly string[]> {
  'use cache';
  cacheLife('hours');
  cacheTag('site-content');
  const rows = await withRuntimeDatabase((db) => readShowcaseNames(db));
  if (rows !== null && rows.length > 0) return rows;
  // Tanpa fallback: logo media fiktif dilarang tayang sebagai konten nyata.
  return Object.freeze([]);
}

export async function getContactChannels(): Promise<readonly FeatureItem[]> {
  'use cache';
  cacheLife('hours');
  cacheTag('site-content');
  const rows = await withRuntimeDatabase((db) => readContactChannels(db));
  if (rows !== null && rows.length > 0) return rows;
  return CONTACT_CHANNELS;
}

export async function getColorPresets(): Promise<readonly NetworkColorPreset[]> {
  'use cache';
  cacheLife('hours');
  cacheTag('site-content');
  const rows = await withRuntimeDatabase((db) => readColorPresets(db));
  if (rows !== null && rows.length > 0) {
    return Object.freeze(rows.map((row) => Object.freeze({
      id: row.id, name: row.name, description: row.description,
      primary: row.primary, accent: row.accent, ...(row.headerBg === null ? {} : { headerBg: row.headerBg }),
    })));
  }
  return NETWORK_COLOR_PRESETS;
}

export async function getTemplatePresets(): Promise<readonly MasterTemplatePreset[]> {
  'use cache';
  cacheLife('hours');
  cacheTag('site-content');
  const rows = await withRuntimeDatabase((db) => readTemplatePresets(db));
  if (rows !== null && rows.length > 0) {
    const categories = Object.freeze(['news', 'editorial', 'tech', 'official', 'visual', 'live'] as const);
    return Object.freeze(rows.map((row) => Object.freeze({
      id: row.id,
      name: row.name,
      description: row.description,
      category: (categories as readonly string[]).includes(row.category)
        ? row.category as MasterTemplatePreset['category']
        : 'news' as const,
    })));
  }
  return MASTER_TEMPLATE_PRESETS;
}

export type { FeatureItem };
