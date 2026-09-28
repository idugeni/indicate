import type { ObjectStoragePort } from '@/integrations/storage/ports';
import { isPublicObjectKey } from '@/modules/publishing/object-key';

export interface MediaObjectKeyRow {
  readonly organizationId: string;
  readonly mediaId: string;
  readonly objectKey: string;
  readonly thumbObjectKey: string | null;
  readonly purpose: string;
  readonly state: string;
}

export type MediaKeyDriftKind =
  | 'row_without_object'
  | 'object_without_row'
  | 'thumb_without_object'
  | 'object_in_wrong_bucket';

export interface MediaKeyDrift {
  readonly kind: MediaKeyDriftKind;
  readonly objectKey: string;
  readonly organizationId: string | null;
  readonly mediaId: string | null;
  readonly purpose: string | null;
  readonly state: string | null;
  /** Bytes involved, or zero when the object does not exist. */
  readonly contentLength: number;
}

export interface MediaObjectReconciliation {
  readonly checkedAt: string;
  readonly storedObjects: number;
  readonly storedBytes: number;
  readonly trackedKeys: number;
  readonly drift: readonly MediaKeyDrift[];
}

export interface MediaObjectReconciliationLimits {
  /** Hard ceiling on reported drift rows so one bad run cannot exhaust memory. */
  readonly maxReportedDrift: number;
}

const DEFAULT_LIMITS: MediaObjectReconciliationLimits = { maxReportedDrift: 500 };

/**
 * Report where the media table and the object store disagree.
 *
 * @remarks Read-only, and deliberately so: R2 has no object versioning, so removal
 * stays an operator decision that goes through `object_cleanup_tasks` and the
 * reconciler claiming those rows. Only `active` rows are expected to have their
 * object: an `archived` row is meant to lose its bytes once its cleanup task
 * drained, so a missing object there is the design working, not drift. A surviving
 * object for an archived key is still reported, because that is what an undrained
 * queue looks like.
 *
 * @param storage - Object storage adapter spanning every configured bucket.
 * @param loadRows - Supplies every tracked media key across all organizations.
 * @param now - Clock injection point.
 * @param limits - Reported-drift ceiling.
 * @returns Stored totals, tracked key count, and the drift needing triage.
 */
export async function reconcileMediaObjectKeys(
  storage: Pick<ObjectStoragePort, 'listObjects'>,
  loadRows: () => Promise<readonly MediaObjectKeyRow[]>,
  now: () => Date = () => new Date(),
  limits: MediaObjectReconciliationLimits = DEFAULT_LIMITS,
): Promise<MediaObjectReconciliation> {
  const [stored, rows] = await Promise.all([storage.listObjects(), loadRows()]);

  const storedByKey = new Map(stored.map((object) => [object.key, object]));
  const tracked = new Map<string, MediaObjectKeyRow>();
  for (const row of rows) {
    tracked.set(row.objectKey, row);
    if (row.thumbObjectKey !== null) tracked.set(row.thumbObjectKey, row);
  }

  const drift: MediaKeyDrift[] = [];
  const seen = new Set<string>();
  const push = (entry: MediaKeyDrift): void => {
    const marker = `${entry.kind} ${entry.objectKey}`;
    if (seen.has(marker)) return;
    seen.add(marker);
    if (drift.length < limits.maxReportedDrift) drift.push(Object.freeze(entry));
  };

  for (const object of stored) {
    const row = tracked.get(object.key);
    if (row === undefined) {
      push(Object.freeze({
        kind: 'object_without_row',
        objectKey: object.key,
        organizationId: null,
        mediaId: null,
        purpose: null,
        state: null,
        contentLength: object.contentLength,
      }));
      continue;
    }
    if (isPublicObjectKey(object.key) !== (object.visibility === 'public')) {
      push(Object.freeze({
        kind: 'object_in_wrong_bucket',
        objectKey: object.key,
        organizationId: row.organizationId,
        mediaId: row.mediaId,
        purpose: row.purpose,
        state: row.state,
        contentLength: object.contentLength,
      }));
    }
  }

  for (const row of rows) {
    if (row.state !== 'active') continue;
    if (row.objectKey !== '' && !storedByKey.has(row.objectKey)) {
      push(Object.freeze({
        kind: 'row_without_object',
        objectKey: row.objectKey,
        organizationId: row.organizationId,
        mediaId: row.mediaId,
        purpose: row.purpose,
        state: row.state,
        contentLength: 0,
      }));
    }
    if (row.thumbObjectKey !== null && !storedByKey.has(row.thumbObjectKey)) {
      push(Object.freeze({
        kind: 'thumb_without_object',
        objectKey: row.thumbObjectKey,
        organizationId: row.organizationId,
        mediaId: row.mediaId,
        purpose: row.purpose,
        state: row.state,
        contentLength: 0,
      }));
    }
  }

  return Object.freeze({
    checkedAt: now().toISOString(),
    storedObjects: stored.length,
    storedBytes: stored.reduce((total, object) => total + object.contentLength, 0),
    trackedKeys: tracked.size,
    drift: Object.freeze(drift),
  });
}
