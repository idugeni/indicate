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

/**
 * Cakupan artikel nasional (tanpa wilayah) hanya untuk aktor tanpa kunci.
 *
 * @param article - Artikel yang diperiksa; `regionId` null berarti nasional.
 * @param lock - Kunci wilayah aktor; null berarti admin tak terbatas.
 * @param geography - Geografi tenant untuk resolusi induk kota.
 * @returns True bila aktor boleh melihat artikel.
 * @remarks Berbeda dari portal apex yang selalu terlihat: artikel nasional
 * disembunyikan dari aktor terkunci agar selaras dengan RLS yang menyimpan
 * `region_id = current` tanpa pengecualian NULL.
 */
export function articleInScope(article: { readonly regionId: string | null }, lock: string | null, geography: readonly ScopeGeography[]): boolean {
  if (article.regionId === null) return lock === null;
  return regionScopeCovers(lock, article.regionId, geography);
}

export function requireUnrestrictedRegion(actor: AuthorizedTenantActorContext): void {
  if (regionLock(actor) !== null) throw new DashboardAccessDeniedError();
}

export function requireSiteInScope<T extends Pick<SiteRecord, 'id' | 'regionId'>>(state: { readonly sites: readonly T[]; readonly regions: readonly ScopeGeography[] }, siteId: string, actor: AuthorizedTenantActorContext): T {
  const site = requireRecord(state.sites, siteId);
  if (!regionScopeCovers(regionLock(actor), site.regionId, state.regions)) throw new DashboardAccessDeniedError();
  return site;
}

export function requireArticleInScope<T extends Pick<ArticleRecord, 'id' | 'regionId'>>(state: { readonly articles: readonly T[]; readonly regions: readonly ScopeGeography[] }, articleId: string, actor: AuthorizedTenantActorContext): T {
  const article = requireRecord(state.articles, articleId);
  if (!regionScopeCovers(regionLock(actor), article.regionId, state.regions)) throw new DashboardAccessDeniedError();
  return article;
}

/**
 * Kunci nilai wilayah dengan pengecualian nasional khusus admin.
 *
 * @param state - State tenant untuk resolusi geografi.
 * @param actor - Aktor yang menulis; null `regionId` menuntut kunci null.
 * @param regionId - Geografi yang diminta; null berarti artikel nasional.
 * @throws {DashboardAccessDeniedError} Bila aktor terkunci meminta nasional
 * atau geografi di luar cakupannya.
 */
export function requireLockedRegionValue(state: Pick<DashboardTenantState, 'regions'>, actor: AuthorizedTenantActorContext, regionId: string | null): void {
  if (regionId === null) {
    if (regionLock(actor) !== null) throw new DashboardAccessDeniedError();
    return;
  }
  if (!regionScopeCovers(regionLock(actor), regionId, state.regions)) throw new DashboardAccessDeniedError();
}
