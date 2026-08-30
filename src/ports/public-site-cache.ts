import type { CacheIdentity, PublicSiteData } from '@/domain/stage5/models';

export interface PublicSiteCacheEntry {
  readonly identity: CacheIdentity;
  readonly data: PublicSiteData | null;
}

export interface PublicSiteCachePort {
  read(identity: CacheIdentity, tags: readonly string[], loader: () => Promise<PublicSiteData | null>): Promise<PublicSiteCacheEntry>;
}
