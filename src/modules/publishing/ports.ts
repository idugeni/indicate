import type { AuthorizedTenantActorContext, HostnameContext } from '@/core/operation-context';
import type {
  ClaimedCleanupTask, MediaAssetRecord, MediaOwner, MediaReservationRecord, PublicationJobRecord,
  PublicationOptions, PublicationOverride, PublicationStatusProjection, PublicationTargetRecord, PublishingTenantSnapshot, TargetTransitionCommit,
  TransitionReceiptRecord, WorkerClaim,
} from '@/modules/publishing/models';

export interface ReserveMediaCandidate {
  readonly reservationId: string;
  readonly objectKey: string;
  readonly owner: MediaOwner;
  readonly purpose: string;
  readonly expectedMediaType: string;
  readonly expectedSizeBytes: number;
  readonly expectedChecksum: string;
  readonly expiresAt: string;
  readonly now: string;
}

export type ReservationCandidateResult =
  | { readonly kind: 'reserved'; readonly reservation: MediaReservationRecord }
  | { readonly kind: 'occupied' };

export interface ActivateMediaInput {
  readonly reservationId: string;
  readonly mediaId: string;
  readonly mediaType: string;
  readonly sizeBytes: number;
  readonly checksum: string;
  readonly thumbObjectKey: string | null;
  readonly now: string;
}

export interface AcceptPublicationInput {
  readonly jobId: string;
  readonly organizationId: string;
  readonly articleId: string;
  readonly siteIds: readonly string[];
  readonly idempotencyKey: string;
  readonly fingerprint: string;
  readonly fingerprintVersion: number;
  readonly options: PublicationOptions;
  readonly overrides: Readonly<Record<string, PublicationOverride>>;
  readonly now: string;
  readonly targetIds: readonly string[];
  readonly articleSiteIds: readonly string[];
}

export type AcceptPublicationResult =
  | { readonly kind: 'created'; readonly job: PublicationJobRecord }
  | { readonly kind: 'reused'; readonly job: PublicationJobRecord }
  | { readonly kind: 'conflict'; readonly existingJobId: string };

export interface TargetTransitionInput {
  readonly targetId: string;
  readonly toState: 'processing' | 'published' | 'failed' | 'retrying' | 'unpublished';
  readonly now: string;
  readonly publishedUrl?: string | null;
  readonly sanitizedError?: Readonly<Record<string, unknown>> | null;
  readonly nextAttemptAt?: string;
}

export interface PublicationTargetSelection {
  readonly jobId: string;
  readonly targetIds?: readonly string[] | undefined;
  readonly now: string;
}

export interface PublishingRepository {
  reserveMediaCandidate(actor: AuthorizedTenantActorContext, input: ReserveMediaCandidate): Promise<ReservationCandidateResult>;
  markReservationOccupied(actor: AuthorizedTenantActorContext, reservationId: string, now: string): Promise<void>;
  readReservation(actor: AuthorizedTenantActorContext, reservationId: string): Promise<MediaReservationRecord | null>;
  activateMedia(actor: AuthorizedTenantActorContext, input: ActivateMediaInput): Promise<MediaAssetRecord>;
  rejectMedia(actor: AuthorizedTenantActorContext, reservationId: string, reason: string, now: string): Promise<void>;
  archiveMedia(actor: AuthorizedTenantActorContext, mediaId: string, expectedVersion: number, now: string): Promise<MediaAssetRecord>;
  listMedia(actor: AuthorizedTenantActorContext): Promise<readonly MediaAssetRecord[]>;
  authorizeTenantMedia(actor: AuthorizedTenantActorContext, mediaId: string): Promise<MediaAssetRecord | null>;
  authorizePublicMedia(context: HostnameContext, mediaId: string, requestId: string): Promise<MediaAssetRecord | null>;
  recordDenial(actor: AuthorizedTenantActorContext, action: string, targetType: string, now: string): Promise<void>;

  acceptPublication(actor: AuthorizedTenantActorContext, input: AcceptPublicationInput): Promise<AcceptPublicationResult>;
  retryTargets(actor: AuthorizedTenantActorContext, input: PublicationTargetSelection): Promise<PublicationStatusProjection>;
  unpublishTargets(actor: AuthorizedTenantActorContext, input: PublicationTargetSelection): Promise<PublicationStatusProjection>;
  recordDispatchScheduled(organizationId: string, jobId: string, now: string, claimToken?: string): Promise<void>;
  recordDispatchFailure(organizationId: string, jobId: string, retryable: boolean, nextAt: string, now: string, claimToken?: string): Promise<void>;
  getPublication(actor: AuthorizedTenantActorContext, jobId: string): Promise<PublicationStatusProjection | null>;
  claimDispatchGaps(now: string, limit: number, claimToken: string, claimExpiresAt: string): Promise<readonly PublicationJobRecord[]>;
  claimJob(organizationId: string, jobId: string, workerId: string, leaseExpiresAt: string, now: string): Promise<WorkerClaim | null>;
  runnableTargets(claim: WorkerClaim, now: string, limit: number): Promise<readonly PublicationTargetRecord[]>;
  transitionTarget(claim: WorkerClaim, input: TargetTransitionInput): Promise<TargetTransitionCommit>;
  acknowledgeTransitionReceipt(organizationId: string, receiptId: string, now: string): Promise<void>;
  releaseJob(claim: WorkerClaim, now: string): Promise<void>;
  findExpiredLeases(now: string, limit: number): Promise<readonly PublicationJobRecord[]>;
  recoverExpiredLease(organizationId: string, jobId: string, maxAttempts: number, now: string): Promise<void>;
  claimTransitionReceipts(now: string, limit: number, claimToken: string, claimExpiresAt: string): Promise<readonly TransitionReceiptRecord[]>;
  reconcileTransitionReceipt(receipt: TransitionReceiptRecord, claimToken: string, now: string): Promise<void>;
  claimCleanupTasks(now: string, limit: number, claimToken: string, claimExpiresAt: string): Promise<readonly ClaimedCleanupTask[]>;
  completeCleanupTask(organizationId: string, taskId: string, claimToken: string, now: string): Promise<void>;
  failCleanupTask(organizationId: string, taskId: string, claimToken: string, retryable: boolean, nextAt: string, failure: Readonly<Record<string, unknown>>, now: string): Promise<void>;
  snapshot(organizationId: string): Promise<PublishingTenantSnapshot | null>;
}

export type TargetPublicationOutcome =
  | { readonly kind: 'published'; readonly url: string }
  | { readonly kind: 'retryable_failure'; readonly code: string }
  | { readonly kind: 'terminal_failure'; readonly code: string };

export interface PublicationTargetPublisherPort {
  publish(claim: WorkerClaim, target: PublicationTargetRecord): Promise<TargetPublicationOutcome>;
}

export class PublishingAccessDeniedError extends Error {
  constructor() { super('Publishing tenant resource unavailable'); }
}
export class PublishingConflictError extends Error {
  constructor(readonly code: 'conflict' | 'idempotency_conflict' | 'invalid_transition' | 'stale_fence' = 'conflict') {
    super(code);
  }
}

/** Langganan tidak dalam masa aktif tulis. Mutasi ditolak eksplisit (FORBIDDEN). */
export class PublishingSubscriptionInactiveError extends Error {
  constructor(
    readonly accessState: string,
  ) { super(`Subscription is not writable (state ${accessState}).`); }
}
