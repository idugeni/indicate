import type { AuditRecord, PublishingState } from '@/modules/dashboard/models';

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
  readonly settingsMediaIds: readonly string[];
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

export interface PublishingTenantSnapshot {
  readonly organizationId: string;
  readonly articles: readonly PublishingArticleRef[];
  readonly sites: readonly PublishingSiteRef[];
  readonly articleSites: readonly PublishingArticleSiteRef[];
  readonly reservations: readonly MediaReservationRecord[];
  readonly media: readonly MediaAssetRecord[];
  readonly cleanupTasks: readonly CleanupTaskRecord[];
  readonly invalidationIntents: readonly InvalidationIntentRecord[];
  readonly jobs: readonly PublicationJobRecord[];
  readonly targets: readonly PublicationTargetRecord[];
  readonly transitionReceipts: readonly TransitionReceiptRecord[];
  readonly auditLogs: readonly AuditRecord[];
}
