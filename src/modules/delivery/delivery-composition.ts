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
/**
 * Assemble the delivery resolver, content service, and repository for the
 * current runtime configuration.
 *
 * @remarks Awaiting this from inside a `use cache` fill is only safe once the
 * runtime context has settled: the await joins `getServerRuntimeContext`, whose
 * single-flight hydration promise is module-scoped and therefore created outside
 * the cache scope. A fill that catches it while it is still pending is rejected
 * by Next.js with "appears to be stuck on shared state from the outer render
 * scope", which surfaces as a stream that never completes rather than an error.
 * Hostname resolution resolves the context before any loader runs, which is what
 * keeps the `use cache` loaders in `network-runtime.ts` sound. Preserving that
 * order matters: a loader that reaches this composition before the host is
 * resolved reintroduces the failure. `site-content.ts` avoids the await entirely
 * by resolving its pool synchronously from `getBootstrapConfig`.
 */
export async function deliveryComposition() {
  const context = await getServerRuntimeContext();
  const config = context.config;
  const repo = repository(config, context.bootstrap);
  return { resolver: new HostnameResolver(repo, config.hosts, hostnameCache(config)), content: new NetworkContentService(repo, new NextNetworkSiteCache(config.cache.defaultTtlSeconds)), repository: repo, config };
}
