import type { AuthorizedTenantActorContext } from '@/core/operation-context';
import { requireRecord } from '@/modules/dashboard/tenant-service-records';
import { DashboardAccessDeniedError } from '@/modules/dashboard/ports';
import type { ArticleRecord, DashboardTenantState, SiteRecord } from '@/modules/dashboard/models';
import { regionScopeCovers, type ScopeGeography } from '@/modules/site/region-scope';

export function regionLock(actor: AuthorizedTenantActorContext): string | null {
  return actor.regionScopeId ?? null;
}

export function siteInScope(site: { readonly regionId: string | null }, lock: string | null, geography: readonly ScopeGeography[]): boolean {
  return regionScopeCovers(lock, site.regionId, geography);
}

export function articleInScope(article: { readonly regionId: string }, lock: string | null, geography: readonly ScopeGeography[]): boolean {
  return regionScopeCovers(lock, article.regionId, geography);
}

export function requireUnrestrictedRegion(actor: AuthorizedTenantActorContext): void {
  if (regionLock(actor) !== null) throw new DashboardAccessDeniedError();
}

export function requireSiteInScope(state: DashboardTenantState, siteId: string, actor: AuthorizedTenantActorContext): SiteRecord {
  const site = requireRecord(state.sites, siteId);
  if (!regionScopeCovers(regionLock(actor), site.regionId, state.regions)) throw new DashboardAccessDeniedError();
  return site;
}

export function requireArticleInScope(state: DashboardTenantState, articleId: string, actor: AuthorizedTenantActorContext): ArticleRecord {
  const article = requireRecord(state.articles, articleId);
  if (!regionScopeCovers(regionLock(actor), article.regionId, state.regions)) throw new DashboardAccessDeniedError();
  return article;
}

export function requireLockedRegionValue(state: DashboardTenantState, actor: AuthorizedTenantActorContext, regionId: string): void {
  if (!regionScopeCovers(regionLock(actor), regionId, state.regions)) throw new DashboardAccessDeniedError();
}
