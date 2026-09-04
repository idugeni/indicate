import 'server-only';
import { unstable_cache } from 'next/cache';
import type { CacheIdentity } from '@/modules/delivery/models';
import type { NetworkSiteCachePort } from '@/modules/delivery/ports';

export class NextNetworkSiteCache implements NetworkSiteCachePort {
  constructor(private readonly ttlSeconds: number) {}

  async read<T>(identity: CacheIdentity, tags: readonly string[], loader: () => Promise<T>) {
    const cached = unstable_cache(
      async () => ({ identity, data: await loader() }),
      [identity.key],
      { tags: [...tags], revalidate: this.ttlSeconds === 0 ? false : this.ttlSeconds },
    );
    return cached();
  }
}
