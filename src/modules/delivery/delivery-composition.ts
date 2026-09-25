import 'server-only';
import { HostnameResolver } from '@/modules/delivery/hostname-resolver';
import { NetworkContentService } from '@/modules/delivery/network-content-service';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import type { BootstrapConfig } from '@/core/config/bootstrap/bootstrap-schema';
import type { RuntimeConfig } from '@/core/config/runtime/runtime-schema';
import { NextNetworkSiteCache } from '@/modules/delivery/network-site-cache-adapter';
import { getSharedRuntimeDatabase } from '@/data/client';
import { DrizzleDeliveryRepository } from '@/data/repos/delivery';
import type { DeliveryRepository } from '@/modules/delivery/ports';
import { UpstashSnapshotStore } from '@/integrations/redis/upstash-snapshot-store';
import { UpstashHostnameCache } from '@/integrations/redis/upstash-hostname-cache';
import type { HostnameCachePort } from '@/integrations/redis/hostname-read-model';

declare global { var indicateDeliveryRepository: DeliveryRepository | undefined; var indicateHostnameCache: HostnameCachePort | null | undefined; }
function hostnameCache(config: RuntimeConfig): HostnameCachePort | undefined {
  if (process.env.NEXT_PHASE === 'phase-production-build') return undefined;
  if (globalThis.indicateHostnameCache !== undefined) return globalThis.indicateHostnameCache ?? undefined;
  try {
    const store = new UpstashSnapshotStore({ url: config.redis.url, token: config.redis.token, namespace: config.redis.namespace });
    globalThis.indicateHostnameCache = new UpstashHostnameCache(store);
  } catch {
    globalThis.indicateHostnameCache = null;
  }
  return globalThis.indicateHostnameCache ?? undefined;
}
function repository(config: RuntimeConfig, bootstrap: BootstrapConfig): DeliveryRepository {
  if (globalThis.indicateDeliveryRepository !== undefined) return globalThis.indicateDeliveryRepository;
  const isPlaceholder = config.supabase.pooledDatabaseUrl.includes('abcdefghijklmnop') || config.supabase.pooledDatabaseUrl.includes('replace-password');
  if (isPlaceholder) {
    throw new Error('delivery_repository_unconfigured');
  }
  globalThis.indicateDeliveryRepository = new DrizzleDeliveryRepository(getSharedRuntimeDatabase(bootstrap).db, config.seo.defaultAssetUrl, config.r2.publicHost);
  return globalThis.indicateDeliveryRepository;
}
export interface DeliveryComposition {
  readonly resolver: HostnameResolver;
  readonly content: NetworkContentService;
  readonly repository: DeliveryRepository;
  readonly config: RuntimeConfig;
}

let active: DeliveryComposition | null = null;

function build(context: { readonly bootstrap: BootstrapConfig; readonly config: RuntimeConfig }): DeliveryComposition {
  const config = context.config;
  const repo = repository(config, context.bootstrap);
  return { resolver: new HostnameResolver(repo, config.hosts, hostnameCache(config)), content: new NetworkContentService(repo, new NextNetworkSiteCache(config.cache.defaultTtlSeconds)), repository: repo, config };
}

/**
 * Assemble the delivery resolver, content service, and repository for the
 * current runtime configuration.
 *
 * @remarks Safe to await only outside a `use cache` fill. The hydration it
 * awaits is module-scoped and therefore created outside the cache scope, so a
 * fill that joins it while pending is rejected by Next.js with "appears to be
 * stuck on shared state from the outer render scope" and never completes. Use
 * `activeDeliveryComposition` inside a fill.
 */
export async function deliveryComposition(): Promise<DeliveryComposition> {
  if (active !== null) return active;
  const context = await getServerRuntimeContext();
  active = build(context);
  return active;
}

/**
 * Read the process-wide delivery composition without awaiting.
 *
 * @returns The composition built by the first `deliveryComposition` call.
 * @throws {Error} `delivery_composition_unresolved` when no non-cached caller
 * has resolved the runtime context yet. Hostname resolution always runs before
 * a content loader, so this cannot fire on a served request; it exists so that a
 * reordering fails loudly instead of suspending forever.
 * @remarks Required by the `use cache` loaders in `network-runtime.ts`. Awaiting
 * a composition there would rejoin module-scoped hydration from outside the
 * cache scope, which is what previously left the landing shell unresolved.
 */
export function activeDeliveryComposition(): DeliveryComposition {
  if (active === null) throw new Error('delivery_composition_unresolved');
  return active;
}
