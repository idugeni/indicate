import { cacheEntryMatches, createCacheIdentity } from '@/modules/delivery/cache-identity';
import type { FeedArticle, NetworkContentQuery, NetworkSiteData, ResolvedSiteContext } from '@/modules/delivery/models';
import type { NetworkSiteCachePort } from '@/modules/delivery/ports';
import type { DeliveryRepository } from '@/modules/delivery/ports';
import { TAG_MAX_LENGTH, normalizeSlugCandidate } from '@/modules/site/slug-allocator';

/**
 * Cache identity namespace for the RSS feed.
 *
 * @remarks The feed carries no locale dimension — one document per host — so a fixed marker keeps its key disjoint from the locale-keyed page entries.
 */
const FEED_CACHE_LOCALE = 'feed';

function siteCacheTags(context: ResolvedSiteContext): readonly string[] {
  return [`host:${context.normalizedHostname}`, `org:${context.organizationId}`, `site:${context.siteId}`];
}

export interface NetworkCacheRequest {
  readonly path: string;
  readonly locale: string;
  readonly preview?: boolean;
  readonly authClass?: 'anonymous' | 'authenticated';
}

export class NetworkContentService {
  constructor(private readonly repository: Pick<DeliveryRepository, 'loadNetworkSite' | 'loadNetworkBundle' | 'loadNetworkFeed' | 'loadSiteShell' | 'resolveArticleId' | 'isCacheBypassed'>, private readonly cache?: NetworkSiteCachePort) {}

  async load(context: ResolvedSiteContext, query: NetworkContentQuery = {}, cacheRequest?: NetworkCacheRequest, bypassedOverride?: boolean): Promise<NetworkSiteData | null> {
    const sanitized: NetworkContentQuery = {
      ...(query.articleSlug === undefined ? {} : { articleSlug: query.articleSlug.trim().toLowerCase() }),
      ...(query.categorySlug === undefined || query.categorySlug.trim() === '' ? {} : { categorySlug: normalizeSlugCandidate(query.categorySlug) }),
      ...(query.tag === undefined || query.tag.trim() === '' ? {} : { tag: normalizeSlugCandidate(query.tag).slice(0, TAG_MAX_LENGTH) }),
      ...(query.search === undefined || query.search.trim() === '' ? {} : { search: query.search.trim().slice(0, 120) }),
    };
    const preview = cacheRequest?.preview ?? false;
    const authClass = cacheRequest?.authClass ?? 'anonymous';
    const queryDimensions = Object.fromEntries(Object.entries(sanitized).map(([key, value]) => [key, String(value)]));
    const identity = cacheRequest === undefined ? null : createCacheIdentity({ context, locale: cacheRequest.locale, path: cacheRequest.path, query: queryDimensions, preview, authClass });
    const data = this.cache === undefined || identity === null || preview || authClass !== 'anonymous'
      ? (await this.repository.loadNetworkBundle(context, sanitized)).site
      : await this.loadThroughCache(context, sanitized, this.cache, identity, bypassedOverride);
    if (data === null) return null;
    if (data.context.organizationId !== context.organizationId || data.context.siteId !== context.siteId || data.context.normalizedHostname !== context.normalizedHostname || data.context.routingVersion !== context.routingVersion || data.context.contentVersion !== context.contentVersion) return null;
    return data;
  }

  /**
   * Read one anonymous page through the data cache.
   *
   * @remarks The bypass flag is read here rather than before the branch that selects the loader, because a preview, authenticated, or cache-less request goes straight to `loadNetworkBundle` and that same transaction already returns the flag. Deciding it up front made every such request spend one extra round trip repeating a read the bundle performs anyway.
   */
  private async loadThroughCache(
    context: ResolvedSiteContext,
    sanitized: NetworkContentQuery,
    cache: NetworkSiteCachePort,
    identity: NonNullable<ReturnType<typeof createCacheIdentity>>,
    bypassedOverride: boolean | undefined,
  ): Promise<NetworkSiteData | null> {
    if (bypassedOverride ?? await this.repository.isCacheBypassed(context)) {
      return (await this.repository.loadNetworkBundle(context, sanitized)).site;
    }
    const load = () => this.repository.loadNetworkSite(context, sanitized);
    const entry = await cache.read(identity, siteCacheTags(context), load);
    return cacheEntryMatches(entry.identity, context) ? entry.data : await load();
  }

  async loadFeed(context: ResolvedSiteContext, limit = 50): Promise<readonly FeedArticle[]> {
    const load = () => this.repository.loadNetworkFeed(context, limit);
    const identity = createCacheIdentity({ context, locale: FEED_CACHE_LOCALE, path: '/rss.xml', query: { limit: String(limit) }, preview: false, authClass: 'anonymous' });
    if (this.cache === undefined || identity === null) return load();
    const entry = await this.cache.read(identity, siteCacheTags(context), load);
    return cacheEntryMatches(entry.identity, context) ? entry.data : await load();
  }

  async loadShell(context: ResolvedSiteContext): Promise<NetworkSiteData | null> {
    return this.repository.loadSiteShell(context);
  }

  /**
   * Resolve a published article id by slug without body or gallery reads.
   *
   * @param context - Resolved tenant hostname context.
   * @param slug - Raw slug candidate from the caller.
   * @returns Article id when published on the site, otherwise null.
   */
  async resolveArticleId(context: ResolvedSiteContext, slug: string): Promise<string | null> {
    const normalized = slug.trim().toLowerCase();
    if (normalized === '') return null;
    return this.repository.resolveArticleId(context, normalized);
  }
}
