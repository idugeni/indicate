export interface RuntimeConfigInvalidationClaim {
  readonly intentId: string;
  readonly runtimeRevision: number;
  readonly claimToken: string;
}

export interface RuntimeConfigInvalidationRepository {
  claimDue(limit: number, leaseUntil: Date): Promise<readonly RuntimeConfigInvalidationClaim[]>;
  complete(intentId: string, claimToken: string): Promise<void>;
  fail(intentId: string, claimToken: string, category: string, nextAttemptAt: Date): Promise<void>;
}

export interface RuntimeConfigInvalidationReconcileResult {
  readonly claimed: number;
  readonly completed: number;
  readonly failed: number;
  readonly stranded: number;
}

export interface ReconcileRuntimeConfigInvalidationsInput {
  readonly repository: RuntimeConfigInvalidationRepository;
  /** Invalidates the local snapshot if the claimed revision supersedes it. */
  readonly invalidate: (runtimeRevision: number) => void;
  readonly now: Date;
  readonly batchSize?: number;
  readonly leaseSeconds?: number;
  readonly retryDelaySeconds?: number;
}

const DEFAULT_BATCH_SIZE = 20;
const DEFAULT_LEASE_SECONDS = 120;
const DEFAULT_RETRY_DELAY_SECONDS = 60;
const FAILURE_CATEGORY = 'runtime_config_invalidation_failed';

/**
 * Reconcile a bounded batch of durable runtime-config invalidation intents.
 *
 * @remarks Snapshot invalidation is idempotent: a revision at or below the
 * active cache version has already been superseded. Each claim is completed
 * only after that local invalidation succeeds; failures are rescheduled with a
 * retry timestamp and the database fences transitions with the claim token.
 */
export async function reconcileRuntimeConfigInvalidationIntents(
  input: ReconcileRuntimeConfigInvalidationsInput,
): Promise<RuntimeConfigInvalidationReconcileResult> {
  const batchSize = input.batchSize ?? DEFAULT_BATCH_SIZE;
  const leaseSeconds = input.leaseSeconds ?? DEFAULT_LEASE_SECONDS;
  const retryDelaySeconds = input.retryDelaySeconds ?? DEFAULT_RETRY_DELAY_SECONDS;
  if (!Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > 100) {
    throw new RangeError('runtime_config_invalidation_batch_size_out_of_range');
  }
  if (!Number.isSafeInteger(leaseSeconds) || leaseSeconds < 1) {
    throw new RangeError('runtime_config_invalidation_lease_out_of_range');
  }
  if (!Number.isSafeInteger(retryDelaySeconds) || retryDelaySeconds < 1) {
    throw new RangeError('runtime_config_invalidation_retry_delay_out_of_range');
  }
  if (!Number.isFinite(input.now.getTime())) {
    throw new RangeError('runtime_config_invalidation_clock_invalid');
  }

  const leaseUntil = new Date(input.now.getTime() + leaseSeconds * 1000);
  const claims = await input.repository.claimDue(batchSize, leaseUntil);
  let completed = 0;
  let failed = 0;
  let stranded = 0;

  for (const claim of claims) {
    try {
      input.invalidate(claim.runtimeRevision);
      await input.repository.complete(claim.intentId, claim.claimToken);
      completed += 1;
    } catch {
      failed += 1;
      try {
        await input.repository.fail(
          claim.intentId,
          claim.claimToken,
          FAILURE_CATEGORY,
          new Date(input.now.getTime() + retryDelaySeconds * 1000),
        );
      } catch {
        stranded += 1;
      }
    }
  }

  return Object.freeze({ claimed: claims.length, completed, failed, stranded });
}
