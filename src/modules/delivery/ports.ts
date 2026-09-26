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
  /** RSS feed row (metadata + body, no gallery) for one host. */
  loadNetworkFeed(context: ResolvedSiteContext, limit?: number): Promise<readonly FeedArticle[]>;
  /** Article-less settings shell for branded 404s. */
  loadSiteShell(context: ResolvedSiteContext): Promise<NetworkSiteData | null>;
  /**
   * Resolve the active brand media id (logo or favicon) for stable same-host byte routes.
   *
   * @param context - Resolved tenant hostname context.
   * @param kind - Brand slot to resolve.
   * @returns Media id honoring regional apex inheritance, or null when unset.
   */
  resolveBrandMediaId(context: ResolvedSiteContext, kind: 'logo' | 'favicon'): Promise<string | null>;
  /** Tenant custom robots (seo settings column, no articles) for /robots.txt. */
  loadSiteRobots(context: ResolvedSiteContext): Promise<readonly string[] | null>;
  /** Active org category list (lightweight, for the identical nav on every page). */
  loadSiteCategories(context: ResolvedSiteContext): Promise<readonly SiteCategory[]>;
  /**
   * Resolve published article id by slug without loading body or gallery.
   *
   * @param context - Resolved tenant hostname context.
   * @param slug - Normalized article slug candidate.
   * @returns Article id when published on the site, otherwise null.
   */
  resolveArticleId(context: ResolvedSiteContext, slug: string): Promise<string | null>;
  isCacheBypassed(context: Pick<ResolvedSiteContext, 'organizationId' | 'siteId'>): Promise<boolean>;
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

/** One public article URL that has never been handed to a social scraper. */
export interface SocialWarmTarget {
  readonly articleSiteId: string;
  readonly url: string;
}

/**
 * Durable record of which article URLs already reached Meta's scrape backend.
 *
 * @remarks Kept separate from `DeliveryRepository` because the warmer needs only
 * these two operations, and a failed warm must stay retryable: a target is
 * marked after Meta accepted the URL, never before, so a crash or a budget
 * cutoff leaves it due for the next dispatch.
 */
export interface SocialWarmLedger {
  /** Oldest-due article URLs, so a retried one is served before a newer one. */
  dueTargets(limit: number): Promise<readonly SocialWarmTarget[]>;
  markWarmed(articleSiteIds: readonly string[], now: Date): Promise<void>;
}

export class DeliveryResourceUnavailableError extends Error {
  constructor() { super('Network resource unavailable'); }
}
export class DeliveryConflictError extends Error {
  constructor(message = 'Delivery conflict') { super(message); }
}
