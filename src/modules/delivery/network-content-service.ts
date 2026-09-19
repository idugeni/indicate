import { cacheEntryMatches, createCacheIdentity } from '@/modules/delivery/cache-identity';
import type { NetworkContentQuery, NetworkSiteData, ResolvedSiteContext } from '@/modules/delivery/models';
import type { NetworkSiteCachePort } from '@/modules/delivery/ports';
import type { DeliveryRepository } from '@/modules/delivery/ports';
import { TAG_MAX_LENGTH, normalizeSlugCandidate } from '@/modules/site/slug-allocator';

export interface NetworkCacheRequest {
  readonly path: string;
  readonly locale: string;
  readonly preview?: boolean;
  readonly authClass?: 'anonymous' | 'authenticated';
}

export class NetworkContentService {
  constructor(private readonly repository: Pick<DeliveryRepository, 'loadNetworkSite' | 'loadNetworkBundle' | 'isCacheBypassed'>, private readonly cache?: NetworkSiteCachePort) {}

  async load(context: ResolvedSiteContext, query: NetworkContentQuery = {}, cacheRequest?: NetworkCacheRequest): Promise<NetworkSiteData | null> {
    const sanitized: NetworkContentQuery = {
      ...(query.articleSlug === undefined ? {} : { articleSlug: query.articleSlug.trim().toLowerCase() }),
      ...(query.categorySlug === undefined || query.categorySlug.trim() === '' ? {} : { categorySlug: normalizeSlugCandidate(query.categorySlug) }),
      ...(query.tag === undefined || query.tag.trim() === '' ? {} : { tag: normalizeSlugCandidate(query.tag).slice(0, TAG_MAX_LENGTH) }),
      ...(query.search === undefined || query.search.trim() === '' ? {} : { search: query.search.trim().slice(0, 120) }),
    };
    const load = () => this.repository.loadNetworkSite(context, sanitized);
    const bypassed = await this.repository.isCacheBypassed(context);
    const preview = cacheRequest?.preview ?? false;
    const authClass = cacheRequest?.authClass ?? 'anonymous';
    const queryDimensions = Object.fromEntries(Object.entries(sanitized).map(([key, value]) => [key, String(value)]));
    const identity = cacheRequest === undefined ? null : createCacheIdentity({ context, locale: cacheRequest.locale, path: cacheRequest.path, query: queryDimensions, preview, authClass });
    let data: NetworkSiteData | null;
    if (bypassed || this.cache === undefined || identity === null || preview || authClass !== 'anonymous') {
      data = (await this.repository.loadNetworkBundle(context, sanitized)).site;
    } else {
      const entry = await this.cache.read(identity, [`host:${context.normalizedHostname}`, `org:${context.organizationId}`, `site:${context.siteId}`], load);
      data = cacheEntryMatches(entry.identity, context) ? entry.data : await load();
    }
    if (data === null) return null;
    if (data.context.organizationId !== context.organizationId || data.context.siteId !== context.siteId || data.context.normalizedHostname !== context.normalizedHostname || data.context.routingVersion !== context.routingVersion || data.context.contentVersion !== context.contentVersion) return null;
    return data;
  }
}
