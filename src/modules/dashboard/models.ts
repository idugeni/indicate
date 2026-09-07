export type LifecycleStatus = 'active' | 'inactive' | 'archived';
export type ArticleStatus = 'draft' | 'active' | 'archived';
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
}

export interface RegionRecord extends VersionedRecord {
  readonly externalKey: string;
  readonly name: string;
  readonly slug: string;
  readonly status: LifecycleStatus;
}

export interface SiteRecord extends VersionedRecord {
  readonly domainId: string;
  readonly regionId: string | null;
  readonly normalizedHostname: string;
  readonly status: LifecycleStatus;
  readonly activationState: 'inactive' | 'pending' | 'active' | 'failed';
}

export interface NavigationItem {
  readonly label: string;
  readonly path: string;
}

export interface SiteSettingsRecord extends VersionedRecord {
  readonly siteId: string;
  readonly name: string;
  readonly description: string;
  readonly colors: Readonly<Record<string, string>>;
  readonly socialLinks: Readonly<Record<string, string>>;
  readonly seo: Readonly<Record<string, unknown>>;
  readonly navigation: readonly NavigationItem[];
}

export interface RoleRecord extends VersionedRecord {
  readonly name: string;
  readonly tier: RoleTier;
  readonly active: boolean;
  readonly permissions: ReadonlySet<string>;
}

/**
 * Bentuk serial JSON peran untuk respons API. Domain memakai `Set`,
 * yang hilang saat `NextResponse.json` — DTO ini membawa array agar
 * UI bisa membaca dan mengirim kembali daftar permission apa adanya.
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
}

export interface TelegramIdentityMappingSummary {
  readonly id: string;
  readonly organizationId: string;
  readonly userId: string;
  readonly roleId: string;
  readonly status: LifecycleStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
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

export interface AuthorRecord extends VersionedRecord {
  readonly displayName: string;
  readonly byline: string;
  readonly status: LifecycleStatus;
}

export interface ArticleRecord extends VersionedRecord {
  readonly regionId: string;
  readonly publisherId: string | null;
  readonly categoryId: string | null;
  readonly authorId: string | null;
  readonly slug: string;
  readonly title: string;
  readonly body: string;
  readonly source: string;
  readonly tags: readonly string[];
  readonly status: ArticleStatus;
  readonly publishedAt: string | null;
  readonly archivedAt: string | null;
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
  readonly customViewCount: number;
}

export interface MediaSummary {
  readonly id: string;
  readonly organizationId: string;
  readonly state: 'reserved' | 'active' | 'rejected' | 'archived';
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
  readonly actorType: 'user' | 'api_key' | 'telegram' | 'system';
  readonly actorId: string;
  readonly entryPoint: 'dashboard' | 'api' | 'telegram' | 'worker' | 'reconciler';
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

/** Baris bukti retensi/sweep untuk view audit (nama ramah dibentuk di repo). */
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

/** Baris upaya aktivasi domain untuk view konfigurasi. */
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
  readonly telegramMappings: readonly TelegramIdentityMappingSummary[];
  readonly publishers: readonly PublisherRecord[];
  readonly affiliations: readonly OfficialAffiliationRecord[];
  readonly categories: readonly CategoryRecord[];
  readonly authors: readonly AuthorRecord[];
  readonly articles: readonly ArticleRecord[];
  readonly articleSites: readonly ArticleSiteRecord[];
  readonly media: readonly MediaSummary[];
  readonly publishingJobs: readonly PublishingJobSummary[];
  readonly publishingJobTargets: readonly PublishingJobTargetSummary[];
  readonly auditLogs: readonly AuditRecord[];
}

export interface ArticleFilter {
  readonly regionId?: string;
  readonly siteId?: string;
  readonly categoryId?: string;
  readonly publisherId?: string;
  readonly authorId?: string;
  readonly publicationState?: PublishingState;
  readonly search?: string;
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
  readonly activeSites: number;
  readonly activeArticles: number;
  readonly archivedArticles: number;
  readonly jobsByState: Readonly<Record<PublishingState, number>>;
  readonly successfulSiteOutcomes: number;
  readonly failedSiteOutcomes: number;
  readonly activeMedia: number;
}

export interface AnalyticsPoint {
  readonly key: string;
  readonly count: number;
}

export interface AnalyticsProjection {
  readonly articlesByRegion: readonly AnalyticsPoint[];
  readonly articlesBySite: readonly AnalyticsPoint[];
  readonly articlesByCategory: readonly AnalyticsPoint[];
  readonly articlesByPublisher: readonly AnalyticsPoint[];
  readonly jobsByState: readonly AnalyticsPoint[];
  readonly jobsBySiteRegionAndState: readonly AnalyticsPoint[];
  readonly outcomesBySiteAndState: readonly AnalyticsPoint[];
  readonly outcomesBySiteRegionAndState: readonly AnalyticsPoint[];
}

export interface NetworkPublisherClaim {
  readonly attribution: string;
  readonly independent: boolean;
  readonly institutionName: string | null;
  readonly claimScopes: readonly string[];
}

/** Prefetched RSC payload mirroring the live workspace response; domain-owned so the DAL avoids UI imports. */
export interface DashboardSnapshot {
  readonly organizationId: string;
  readonly data: unknown;
}
