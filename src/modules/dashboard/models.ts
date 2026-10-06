export type LifecycleStatus = 'active' | 'inactive' | 'archived';
export type ArticleStatus = 'draft' | 'in_review' | 'scheduled' | 'active' | 'archived';
export type PublishingState = 'queued' | 'processing' | 'published' | 'failed' | 'retrying' | 'unpublished';
export type PublisherType =
  | 'government_institution'
  | 'correctional_institution'
  | 'public_relations_office'
  | 'company'
  | 'organization'
  | 'community'
  | 'independent_publisher';
export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

/** Portal level in the apex -> region -> city tree; matches the `site_level` enum. */
export type SiteLevel = 'apex' | 'region' | 'city';

/** Membership tier bound to `roles.tier`; `superadmin` lives only in the platform organization. */
export type RoleTier = 'admin' | 'user' | 'superadmin';

export interface VersionedRecord {
  readonly id: string;
  readonly organizationId: string;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface DomainRecord extends VersionedRecord {
  readonly normalizedHostname: string;
  readonly status: LifecycleStatus;
  /** `national` = apex portal only; `regional` = apex + region + city chain (DB-enforced). */
  readonly siteTopology: 'national' | 'regional';
  /** Cloudflare zone id; null until the domain is linked (required before activation by DB guard). */
  readonly cloudflareZoneId: string | null;
  readonly routingVersion: number;
}

export interface RegionRecord extends VersionedRecord {
  readonly externalKey: string;
  readonly name: string;
  /** Familiar public label (Jateng, Jabar); null when the geography has none. */
  readonly shortName: string | null;
  readonly slug: string;
  readonly status: LifecycleStatus;
  readonly kind: 'region' | 'city';
  readonly parentRegionId: string | null;
}

export interface SiteRecord extends VersionedRecord {
  readonly domainId: string;
  readonly regionId: string | null;
  /** Position in the apex -> region -> city tree; mirrors the geography kind. */
  readonly siteLevel: SiteLevel;
  readonly parentSiteId: string | null;
  readonly normalizedHostname: string;
  readonly status: LifecycleStatus;
  readonly activationState: 'inactive' | 'pending' | 'active' | 'failed';
}

export interface NavigationItem {
  readonly label: string;
  readonly path: string;
}

/** Per-site robots follows the `seo_robots_directive` enum in the database. */
export type SeoRobotsDirective = 'index,follow' | 'noindex,nofollow';

export interface SiteSettingsRecord extends VersionedRecord {
  readonly siteId: string;
  readonly name: string;
  readonly description: string;
  readonly tagline: string | null;
  readonly seoDefaultTitle: string | null;
  readonly seoDefaultDescription: string | null;
  readonly seoOpenGraphSiteName: string | null;
  readonly locale: string | null;
  readonly seoRobotsDirective: SeoRobotsDirective | null;
  readonly colors: Readonly<Record<string, string>>;
  readonly socialLinks: Readonly<Record<string, string>>;
  readonly seo: Readonly<Record<string, unknown>>;
  readonly navigation: readonly NavigationItem[];
  readonly logoMediaId: string | null;
  readonly faviconMediaId: string | null;
  readonly defaultMediaId: string | null;
  /**
   * Whether this site's article pages serve a reader comment thread.
   *
   * @remarks One Disqus forum serves the network, so this is a per-site opt-in
   * rather than a tenant-wide setting. Enabling it makes the site a data
   * controller for reader comment data processed by a third party in the United
   * States, which is why it is off until an operator turns it on deliberately.
   */
  readonly commentsEnabled: boolean;
}

export interface RoleRecord extends VersionedRecord {
  readonly name: string;
  readonly tier: RoleTier;
  readonly active: boolean;
  readonly permissions: ReadonlySet<string>;
}

/**
 * JSON-serializable role shape for API responses. The domain uses `Set`,
 * which is lost under `NextResponse.json` — this DTO carries an array so the
 * UI can read and round-trip the permission list as-is.
 */
export interface RoleListItem extends Omit<RoleRecord, 'permissions'> {
  readonly permissions: readonly string[];
}

export interface MembershipRecord extends VersionedRecord {
  readonly userId: string;
  readonly displayName: string;
  readonly avatarUrl: string | null;
  readonly roleId: string;
  readonly status: LifecycleStatus;
  /** Region key; NULL means all regions. */
  readonly regionId: string | null;
}

export interface PublisherRecord extends VersionedRecord {
  readonly name: string;
  readonly type: PublisherType;
  readonly attributionLabel: string;
  readonly contacts: Readonly<Record<string, string>>;
  readonly evidenceReference: string | null;
  readonly verificationStatus: VerificationStatus;
  readonly submittedBy: string | null;
  readonly submittedAt: string | null;
  readonly verifiedBy: string | null;
  readonly verifiedAt: string | null;
  readonly rejectionReason: string | null;
  readonly status: LifecycleStatus;
}

export interface OfficialAffiliationRecord extends VersionedRecord {
  readonly publisherId: string;
  readonly siteId: string;
  readonly institutionName: string;
  readonly claimScopes: readonly string[];
  readonly evidenceReference: string;
  readonly active: boolean;
  readonly verifiedAt: string | null;
}

export interface CategoryRecord extends VersionedRecord {
  readonly name: string;
  readonly slug: string;
  readonly status: LifecycleStatus;
}

/**
 * Category an article falls back to when the editor files none.
 *
 * Seeding one neutral label keeps an article browsable: every category listing
 * and the NewsArticle `articleSection` are driven by a non-null
 * `categorySlug`/`categoryName`, so a categoryless article disappears from the
 * nav, the author profile, and the structured data at once. Seeded per
 * organization by `20260926200000_default_article_category.sql`, then relabelled
 * from `umum` to `berita` by `20260928070000_default_article_category_berita.sql`.
 */
export const DEFAULT_CATEGORY_SLUG = 'berita';

export interface AuthorRecord extends VersionedRecord {
  readonly displayName: string;
  readonly byline: string;
  readonly status: LifecycleStatus;
}

export interface ArticleRecord extends VersionedRecord {
  readonly regionId: string | null;
  readonly publisherId: string | null;
  readonly categoryId: string | null;
  /** Ordered category set; first entry mirrors the primary `categoryId`. */
  readonly categoryIds: readonly string[];
  readonly authorId: string | null;
  readonly leadMediaId: string | null;
  readonly coverImageUrl: string | null;
  readonly slug: string;
  readonly title: string;
  readonly excerpt: string | null;
  readonly canonicalUrl: string | null;
  readonly body: string;
  /** Structured TipTap JSON; null for legacy plain-text articles. */
  readonly bodyJson: unknown | null;
  readonly source: string;
  readonly tags: readonly string[];
  readonly status: ArticleStatus;
  /** Presentation mode; mirrors the `article_type` enum. */
  readonly type: 'standard' | 'video' | 'gallery' | 'audio' | 'liveblog' | 'short';
  /** Paid-content flag driving the sponsored disclosure on delivery surfaces. */
  readonly isSponsored: boolean;
  /** Canonical external watch/file URL for `video` mode; null otherwise. */
  readonly videoUrl: string | null;
  /** Canonical external listen/file URL for `audio` mode; null otherwise. */
  readonly audioUrl: string | null;
  /** Playback length in whole seconds for `video`/`audio` modes; null otherwise. */
  readonly durationSeconds: number | null;
  readonly publishedAt: string | null;
  readonly scheduledAt: string | null;
  readonly archivedAt: string | null;
}

export interface ArticleCategoryRecord {
  readonly articleId: string;
  readonly categoryId: string;
  readonly position: number;
}

/** One ordered liveblog entry of a `liveblog`-mode article. */
export interface ArticleUpdateRecord extends VersionedRecord {
  readonly articleId: string;
  readonly body: string;
  readonly sortOrder: number;
  readonly publishedAt: string | null;
  /** Actor id that wrote the entry; shown nowhere public, kept for audit. */
  readonly createdBy: string;
}

export interface ArticleSiteRecord extends VersionedRecord {
  readonly articleId: string;
  readonly siteId: string;
  readonly state: PublishingState;
  /** Timestamp of the current publication state transition; metadata-only edits preserve it. */
  readonly stateOccurredAt: string;
  readonly publishedUrl: string | null;
  readonly publishedAt: string | null;
  readonly active: boolean;
  readonly viewCount: number;
  readonly assignmentSource: 'manual' | 'auto';
  readonly expandedFromSiteId: string | null;
  readonly customCanonicalUrl: string | null;
}

export interface MediaSummary {
  readonly id: string;
  readonly organizationId: string;
  readonly state: 'reserved' | 'active' | 'rejected' | 'archived';
  readonly purpose: string;
  readonly mediaType: string;
}

export interface PublishingJobSummary {
  readonly id: string;
  readonly organizationId: string;
  readonly articleId: string;
  readonly state: PublishingState;
  readonly createdAt: string;
  /** Timestamp of the current/final job state transition used by date-filtered analytics. */
  readonly occurredAt: string;
}

export interface PublishingJobTargetSummary {
  readonly id: string;
  readonly organizationId: string;
  readonly jobId: string;
  readonly articleSiteId: string;
  readonly state: PublishingState;
  /** Target transition/outcome timestamp, not assignment creation time. */
  readonly occurredAt: string;
}

export interface AuditRecord {
  readonly id: string;
  readonly organizationId: string;
  readonly actorType: 'user' | 'api_key' | 'system';
  readonly actorId: string;
  readonly entryPoint: 'dashboard' | 'api' | 'worker' | 'reconciler';
  readonly action: string;
  readonly targetType: string;
  readonly targetId: string | null;
  readonly outcome: 'succeeded' | 'denied' | 'failed';
  readonly changedFields: readonly string[];
  readonly before: Readonly<Record<string, unknown>> | null;
  readonly after: Readonly<Record<string, unknown>> | null;
  readonly requestId: string;
  readonly occurredAt: string;
}

/** Retention/sweep evidence row for the audit view (friendly name built in the repo). */
export interface RetentionRunRecord {
  readonly id: string;
  readonly organizationId: string | null;
  readonly name: string;
  readonly status: 'success';
  readonly category: string;
  readonly purgedCount: number;
  readonly startedAt: string;
  readonly finishedAt: string;
}

/** Domain activation attempt row for the configuration view. */
export interface ActivationAttemptRecord {
  readonly id: string;
  readonly organizationId: string;
  readonly name: string;
  readonly status: string;
  readonly siteId: string;
  readonly hostname: string;
  readonly operation: string;
  readonly attempts: number;
  readonly nextAttemptAt: string;
}

export interface DashboardTenantState {
  readonly organizationId: string;
  readonly organizationName: string;
  readonly domains: readonly DomainRecord[];
  readonly regions: readonly RegionRecord[];
  readonly sites: readonly SiteRecord[];
  readonly siteSettings: readonly SiteSettingsRecord[];
  readonly roles: readonly RoleRecord[];
  readonly memberships: readonly MembershipRecord[];
  readonly publishers: readonly PublisherRecord[];
  readonly affiliations: readonly OfficialAffiliationRecord[];
  readonly categories: readonly CategoryRecord[];
  readonly authors: readonly AuthorRecord[];
  readonly articles: readonly ArticleRecord[];
  readonly articleCategories: readonly ArticleCategoryRecord[];
  readonly articleSites: readonly ArticleSiteRecord[];
  readonly media: readonly MediaSummary[];
  readonly publishingJobs: readonly PublishingJobSummary[];
  readonly publishingJobTargets: readonly PublishingJobTargetSummary[];
}

/** Scoped configuration read: identity, geography, and access only. No articles, assignments, media, or jobs. */
export interface ConfigurationScope {
  readonly organizationName: string;
  readonly domains: readonly DomainRecord[];
  readonly regions: readonly RegionRecord[];
  readonly sites: readonly SiteRecord[];
  readonly siteSettings: readonly SiteSettingsRecord[];
  readonly roles: readonly RoleRecord[];
  readonly memberships: readonly MembershipRecord[];
}

/** Scoped publisher read: publishers, claims, and the mini geography the claim rollup needs. */
export interface PublisherScope {
  readonly publishers: readonly PublisherRecord[];
  readonly affiliations: readonly OfficialAffiliationRecord[];
  readonly sites: readonly SiteRecord[];
  readonly regions: readonly RegionRecord[];
}

/** Bridge publication rollup for one owner article: serving-portal URLs plus the newest bridge time. */
export interface BridgePublishedEntry {
  readonly articleId: string;
  readonly urls: readonly string[];
  readonly publishedAtMax: string | null;
}

/** Scoped editorial read: SQL-filtered bodyless articles plus the lookups the board needs. */
export interface EditorialScope {
  readonly articles: readonly ArticleRecord[];
  readonly articlesNextCursor: string | null;
  readonly total: number;
  readonly tagOptions: readonly { readonly tag: string; readonly count: number }[];
  readonly articleSites: readonly ArticleSiteRecord[];
  /** Bridge publication URLs for own articles served on other orgs' portals (Hasil Tayang pemilik). */
  readonly bridgePublished: readonly BridgePublishedEntry[];
  readonly categories: readonly CategoryRecord[];
  readonly authors: readonly AuthorRecord[];
  readonly publishers: readonly (Pick<PublisherRecord, 'id' | 'name' | 'attributionLabel' | 'status'> & { readonly ownerOrganizationId: string | null })[];
  readonly regions: readonly RegionRecord[];
  readonly sites: readonly SiteRecord[];
  readonly domains: readonly Pick<DomainRecord, 'id' | 'normalizedHostname'>[];
}

/** One article row in a cross-org steward listing: canonical columns plus display denormalization. */
export interface CrossOrgArticleRecord extends ArticleRecord {
  /** Owning organization slug for the steward badge. */
  readonly orgSlug: string;
  /** Owning organization display name for the steward badge. */
  readonly orgName: string;
  /** Category display names in position order; replaces the per-org lookup map. */
  readonly categoryNames: readonly string[];
  /** Apex-resolved active portal hostnames; replaces the sites/articleSites maps. */
  readonly portalHostnames: readonly string[];
  /** Published assignment URLs (fallback `https://host/slug` when unset). */
  readonly publishedUrls: readonly string[];
  /** Newest published assignment time; null when never published. */
  readonly publishedAtMax: string | null;
}

/** Cross-org steward read: keyset-paged bodyless articles with an exact total. */
export interface CrossOrgEditorialScope {
  readonly articles: readonly CrossOrgArticleRecord[];
  readonly articlesNextCursor: string | null;
  readonly total: number;
}

/** Filters allowed in cross-org mode; org-scoped ids stay single-org only. */
export interface CrossOrgArticleFilter {
  readonly status?: string | undefined;
  readonly tag?: string | undefined;
  readonly search?: string | undefined;
  readonly sort?: 'updated' | 'published-desc' | 'published-asc' | 'title' | 'syndicated' | undefined;
  readonly publicationState?: string | undefined;
  readonly limit?: number | undefined;
  readonly cursor?: string | undefined;
}

/** Scoped taxonomy read: narrow article facets for counting, never bodies. */
export interface TaxonomyScope {
  readonly articles: readonly Pick<ArticleRecord, 'id' | 'organizationId' | 'regionId' | 'categoryId' | 'categoryIds' | 'tags'>[];
  readonly categories: readonly CategoryRecord[];
  readonly regions: readonly Pick<RegionRecord, 'id' | 'kind' | 'parentRegionId'>[];
}

/** Scoped publisher-claim read: one publisher plus its claim rows. */
export interface PublisherClaimScope {
  readonly publisher: PublisherRecord;
  readonly affiliations: readonly OfficialAffiliationRecord[];
}

/** Scoped network-article read: one site plus its published articles and attribution inputs. */
export interface NetworkArticlesScope {
  readonly site: SiteRecord;
  readonly articles: readonly ArticleRecord[];
  readonly articleSites: readonly ArticleSiteRecord[];
  readonly publishers: readonly PublisherRecord[];
  readonly affiliations: readonly OfficialAffiliationRecord[];
  readonly regions: readonly RegionRecord[];
  readonly categoryIds: readonly string[];
  readonly authorIds: readonly string[];
}

export interface ArticleFilter {
  readonly regionId?: string;
  readonly siteId?: string;
  readonly siteHostname?: string;
  readonly categoryId?: string;
  readonly publisherId?: string;
  readonly authorId?: string;
  readonly publicationState?: PublishingState;
  readonly status?: string;
  readonly tag?: string;
  readonly search?: string;
  readonly sort?: 'updated' | 'published-desc' | 'published-asc' | 'title' | 'syndicated';
  readonly limit?: number;
  readonly cursor?: string;
}

export interface EditorialSummaryArticle {
  readonly id: string;
  readonly regionId: string | null;
  readonly slug: string;
  readonly title: string;
  readonly status: ArticleStatus;
  readonly createdAt: string;
}

export interface EditorialSummarySite {
  readonly id: string;
  readonly regionId: string | null;
  readonly normalizedHostname: string;
  readonly status: LifecycleStatus;
}

export interface EditorialSummaryRegion {
  readonly id: string;
  readonly name: string;
  readonly kind: 'region' | 'city';
  readonly parentRegionId: string | null;
  readonly status: LifecycleStatus;
}

/** Bodyless editorial summary for lightweight read paths (bot, picker); mutations still use the full state. */
export interface EditorialSummaries {
  readonly articles: readonly EditorialSummaryArticle[];
  readonly sites: readonly EditorialSummarySite[];
  readonly regions: readonly EditorialSummaryRegion[];
  readonly regionScope: { readonly id: string; readonly name: string } | null;
}

export interface AuditFilter {
  readonly actorId?: string;
  readonly action?: string;
  readonly targetType?: string;
  readonly outcome?: AuditRecord['outcome'];
  readonly from?: string;
  readonly to?: string;
}

export interface DashboardProjection {
  readonly activeDomains: number;
  readonly activeSubdomains: number;
  readonly activeSites: number;
  readonly activeArticles: number;
  readonly archivedArticles: number;
  readonly jobsByState: Readonly<Record<PublishingState, number>>;
  readonly successfulSiteOutcomes: number;
  readonly failedSiteOutcomes: number;
  readonly activeMedia: number;
  /** Actor region key; NULL means all regions. */
  readonly regionScope: { readonly id: string; readonly name: string } | null;
}

export interface AnalyticsPoint {
  readonly key: string;
  readonly count: number;
}

/** One daily task-series bucket; `hari` is `YYYY-MM-DD` (UTC). */
export interface TaskDay {
  readonly hari: string;
  readonly diterbitkan: number;
  readonly gagal: number;
  readonly antre: number;
}

/** One daily site-delivery-series bucket; `hari` is `YYYY-MM-DD` (UTC). */
export interface DeliveryDay {
  readonly hari: string;
  readonly diterbitkan: number;
  readonly gagal: number;
  readonly antre: number;
}

/** One daily views bucket; `views` sums that day's delivery `view_count`. */
export interface ViewDay {
  readonly hari: string;
  readonly penyaluran: number;
  readonly views: number;
}

/** One volume-plus-views point for a single dimension (`key` = ID, label via label map). */
export interface ViewsPoint {
  readonly key: string;
  readonly count: number;
  readonly views: number;
}

/** One heat-map cell; `hari` 0=Monday..6=Sunday (Asia/Jakarta), `jam` 0..23. */
export interface ActivityHour {
  readonly hari: number;
  readonly jam: number;
  readonly jumlah: number;
}

/** One recent event for the operations timeline. */
export interface RecentActivity {
  readonly id: string;
  readonly label: string;
  readonly status: string;
  readonly at: string;
}

/** One publisher → site → outcome flow leg for the Sankey diagram. */
export interface PublisherFlow {
  readonly penerbit: string;
  readonly situs: string;
  readonly hasil: string;
  readonly jumlah: number;
}

/** Series calendar window (`YYYY-MM-DD`, inclusive, max 90 days). */
export interface DateWindow {
  readonly awal: string;
  readonly akhir: string;
}

export interface AnalyticsProjection {
  readonly articlesByRegion: readonly AnalyticsPoint[];
  readonly articlesBySite: readonly AnalyticsPoint[];
  readonly articlesByCategory: readonly AnalyticsPoint[];
  readonly articlesByPublisher: readonly AnalyticsPoint[];
  readonly articlesByStatus: readonly AnalyticsPoint[];
  readonly jobsByState: readonly AnalyticsPoint[];
  readonly jobsBySiteRegionAndState: readonly AnalyticsPoint[];
  readonly outcomesBySiteAndState: readonly AnalyticsPoint[];
  readonly outcomesBySiteRegionAndState: readonly AnalyticsPoint[];
  readonly jendela: DateWindow;
  readonly tugasHarian: readonly TaskDay[];
  readonly aktivitasPerJam: readonly ActivityHour[];
  readonly aktivitasTerbaru: readonly RecentActivity[];
  readonly arusPenerbit: readonly PublisherFlow[];
  readonly penyaluranHarian?: readonly DeliveryDay[];
  readonly viewsHarian?: readonly ViewDay[];
  readonly viewsBySite?: readonly ViewsPoint[];
  readonly viewsByArticle?: readonly ViewsPoint[];
  readonly totalViews?: number;
  readonly totalPenyaluran?: number;
  readonly siteLabels?: Readonly<Record<string, string>>;
  readonly categoryLabels?: Readonly<Record<string, string>>;
  readonly publisherLabels?: Readonly<Record<string, string>>;
  readonly regionLabels?: Readonly<Record<string, string>>;
  readonly articleLabels?: Readonly<Record<string, string>>;
}

export interface NetworkPublisherClaim {
  readonly attribution: string;
  readonly independent: boolean;
  readonly institutionName: string | null;
  readonly claimScopes: readonly string[];
}

/** One-row read-only operations summary for the `operations` view (max 100 per collection, desc). */
export interface InvalidationTaskSummary {  readonly id: string;
  readonly organizationId: string;
  readonly name: string;
  readonly status: string;
  readonly siteId: string;
  readonly reason: string;
  readonly attempts: number;
  readonly nextAttemptAt: string;
  readonly updatedAt: string;
}

export interface ObjectCleanupTaskSummary {
  readonly id: string;
  readonly organizationId: string;
  readonly name: string;
  readonly status: string;
  readonly reason: string;
  readonly attempts: number;
  readonly nextAttemptAt: string;
  readonly updatedAt: string;
}

export interface MediaKeyReservationSummary {
  readonly id: string;
  readonly organizationId: string;
  readonly name: string;
  readonly status: string;
  readonly purpose: string;
  readonly expiresAt: string;
  readonly updatedAt: string;
}

export interface CacheBypassSummary {
  readonly id: string;
  readonly organizationId: string;
  readonly name: string;
  readonly status: string;
  readonly siteId: string;
  readonly reason: string;
  readonly updatedAt: string;
}

export interface TransitionReceiptSummary {
  readonly id: string;
  readonly organizationId: string;
  readonly name: string;
  readonly status: string;
  readonly jobId: string;
  readonly occurredAt: string;
}

export interface WebhookReplayClaimSummary {
  readonly id: string;
  readonly organizationId: string;
  readonly name: string;
  readonly status: string;
  readonly attemptCount: number;
  readonly receivedAt: string;
  readonly expiresAt: string;
}

export interface OperationsProjection {
  readonly invalidationTasks: readonly InvalidationTaskSummary[];
  readonly objectCleanupTasks: readonly ObjectCleanupTaskSummary[];
  readonly mediaKeyReservations: readonly MediaKeyReservationSummary[];
  readonly cacheBypasses: readonly CacheBypassSummary[];
  readonly transitionReceipts: readonly TransitionReceiptSummary[];
  readonly webhookReplayClaims: readonly WebhookReplayClaimSummary[];
}

/** Actor-org membership invitation (tokenHash never leaves the DB). */
export interface InvitationSummary {
  readonly id: string;
  readonly organizationId: string;
  readonly name: string;
  readonly status: 'pending' | 'accepted' | 'expired';
  readonly email: string;
  readonly roleId: string;
  readonly roleName: string;
  readonly expiresAt: string;
  readonly acceptedAt: string | null;
  readonly createdAt: string;
}

/** Prefetched RSC payload mirroring the live workspace response; domain-owned so the DAL avoids UI imports. */
export interface DashboardSnapshot {
  readonly organizationId: string;
  readonly data: unknown;
}
