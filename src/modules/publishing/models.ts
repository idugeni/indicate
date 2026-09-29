import type { PublishingState } from '@/modules/dashboard/models';

export type { PublishingState };

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | readonly JsonValue[] | { readonly [key: string]: JsonValue };

export type MediaOwner =
  | { readonly kind: 'article'; readonly articleId: string }
  | { readonly kind: 'site'; readonly siteId: string }
  | { readonly kind: 'organization' };

export interface MediaReservationRecord {
  readonly id: string;
  readonly organizationId: string;
  readonly objectKey: string;
  readonly purpose: string;
  readonly owner: MediaOwner;
  readonly expectedMediaType: string;
  readonly expectedSizeBytes: number;
  readonly expectedChecksum: string;
  readonly status: 'reserved' | 'used' | 'occupied' | 'expired';
  readonly expiresAt: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface MediaAssetRecord {
  readonly id: string;
  readonly organizationId: string;
  readonly objectKey: string;
  readonly purpose: string;
  readonly mediaType: string;
  readonly sizeBytes: number;
  readonly checksum: string;
  readonly thumbObjectKey: string | null;
  readonly widthPx: number | null;
  readonly heightPx: number | null;
  readonly altText: string | null;
  readonly caption: string | null;
  readonly sortOrder: number;
  readonly focalX: number | null;
  readonly focalY: number | null;
  readonly owner: MediaOwner;
  readonly state: 'active' | 'rejected' | 'archived';
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CleanupTaskRecord {
  readonly id: string;
  readonly organizationId: string;
  readonly objectKey: string;
  readonly reason: string;
  readonly status: 'pending' | 'processing' | 'completed' | 'failed';
  readonly attempts: number;
  readonly nextAttemptAt: string;
  readonly sanitizedFailure: Readonly<Record<string, unknown>> | null;
}

export interface ClaimedCleanupTask extends CleanupTaskRecord {
  readonly claimToken: string;
}

export interface TransitionReceiptRecord {
  readonly id: string;
  readonly organizationId: string;
  readonly transitionId: string;
  readonly jobId: string;
  readonly targetId: string | null;
  readonly fromState: PublishingState;
  readonly toState: PublishingState;
  readonly fencingToken: number;
  readonly acknowledgedAt: string | null;
  readonly createdAt: string;
}

export interface TargetTransitionCommit {
  readonly status: PublicationStatusProjection;
  readonly receiptId: string;
}

export interface InvalidationIntentRecord {
  readonly id: string;
  readonly organizationId: string;
  readonly siteId: string;
  readonly reason: string;
  readonly tags: readonly string[];
  readonly status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface PublicationOptions {
  readonly [key: string]: JsonValue;
}

/** Per-target differentiation; every field null/undefined means "use the article canonical". */
export interface PublicationOverride {
  readonly title?: string | undefined;
  readonly description?: string | undefined;
  readonly imageMediaId?: string | undefined;
}

export interface PublicationJobRecord {
  readonly id: string;
  readonly organizationId: string;
  readonly articleId: string;
  readonly idempotencyKey: string;
  readonly fingerprint: string;
  readonly fingerprintVersion: number;
  readonly state: PublishingState;
  readonly options: PublicationOptions;
  readonly dispatchStatus: 'pending' | 'scheduled' | 'leased' | 'acknowledged' | 'failed';
  readonly dispatchAttempts: number;
  readonly nextDispatchAt: string;
  readonly leaseOwner: string | null;
  readonly leaseExpiresAt: string | null;
  readonly fencingToken: number;
  readonly finalizedAt: string | null;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface PublicationTargetRecord {
  readonly id: string;
  readonly organizationId: string;
  readonly jobId: string;
  readonly articleSiteId: string;
  readonly siteId: string;
  readonly state: PublishingState;
  readonly attempt: number;
  readonly fencingToken: number;
  readonly nextAttemptAt: string;
  readonly startedAt: string | null;
  readonly finishedAt: string | null;
  readonly publishedUrl: string | null;
  readonly publishedAt: string | null;
  readonly sanitizedError: Readonly<Record<string, unknown>> | null;
}

export interface PublicationResult {
  readonly finalState: 'published' | 'failed';
  readonly successfulCount: number;
  readonly urls: readonly string[];
}

export interface PublicationStatusProjection {
  readonly job: PublicationJobRecord;
  readonly targets: readonly PublicationTargetRecord[];
  readonly result: PublicationResult | null;
}

export interface WorkerClaim {
  readonly organizationId: string;
  readonly jobId: string;
  readonly workerId: string;
  readonly fencingToken: number;
  readonly leaseExpiresAt: string;
}

export interface PublishingArticleRef {
  readonly id: string;
  readonly organizationId: string;
  readonly active: boolean;
  readonly status?: string;
  readonly scheduledAt?: string | null;
  readonly leadMediaId: string | null;
  readonly title: string;
  readonly slug: string;
}

export interface PublishingSiteRef {
  readonly id: string;
  readonly organizationId: string;
  readonly active: boolean;
  readonly normalizedHostname: string;
  /** Owning domain, so callers can group portals by apex instead of guessing from the hostname. */
  readonly domainId: string | null;
  readonly settingsMediaIds: readonly string[];
}

export interface PublishingDomainRef {
  readonly id: string;
  readonly organizationId: string;
  readonly normalizedHostname: string;
  readonly status: string;
  readonly siteTopology: string;
}

export interface PublishingArticleSiteRef {
  readonly id: string;
  readonly organizationId: string;
  readonly articleId: string;
  readonly siteId: string;
  readonly active: boolean;
  readonly state: PublishingState;
  readonly publishedUrl: string | null;
  readonly publishedAt: string | null;
  readonly version: number;
}

/**
 * Assignment columns the dashboard distributing form consumes.
 *
 * @remarks Narrower than {@link PublishingArticleSiteRef} on purpose: the
 * publishing snapshot projects only what `ArticleDistributeForm` reads when it
 * seeds per-site view counts, so no canonical URL or version column leaves the
 * database for a form that ignores them.
 */
export interface PublishingAssignmentRef {
  readonly id: string;
  readonly articleId: string;
  readonly siteId: string;
  readonly state: PublishingState;
  readonly active: boolean;
}

/**
 * Collections a `snapshot()` call can be asked to read.
 *
 * @remarks The dashboard media library and the publishing queue render disjoint
 * halves of the projection. Naming the collections keeps a read from paying for
 * rows the caller discards, which `AGENTS.md` §"Database access & egress"
 * counts as egress spent for nothing.
 */
export type PublishingSnapshotCollection =
  | 'articles'
  | 'sites'
  | 'domains'
  | 'reservations'
  | 'cleanupTasks'
  | 'invalidationIntents'
  | 'jobs'
  | 'targets'
  | 'articleSites';

/**
 * Bounded, column-projected view of one tenant for the dashboard publishing surfaces.
 *
 * @remarks Every collection carries a row ceiling and every field maps to a
 * projected column, so this projection can never become a whole-table dump.
 * Audit records, media assets, and transition receipts are deliberately absent:
 * `GET /api/dashboard/publishing` never rendered them, and reading them cost
 * 15.4 MB per call on the platform organization. `AGENTS.md` §"Database access
 * & egress" governs additions.
 *
 * Article-site assignments are present, but only as {@link PublishingAssignmentRef}.
 * They were dropped once on the belief that no caller read them; the
 * distributing form did, so the "Isi jumlah tayang" control always rejected its
 * own submission.
 */
export interface PublishingTenantSnapshot {
  readonly organizationId: string;
  readonly articles: readonly PublishingArticleRef[];
  readonly domains: readonly PublishingDomainRef[];
  readonly sites: readonly PublishingSiteRef[];
  readonly reservations: readonly MediaReservationRecord[];
  readonly cleanupTasks: readonly CleanupTaskRecord[];
  readonly invalidationIntents: readonly InvalidationIntentRecord[];
  readonly jobs: readonly PublicationJobRecord[];
  readonly targets: readonly PublicationTargetRecord[];
  readonly articleSites: readonly PublishingAssignmentRef[];
}
