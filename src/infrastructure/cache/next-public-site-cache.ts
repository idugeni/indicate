import 'server-only';
import { unstable_cache } from 'next/cache';
import type { CacheIdentity } from '@/domain/stage5/models';
import type { PublicSiteCachePort } from '@/ports/public-site-cache';

export class NextPublicSiteCache implements PublicSiteCachePort {
  constructor(private readonly ttlSeconds: number) {}

  async read(identity: CacheIdentity, tags: readonly string[], loader: Parameters<PublicSiteCachePort['read']>[2]) {
    const cached = unstable_cache(
      async () => ({ identity, data: await loader() }),
      [identity.key],
      { tags: [...tags], revalidate: this.ttlSeconds === 0 ? false : this.ttlSeconds },
    );
    return cached();
  }
}
