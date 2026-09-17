import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { getSharedRuntimeDatabase } from '@/data/client';
import type * as schema from '@/data/schema';
import { readContactChannels } from '@/data/repos/content/queries';
import { CONTACT_CHANNELS, type FeatureItem } from '@/ui/site/marketing-content';

async function withRuntimeDatabase<T>(read: (db: PostgresJsDatabase<typeof schema>) => Promise<T>): Promise<T | null> {
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

export async function getContactChannels(): Promise<readonly FeatureItem[]> {
  'use cache';
  cacheLife('hours');
  cacheTag('site-content');
  const rows = await withRuntimeDatabase((db) => readContactChannels(db));
  if (rows !== null && rows.length > 0) return rows;
  return CONTACT_CHANNELS;
}

export type { FeatureItem };
