import type {
  CleanupTaskRecord,
  MediaAssetRecord,
  MediaOwner,
  MediaReservationRecord,
  PublicationJobRecord,
  PublicationTargetRecord,
  TransitionReceiptRecord,
} from '@/modules/publishing/models';
import { PublishingConflictError } from '@/modules/publishing/ports';
import type { media, mediaKeyReservations, objectCleanupTasks, publicationTransitionReceipts, publishingJobs, publishingJobTargets } from '@/data/schema';

export type ReservationRow = typeof mediaKeyReservations.$inferSelect;
export type MediaRow = typeof media.$inferSelect;
export type JobRow = typeof publishingJobs.$inferSelect;
export type TargetRow = typeof publishingJobTargets.$inferSelect;
export type ReceiptRow = typeof publicationTransitionReceipts.$inferSelect;
export type CleanupRow = typeof objectCleanupTasks.$inferSelect;

const iso = (value: Date) => value.toISOString();
const optionalIso = (value: Date | null) => value?.toISOString() ?? null;

export function mapOwnerFromRow(row: { articleId: string | null; siteId: string | null; organizationAsset: boolean }): MediaOwner {
  if (row.articleId !== null) return { kind: 'article', articleId: row.articleId };
  if (row.siteId !== null) return { kind: 'site', siteId: row.siteId };
  if (row.organizationAsset) return { kind: 'organization' };
  throw new PublishingConflictError();
}

export function getOwnerColumns(owner: MediaOwner) {
  return owner.kind === 'article' ? { articleId: owner.articleId, siteId: null, organizationAsset: false }
    : owner.kind === 'site' ? { articleId: null, siteId: owner.siteId, organizationAsset: false }
      : { articleId: null, siteId: null, organizationAsset: true };
}

export function mapReservation(row: ReservationRow): MediaReservationRecord {
  return { id: row.id, organizationId: row.organizationId, objectKey: row.objectKey, purpose: row.purpose, owner: mapOwnerFromRow(row), expectedMediaType: row.expectedMediaType, expectedSizeBytes: row.expectedSizeBytes, expectedChecksum: row.expectedChecksum, status: row.status, expiresAt: iso(row.expiresAt), createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt) };
}

export function mapMedia(row: MediaRow): MediaAssetRecord {
  if (row.state === 'reserved') throw new PublishingConflictError();
  return { id: row.id, organizationId: row.organizationId, objectKey: row.objectKey, purpose: row.purpose, mediaType: row.mediaType, sizeBytes: row.sizeBytes, checksum: row.checksum, owner: mapOwnerFromRow(row), state: row.state, version: row.version, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt) };
}

export function mapJob(row: JobRow): PublicationJobRecord {
  return { id: row.id, organizationId: row.organizationId, articleId: row.articleId, idempotencyKey: row.idempotencyKey, fingerprint: row.fingerprint, fingerprintVersion: row.fingerprintVersion, state: row.state, options: row.options as PublicationJobRecord['options'], dispatchStatus: row.dispatchStatus, dispatchAttempts: row.dispatchAttempts, nextDispatchAt: iso(row.nextDispatchAt), leaseOwner: row.leaseOwner, leaseExpiresAt: optionalIso(row.leaseExpiresAt), fencingToken: row.fencingToken, finalizedAt: optionalIso(row.finalizedAt), version: row.version, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt) };
}

export function mapTarget(row: TargetRow & { siteId: string }): PublicationTargetRecord {
  return { id: row.id, organizationId: row.organizationId, jobId: row.jobId, articleSiteId: row.articleSiteId, siteId: row.siteId, state: row.state, attempt: row.attempt, fencingToken: row.fencingToken, nextAttemptAt: iso(row.nextAttemptAt), startedAt: optionalIso(row.startedAt), finishedAt: optionalIso(row.finishedAt), publishedUrl: row.publishedUrl, publishedAt: optionalIso(row.publishedAt), sanitizedError: row.sanitizedError ?? null };
}

export function mapReceipt(row: ReceiptRow): TransitionReceiptRecord {
  return { id: row.id, organizationId: row.organizationId, transitionId: row.transitionId, jobId: row.jobId, targetId: row.targetId, fromState: row.fromState, toState: row.toState, fencingToken: row.fencingToken, acknowledgedAt: optionalIso(row.acknowledgedAt), createdAt: iso(row.createdAt) };
}

export function mapCleanup(row: CleanupRow): CleanupTaskRecord {
  return { id: row.id, organizationId: row.organizationId, objectKey: row.objectKey, reason: row.reason, status: row.status, attempts: row.attempts, nextAttemptAt: iso(row.nextAttemptAt), sanitizedFailure: row.sanitizedFailure ?? null };
}

export function isPostgresCode(error: unknown, code: string): boolean {
  let current: unknown = error;
  const seen = new Set<object>();
  while (typeof current === 'object' && current !== null && !seen.has(current)) {
    seen.add(current);
    if ('code' in current && current.code === code) return true;
    current = 'cause' in current ? current.cause : undefined;
  }
  return false;
}

export function isUniqueViolation(error: unknown): boolean {
  return isPostgresCode(error, '23505');
}

export { iso, optionalIso };