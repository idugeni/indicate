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

declare global { var indicateDeliveryRepository: DeliveryRepository | undefined; }
function repository(config: RuntimeConfig, bootstrap: BootstrapConfig): DeliveryRepository {
  if (globalThis.indicateDeliveryRepository !== undefined) return globalThis.indicateDeliveryRepository;
  const isPlaceholder = config.supabase.pooledDatabaseUrl.includes('abcdefghijklmnop') || config.supabase.pooledDatabaseUrl.includes('replace-password');
  if (isPlaceholder) {
    throw new Error('delivery_repository_unconfigured');
  }
  globalThis.indicateDeliveryRepository = new DrizzleDeliveryRepository(getSharedRuntimeDatabase(bootstrap).db, config.seo.defaultAssetUrl);
  return globalThis.indicateDeliveryRepository;
}
export async function deliveryComposition() {
  const context = await getServerRuntimeContext();
  const config = context.config;
  const repo = repository(config, context.bootstrap);
  return { resolver: new HostnameResolver(repo, config.hosts), content: new NetworkContentService(repo, new NextNetworkSiteCache(config.cache.defaultTtlSeconds)), repository: repo, config };
}
