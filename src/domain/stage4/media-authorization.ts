import type { HostnameContext } from '@/domain/context/operation-context';
import type { MediaAssetRecord, Stage4ArticleRef, Stage4ArticleSiteRef, Stage4SiteRef } from './models';

export function canTenantAccessMedia(organizationId: string, media: MediaAssetRecord): boolean {
  return media.organizationId === organizationId && media.state === 'active';
}

export function canPublicAccessMedia(input: {
  readonly context: HostnameContext;
  readonly media: MediaAssetRecord;
  readonly site: Stage4SiteRef;
  readonly articles: readonly Stage4ArticleRef[];
  readonly articleSites: readonly Stage4ArticleSiteRef[];
}): boolean {
  const { context, media, site, articles, articleSites } = input;
  if (media.state !== 'active' || media.organizationId !== context.organizationId || site.id !== context.siteId
      || site.organizationId !== context.organizationId || !site.active) return false;
  if (site.settingsMediaIds.includes(media.id)) return true;
  if (media.owner.kind !== 'article') return false;
  const articleId = media.owner.articleId;
  if (!articles.some((article) => article.id === articleId
      && article.organizationId === context.organizationId && article.active)) return false;
  return articleSites.some((relation) => relation.organizationId === context.organizationId
    && relation.siteId === context.siteId && relation.articleId === articleId
    && relation.active && relation.state === 'published');
}
