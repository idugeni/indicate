import type { AuthorizedTenantActorContext } from '@/core/operation-context';
import type { ActivationAttemptRecord, AnalyticsProjection, AuditFilter, AuditRecord, ConfigurationScope, DashboardProjection, DashboardTenantState, EditorialScope, EditorialSummaries, EditorialSummaryArticle, InvitationSummary, NetworkArticlesScope, OperationsProjection, PublisherClaimScope, PublisherScope, RetentionRunRecord, TaxonomyScope } from '@/modules/dashboard/models';

export type MutableTenantState = {
  -readonly [Key in keyof DashboardTenantState]: DashboardTenantState[Key] extends readonly (infer Item)[] ? Item[] : DashboardTenantState[Key];
};

/** Collections `load()` can hydrate; `execute()` loads only the scoped subset per mutation. */
export type DashboardCollectionName =
  | 'domains' | 'regions' | 'sites' | 'siteSettings' | 'roles' | 'memberships'
  | 'publishers' | 'affiliations' | 'categories' | 'authors' | 'articles' | 'articleCategories'
  | 'articleSites' | 'media' | 'publishingJobs' | 'publishingJobTargets';

export interface DashboardTransaction {
  readonly state: MutableTenantState;
  readonly articleContentTouched: Set<string>;
  resolveUserDisplayName(userId: string): Promise<string | null>;
  /** Re-read one article's body/bodyJson into state; false when the row no longer exists. */
  refreshArticleContent(articleId: string): Promise<boolean>;
  appendAudit(event: Omit<AuditRecord, 'id' | 'organizationId' | 'actorType' | 'actorId' | 'entryPoint' | 'requestId' | 'occurredAt'>): void;
}

export interface CachePurgeTarget {
  readonly siteId: string;
  readonly hostname: string;
}

export interface DashboardRepository {
  /** Scoped configuration read (identity, geography, access); no articles, assignments, media, or jobs. */
  readConfigurationScope(actor: AuthorizedTenantActorContext, permission: string): Promise<ConfigurationScope>;
  /** Scoped publisher read (publishers, claims, mini geography). */
  readPublisherScope(actor: AuthorizedTenantActorContext, permission: string): Promise<PublisherScope>;
  /** Scoped editorial read (server-ordered, keyset-paged articles plus board lookups). */
  readEditorialScope(actor: AuthorizedTenantActorContext, permission: string, filter: { readonly regionId?: string; readonly siteId?: string; readonly siteHostname?: string; readonly categoryId?: string; readonly publisherId?: string; readonly authorId?: string; readonly publicationState?: string; readonly status?: string; readonly tag?: string; readonly search?: string; readonly sort?: 'updated' | 'published-desc' | 'published-asc' | 'title' | 'syndicated' }, page?: { readonly limit?: number; readonly cursor?: string }): Promise<EditorialScope>;
  /** Scoped taxonomy read (narrow article facets for counting, never bodies). */
  readTaxonomyScope(actor: AuthorizedTenantActorContext, permission: string): Promise<TaxonomyScope>;
  /** Scoped publisher-claim read (one publisher plus its claim rows). */
  readPublisherClaimScope(actor: AuthorizedTenantActorContext, permission: string, publisherId: string, siteId: string): Promise<PublisherClaimScope>;
  /** Scoped network-article read (one site plus its published articles and attribution inputs). */
  readNetworkArticlesScope(actor: AuthorizedTenantActorContext, permission: string, siteId: string, filter: { readonly regionId?: string; readonly categoryId?: string; readonly publisherId?: string; readonly authorId?: string; readonly search?: string }): Promise<NetworkArticlesScope>;
  /** Bodyless editorial summary (title + sites + in-scope regions); without loading the full tenant state. */
  listEditorialSummaries(actor: AuthorizedTenantActorContext, permission: string): Promise<EditorialSummaries>;
  /** Search articles by title/body on the database side (desc, bounded); without loading the full tenant state. */
  searchArticleSummaries(actor: AuthorizedTenantActorContext, permission: string, keyword: string, limit: number): Promise<readonly EditorialSummaryArticle[]>;
  /** Count summary for the dashboard view; without loading the full tenant state. */
  dashboardCounts(actor: AuthorizedTenantActorContext, permission: string): Promise<DashboardProjection>;
  /** Analytics aggregation (group-by) for a date range; without loading the full tenant state. */
  analyticsSummary(
    actor: AuthorizedTenantActorContext,
    permission: string,
    filter: { readonly from?: string | undefined; readonly to?: string | undefined },
  ): Promise<AnalyticsProjection>;
  /** Latest audit log (desc, keyset pages) matching the filter; list carries no before/after payloads. */
  auditLogPage(actor: AuthorizedTenantActorContext, permission: string, filter: AuditFilter, page?: { readonly limit?: number; readonly cursor?: string }): Promise<{ readonly logs: readonly AuditRecord[]; readonly nextCursor: string | null }>;
  /** Retention/sweep run evidence (global + org); without loading the full tenant state. */
  retentionRuns(actor: AuthorizedTenantActorContext, permission: string): Promise<readonly RetentionRunRecord[]>;
  /** Domain activation attempts (desc, bounded); without loading the full tenant state. */
  activationAttempts(actor: AuthorizedTenantActorContext, permission: string): Promise<readonly ActivationAttemptRecord[]>;
  /** Create a single-use member invitation for the actor org; without loading the full tenant state. */
  createInvitation(actor: AuthorizedTenantActorContext, permission: string, input: { readonly email: string; readonly roleId: string; readonly tokenHash: string }): Promise<{ readonly id: string }>;
  /** List the actor org's invitations (max 100, newest first); without loading the full tenant state. */
  listInvitations(actor: AuthorizedTenantActorContext, permission: string): Promise<readonly InvitationSummary[]>;
  /** Revoke a pending invitation owned by the actor org. */
  revokeInvitation(actor: AuthorizedTenantActorContext, permission: string, input: { readonly id: string }): Promise<{ readonly id: string }>;
  /** Read-only operations summary (desc, bounded); without loading the full tenant state. */
  operationsSummary(actor: AuthorizedTenantActorContext, permission: string): Promise<OperationsProjection>;
  /** Enqueue a manual cache purge per site (null = all in scope); executed directly by the dispatcher. */
  enqueueCachePurge(actor: AuthorizedTenantActorContext, permission: string, siteId: string | null): Promise<readonly CachePurgeTarget[]>;
  recordDenied(actor: AuthorizedTenantActorContext, action: string, targetType: string): Promise<void>;
  /**
   * Resolve an active organization id by slug across org boundaries (platform stewards only).
   *
   * @param actor - Calling actor; must carry the platform super-admin grant.
   * @param slug - Organization slug to resolve.
   * @returns Organization id, or null when no active org carries the slug.
   */
  findOrganizationBySlug(actor: AuthorizedTenantActorContext, slug: string): Promise<string | null>;
  /**
   * Resolve active organization ids for many slugs in one round trip (platform stewards only).
   *
   * @param actor - Calling actor; must carry the platform super-admin grant.
   * @param slugs - Organization slugs to resolve.
   * @returns Id keyed by slug; unknown slugs are simply absent.
   */
  findOrganizationsBySlugs(actor: AuthorizedTenantActorContext, slugs: readonly string[]): Promise<ReadonlyMap<string, string>>;
  execute<T>(
    actor: AuthorizedTenantActorContext,
    permission: string,
    operation: (transaction: DashboardTransaction) => T | Promise<T>,
    scope?: readonly DashboardCollectionName[],
  ): Promise<T>;
  /**
   * Run a mutation in another organization's context for platform stewards.
   *
   * @param actor - Calling actor; must carry the platform super-admin grant.
   * @param targetOrganizationId - Organization owning the rows being written.
   * @param operation - Mutation against the target organization's state.
   * @param scope - Collections to hydrate, same contract as `execute()`.
   * @returns Whatever the operation returns.
   * @remarks Membership authorization is replaced by the platform grant check;
   * the audit trail keeps the calling admin as actor while rows and audit
   * entries belong to the target organization.
   */
  executeForOrganization<T>(
    actor: AuthorizedTenantActorContext,
    targetOrganizationId: string,
    operation: (transaction: DashboardTransaction) => T | Promise<T>,
    scope?: readonly DashboardCollectionName[],
  ): Promise<T>;
  /**
   * Terbitkan artikel milik org lain ke portal org aktif (jembatan lintas-org).
   *
   * @param actor - Steward pemanggil; wajib membawa grant platform super_admin.
   * @param input - Org pemilik, artikel, dan situs penyaji tujuan.
   * @returns Id baris bridge dan slug untuk invalidasi.
   */
  requestBridgePublication(actor: AuthorizedTenantActorContext, input: { readonly ownerOrganizationId: string; readonly articleId: string; readonly siteIds: readonly string[] }): Promise<{ readonly bridgeIds: readonly string[]; readonly slug: string }>;
  /**
   * Tarik penayangan jembatan; artikel pemilik tidak diubah.
   *
   * @param actor - Steward pemanggil; wajib membawa grant platform super_admin.
   * @param input - Org pemilik, artikel, dan situs yang ditarik (kosong = semua).
   * @returns Jumlah baris bridge yang diturunkan.
   */
  unpublishBridge(actor: AuthorizedTenantActorContext, input: { readonly ownerOrganizationId: string; readonly articleId: string; readonly siteIds: readonly string[] }): Promise<{ readonly unpublished: number }>;
}

export class DashboardAccessDeniedError extends Error {
  constructor() { super('Dashboard tenant resource unavailable'); }
}

export class DashboardConflictError extends Error {
  constructor() { super('The record was changed by another operation.'); }
}

/**
 * Reject a manual bulk purge issued inside the per-organization cooldown window.
 *
 * @param retryAfterSeconds - Seconds the caller should wait before retrying.
 */
export class DashboardRateLimitedError extends Error {
  constructor(readonly retryAfterSeconds: number) { super(`Manual purge rate limited, retry after ${retryAfterSeconds}s.`); }
}

/** Outside the writable states, mutations fail explicitly (renew prompt, not a non-disclosing denial). */
export class DashboardSubscriptionInactiveError extends Error {
  constructor(
    readonly accessState: string,
  ) { super(`Subscription is not writable (state ${accessState}).`); }
}
