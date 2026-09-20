import type { AuthorizedTenantActorContext } from '@/core/operation-context';
import type { ActivationAttempt, CacheIdentity, FeedArticle, InvalidationPlan, InvalidationTask, NetworkContentQuery, NetworkSiteData, ResolvedSiteContext } from '@/modules/delivery/models';

export interface NextCacheInvalidationPort {
  revalidateTags(tags: readonly string[]): Promise<void>;
  revalidatePaths(paths: readonly string[]): Promise<void>;
}

export interface NetworkSiteCacheEntry {
  readonly identity: CacheIdentity;
  readonly data: NetworkSiteData | null;
}

export interface NetworkSiteCachePort {
  read(identity: CacheIdentity, tags: readonly string[], loader: () => Promise<NetworkSiteData | null>): Promise<NetworkSiteCacheEntry>;
}

export interface SiteCategory {
  readonly slug: string;
  readonly name: string;
}

/** Single-checkout public read: one tenant context for site, categories, and bypass state. */
export interface PublicBundle {
  readonly site: NetworkSiteData | null;
  readonly categories: readonly SiteCategory[];
  readonly bypassed: boolean;
}

export interface DeliveryRepository {
  findActiveSitesByExactHostname(hostname: string): Promise<readonly ResolvedSiteContext[]>;
  findPendingActivation(hostname: string, attemptId: string): Promise<boolean>;
  loadNetworkSite(context: ResolvedSiteContext, query: NetworkContentQuery): Promise<NetworkSiteData | null>;
  loadNetworkBundle(context: ResolvedSiteContext, query: NetworkContentQuery): Promise<PublicBundle>;
  /** Baris feed RSS (metadata + body, tanpa galeri) untuk satu host. */
  loadNetworkFeed(context: ResolvedSiteContext, limit?: number): Promise<readonly FeedArticle[]>;
  /** Cangkang settings tanpa artikel untuk 404 bermerek. */
  loadSiteShell(context: ResolvedSiteContext): Promise<NetworkSiteData | null>;
  /** Robots kustom tenant (kolom seo settings, tanpa artikel) untuk /robots.txt. */
  loadSiteRobots(context: ResolvedSiteContext): Promise<readonly string[] | null>;
  /** Daftar kategori aktif org (ringan, untuk nav yang identik di semua halaman). */
  loadSiteCategories(context: ResolvedSiteContext): Promise<readonly SiteCategory[]>;
  /**
   * Resolve published article id by slug without loading body or gallery.
   *
   * @param context - Resolved tenant hostname context.
   * @param slug - Normalized article slug candidate.
   * @returns Article id when published on the site, otherwise null.
   */
  resolveArticleId(context: ResolvedSiteContext, slug: string): Promise<string | null>;
  isCacheBypassed(context: ResolvedSiteContext): Promise<boolean>;
  beginActivation(actor: AuthorizedTenantActorContext, siteId: string, hostname: string, previousHostname: string | null, now: string): Promise<ActivationAttempt>;
  updateActivation(actor: AuthorizedTenantActorContext, attemptId: string, activationState: ActivationAttempt['activationState'], externalStatus: Readonly<Record<string, unknown>>, now: string): Promise<ActivationAttempt>;
  failActivation(actor: AuthorizedTenantActorContext, attemptId: string, failure: Readonly<Record<string, unknown>>, nextAttemptAt: string, terminal: boolean, now: string): Promise<ActivationAttempt>;
  claimActivationAttempts(now: string, limit: number, claimToken: string, claimExpiresAt: string): Promise<readonly ActivationAttempt[]>;
  completeActivation(actor: AuthorizedTenantActorContext, attemptId: string, plan: InvalidationPlan, now: string): Promise<ResolvedSiteContext>;
  deactivateSite(actor: AuthorizedTenantActorContext, siteId: string, hostname: string, plan: InvalidationPlan, now: string): Promise<ActivationAttempt>;
  completeDeactivation(actor: AuthorizedTenantActorContext, attemptId: string, now: string): Promise<void>;
  createInvalidation(plan: InvalidationPlan, now: string): Promise<InvalidationTask>;
  claimInvalidations(now: string, limit: number): Promise<readonly InvalidationTask[]>;
  completeInvalidation(task: InvalidationTask, now: string): Promise<void>;
  failInvalidation(task: InvalidationTask, failure: Readonly<Record<string, unknown>>, nextAttemptAt: string, terminal: boolean, now: string): Promise<void>;
}

export class DeliveryResourceUnavailableError extends Error {
  constructor() { super('Network resource unavailable'); }
}
export class DeliveryConflictError extends Error {
  constructor(message = 'Delivery conflict') { super(message); }
}
