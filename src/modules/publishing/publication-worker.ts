import type { ObjectStoragePort } from '@/integrations/storage/ports';
import type { PublicationTargetPublisherPort } from '@/modules/publishing/ports';
import type { PublicationTerminalNotifier, PublicationSharePrewarmPort } from '@/modules/publishing/ports';
import type { RedisCoordinationPort, QueueClaim } from '@/integrations/redis/ports';
import { PublishingConflictError, type PublishingRepository, type TargetTransitionInput } from '@/modules/publishing/ports';
import { retryDelaySeconds, type RetryPolicy } from '@/modules/publishing/publication-policy';
import type { PublicationStatusProjection, WorkerClaim } from '@/modules/publishing/models';
import { sanitizeError } from '@/core/security/redaction';

interface ClockLike { now(): Date }
export interface WorkerPolicy extends RetryPolicy {
  readonly leaseSeconds: number;
  readonly batchSize: number;
  readonly functionDeadlineSeconds: number;
}
export interface WorkerRunSummary { readonly claimed: number; readonly processed: number; readonly reconciled: number; readonly cleaned: number }

function parseLogicalId(value: string): { organizationId: string; jobId: string } | null {
  const separator = value.indexOf(':'); if (separator < 1) return null;
  return { organizationId: value.slice(0, separator), jobId: value.slice(separator + 1) };
}

export class PublicationWorker {
  constructor(
    private readonly repository: PublishingRepository,
    private readonly queue: RedisCoordinationPort,
    private readonly publisher: PublicationTargetPublisherPort,
    private readonly storage: ObjectStoragePort,
    private readonly policy: WorkerPolicy,
    private readonly clock: ClockLike = { now: () => new Date() },
    private readonly notifier: PublicationTerminalNotifier | null = null,
    private readonly prewarmer: PublicationSharePrewarmPort | null = null,
  ) {}

  private async commitTransition(claim: WorkerClaim, input: TargetTransitionInput): Promise<PublicationStatusProjection> {
    const committed = await this.repository.transitionTarget(claim, input);
    await this.repository.acknowledgeTransitionReceipt(claim.organizationId, committed.receiptId, this.clock.now().toISOString());
    return committed.status;
  }

  private async notifyTerminal(organizationId: string, jobId: string, status: PublicationStatusProjection): Promise<void> {
    if (this.notifier === null || status.result === null) return;
    try {
      const context = await this.repository.loadJobNotificationContext(organizationId, jobId);
      if (context === null) return;
      const published = status.targets
        .filter((target) => target.state === 'published' && target.publishedUrl !== null)
        .map((target) => ({ hostname: context.hostnames[target.siteId] ?? target.siteId, url: target.publishedUrl! }));
      const failed = status.targets
        .filter((target) => target.state === 'failed')
        .map((target) => ({ hostname: context.hostnames[target.siteId] ?? target.siteId, code: typeof target.sanitizedError?.code === 'string' ? target.sanitizedError.code : 'unknown' }));
      await this.notifier.notifyJobTerminal({
        organizationId, jobId, articleTitle: context.articleTitle, finishedAt: status.job.finalizedAt ?? status.job.updatedAt, published, failed,
      });
    } catch { /* best-effort notification: queue failures do not fail the worker */ }
  }

  private async returnQueueClaim(queueClaim: QueueClaim, dueAt: Date): Promise<void> {
    await this.queue.schedule(queueClaim.logicalId, dueAt);
    await this.queue.acknowledge(queueClaim);
  }

  async run(workerId: string): Promise<WorkerRunSummary> {
    const started = this.clock.now(); const deadline = started.getTime() + this.policy.functionDeadlineSeconds * 1_000;
    let claimed = 0; let processed = 0; let remainingBudget = Math.max(1, this.policy.batchSize);
    const warmedUrls = new Set<string>();
    const queueClaims = await this.queue.claimDue(started, Math.max(1, this.policy.batchSize), this.policy.leaseSeconds);
    for (const queueClaim of queueClaims) {
      const ref = parseLogicalId(queueClaim.logicalId);
      if (ref === null) { await this.queue.acknowledge(queueClaim); continue; }
      if (remainingBudget <= 0 || this.clock.now().getTime() >= deadline) { await this.returnQueueClaim(queueClaim, this.clock.now()); continue; }
      const claim = await this.repository.claimJob(ref.organizationId, ref.jobId, workerId, queueClaim.leaseExpiresAt.toISOString(), this.clock.now().toISOString());
      if (claim === null) { await this.queue.acknowledge(queueClaim); continue; }
      claimed += 1;
      let interrupted = false; let leaseLost = false; let touched = false;
      try {
        while (remainingBudget > 0 && this.clock.now().getTime() < deadline) {
          const targets = await this.repository.runnableTargets(claim, this.clock.now().toISOString(), remainingBudget);
          if (targets.length === 0) break;
          for (const target of targets) {
            if (remainingBudget <= 0 || this.clock.now().getTime() >= deadline) { interrupted = true; break; }
            const processing = await this.commitTransition(claim, { targetId: target.id, toState: 'processing', now: this.clock.now().toISOString() });
            const current = processing.targets.find(({ id }) => id === target.id)!;
            let outcome;
            try { outcome = await this.publisher.publish(claim, current); }
            catch (error) { outcome = { kind: 'retryable_failure' as const, code: String(sanitizeError(error).name ?? 'dependency_failure') }; }
            if (outcome.kind === 'published') {
              await this.commitTransition(claim, { targetId: target.id, toState: 'published', publishedUrl: outcome.url, now: this.clock.now().toISOString() });
              warmedUrls.add(outcome.url);
              touched = true;
            } else if (outcome.kind === 'retryable_failure') {
              const delay = retryDelaySeconds(this.policy, current.attempt);
              await this.commitTransition(claim, delay === null
                ? { targetId: target.id, toState: 'failed', sanitizedError: { code: 'retry_exhausted' }, now: this.clock.now().toISOString() }
                : { targetId: target.id, toState: 'retrying', sanitizedError: { code: outcome.code }, nextAttemptAt: new Date(this.clock.now().getTime() + delay * 1_000).toISOString(), now: this.clock.now().toISOString() });
              if (delay === null) touched = true;
            } else {
              await this.commitTransition(claim, { targetId: target.id, toState: 'failed', sanitizedError: { code: outcome.code }, now: this.clock.now().toISOString() });
              touched = true;
            }
            processed += 1; remainingBudget -= 1;
          }
        }
        interrupted ||= remainingBudget <= 0 || this.clock.now().getTime() >= deadline;
        await this.repository.releaseJob(claim, this.clock.now().toISOString());
      } catch (error) {
        if (error instanceof PublishingConflictError && error.code === 'stale_fence') leaseLost = true;
        else throw error;
      }
      if (leaseLost) continue;
      const systemActor = { actorType: 'system' as const, actorId: ref.jobId, organizationId: ref.organizationId, permissionSet: new Set(['publishing.read']), entryPoint: 'worker' as const, requestId: `worker:${workerId}` };
      const status = await this.repository.getPublication(systemActor, ref.jobId);
      if (status !== null && status.job.state === 'retrying') await this.queue.schedule(queueClaim.logicalId, new Date(status.job.nextDispatchAt));
      else if (interrupted && status !== null && status.result === null) await this.queue.schedule(queueClaim.logicalId, this.clock.now());
      await this.queue.acknowledge(queueClaim);
      if (status !== null) await this.queue.mirrorState(ref.organizationId, ref.jobId, status.job.state, 3_600);
      if (touched && status !== null && status.result !== null) await this.notifyTerminal(ref.organizationId, ref.jobId, status);
    }
    if (warmedUrls.size > 0) {
      try {
        await this.prewarmer?.prewarm([...warmedUrls]);
      } catch { /* best-effort: crawlers still get correct responses on a miss */ }
    }
    return { claimed, processed, reconciled: 0, cleaned: 0 };
  }

  async reconcile(): Promise<WorkerRunSummary> {
    const now = this.clock.now(); let reconciled = 0; let cleaned = 0;
    const claimExpiresAt = new Date(now.getTime() + Math.max(5, this.policy.leaseSeconds) * 1_000).toISOString();
    for (const job of await this.repository.findExpiredLeases(now.toISOString(), this.policy.batchSize)) {
      await this.repository.recoverExpiredLease(job.organizationId, job.id, this.policy.maxAttempts, now.toISOString()); reconciled += 1;
      const systemActor = { actorType: 'system' as const, actorId: job.id, organizationId: job.organizationId, permissionSet: new Set(['publishing.read']), entryPoint: 'worker' as const, requestId: `reconcile:${now.toISOString()}` };
      const status = await this.repository.getPublication(systemActor, job.id);
      if (status !== null && status.result !== null) await this.notifyTerminal(job.organizationId, job.id, status);
    }
    const dispatchClaimToken = crypto.randomUUID();
    for (const job of await this.repository.claimDispatchGaps(now.toISOString(), this.policy.batchSize, dispatchClaimToken, claimExpiresAt)) {
      try {
        await this.queue.schedule(`${job.organizationId}:${job.id}`, now);
        await this.repository.recordDispatchScheduled(job.organizationId, job.id, now.toISOString(), dispatchClaimToken);
      } catch {
        const delay = retryDelaySeconds(this.policy, job.dispatchAttempts + 1);
        await this.repository.recordDispatchFailure(job.organizationId, job.id, delay !== null, delay === null ? now.toISOString() : new Date(now.getTime() + delay * 1_000).toISOString(), now.toISOString(), dispatchClaimToken);
      }
      reconciled += 1;
    }
    const receiptClaimToken = crypto.randomUUID();
    for (const receipt of await this.repository.claimTransitionReceipts(now.toISOString(), this.policy.batchSize, receiptClaimToken, claimExpiresAt)) {
      await this.repository.reconcileTransitionReceipt(receipt, receiptClaimToken, now.toISOString()); reconciled += 1;
    }
    const cleanupClaimToken = crypto.randomUUID();
    for (const task of await this.repository.claimCleanupTasks(now.toISOString(), this.policy.batchSize, cleanupClaimToken, claimExpiresAt)) {
      try {
        await this.storage.deleteExact(task.objectKey);
        await this.repository.completeCleanupTask(task.organizationId, task.id, task.claimToken, now.toISOString());
      } catch (error) {
        const delay = retryDelaySeconds(this.policy, task.attempts + 1);
        await this.repository.failCleanupTask(task.organizationId, task.id, task.claimToken, delay !== null, delay === null ? now.toISOString() : new Date(now.getTime() + delay * 1_000).toISOString(), sanitizeError(error), now.toISOString());
      }
      cleaned += 1;
    }
    return { claimed: 0, processed: 0, reconciled, cleaned };
  }
}
