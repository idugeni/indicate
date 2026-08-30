import { cacheEntryMatches, createCacheIdentity } from '@/application/stage5/cache-identity';
import type { PublicContentQuery, PublicSiteData, ResolvedSiteContext } from '@/domain/stage5/models';
import type { PublicSiteCachePort } from '@/ports/public-site-cache';
import type { Stage5Repository } from '@/ports/stage5-repository';

export interface PublicCacheRequest {
  readonly path: string;
  readonly locale: string;
  readonly preview?: boolean;
  readonly authClass?: 'anonymous' | 'authenticated';
}

export class PublicContentService {
  constructor(private readonly repository: Pick<Stage5Repository, 'loadPublicSite' | 'isCacheBypassed'>, private readonly cache?: PublicSiteCachePort) {}

  async load(context: ResolvedSiteContext, query: PublicContentQuery = {}, cacheRequest?: PublicCacheRequest): Promise<PublicSiteData | null> {
    const sanitized: PublicContentQuery = {
      ...(query.articleSlug === undefined ? {} : { articleSlug: query.articleSlug.trim().toLowerCase() }),
      ...(query.categorySlug === undefined ? {} : { categorySlug: query.categorySlug.trim().toLowerCase() }),
      ...(query.search === undefined || query.search.trim() === '' ? {} : { search: query.search.trim().slice(0, 120) }),
    };
    const load = () => this.repository.loadPublicSite(context, sanitized);
    const bypassed = await this.repository.isCacheBypassed(context);
    const preview = cacheRequest?.preview ?? false;
    const authClass = cacheRequest?.authClass ?? 'anonymous';
    const queryDimensions = Object.fromEntries(Object.entries(sanitized).map(([key, value]) => [key, String(value)]));
    const identity = cacheRequest === undefined ? null : createCacheIdentity({ context, locale: cacheRequest.locale, path: cacheRequest.path, query: queryDimensions, preview, authClass });
    let data: PublicSiteData | null;
    if (bypassed || this.cache === undefined || identity === null || preview || authClass !== 'anonymous') {
      data = await load();
    } else {
      const entry = await this.cache.read(identity, [`host:${context.normalizedHostname}`, `org:${context.organizationId}`, `site:${context.siteId}`], load);
      data = cacheEntryMatches(entry.identity, context) ? entry.data : await load();
    }
    if (data === null) return null;
    if (data.context.organizationId !== context.organizationId || data.context.siteId !== context.siteId || data.context.normalizedHostname !== context.normalizedHostname || data.context.routingVersion !== context.routingVersion || data.context.contentVersion !== context.contentVersion) return null;
    return data;
  }
}
