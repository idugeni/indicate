import type { AuthorizedTenantActorContext, HostnameContext } from '@/domain/context/operation-context';
import type { AuditRecord } from '@/domain/stage3/models';
import { canPublicAccessMedia, canTenantAccessMedia } from '@/domain/stage4/media-authorization';
import type {
  ClaimedCleanupTask, MediaAssetRecord, PublicationJobRecord, PublicationStatusProjection, PublicationTargetRecord,
  Stage4TenantSnapshot, TargetTransitionCommit, TransitionReceiptRecord, WorkerClaim,
} from '@/domain/stage4/models';
import { aggregateJobState, hasCurrentFence, isAllowedTargetTransition, projectPublicationResult } from '@/domain/stage4/publication-policy';
import {
  Stage4AccessDeniedError, Stage4ConflictError, type AcceptPublicationInput, type AcceptPublicationResult,
  type ActivateMediaInput, type ReserveMediaCandidate, type ReservationCandidateResult, type Stage4Repository,
  type TargetTransitionInput,
} from '@/ports/stage4-repository';
import { redact } from '@/shared/security/redaction';

const MEDIA_MANAGE = 'media.manage';
const MEDIA_READ = 'media.read';
const PUBLISH_REQUEST = 'publishing.request';
const PUBLISH_READ = 'publishing.read';

type MutableSnapshot = {
  -readonly [Key in keyof Stage4TenantSnapshot]: Stage4TenantSnapshot[Key] extends readonly (infer Item)[] ? Item[] : Stage4TenantSnapshot[Key];
};

const clone = (state: Stage4TenantSnapshot): MutableSnapshot => structuredClone(state) as MutableSnapshot;
function frozen(state: Stage4TenantSnapshot): Stage4TenantSnapshot {
  const value = clone(state);
  for (const key of Object.keys(value) as (keyof Stage4TenantSnapshot)[]) if (Array.isArray(value[key])) Object.freeze(value[key]);
  return Object.freeze(value);
}
const claimKey = (organizationId: string, id: string) => `${organizationId}:${id}`;

export class InMemoryStage4Repository implements Stage4Repository {
  private readonly states = new Map<string, MutableSnapshot>();
  private readonly dispatchClaims = new Map<string, { token: string; expiresAt: string }>();
  private readonly cleanupClaims = new Map<string, { token: string; expiresAt: string }>();
  private readonly receiptClaims = new Map<string, { token: string; expiresAt: string }>();
  failNextAudit = false;
  failNextReceiptAcknowledgement = false;

  constructor(states: readonly Stage4TenantSnapshot[] = []) {
    for (const input of states) {
      const state = clone(input);
      state.transitionReceipts ??= [];
      this.states.set(state.organizationId, state);
    }
  }

  private state(organizationId: string): MutableSnapshot {
    const state = this.states.get(organizationId);
    if (state === undefined) throw new Stage4AccessDeniedError();
    return state;
  }
  private authorize(actor: AuthorizedTenantActorContext, permission: string): MutableSnapshot {
    const state = this.state(actor.organizationId);
    if (!actor.permissionSet.has(permission)) throw new Stage4AccessDeniedError();
    return state;
  }
  private mutate<T>(organizationId: string, operation: (state: MutableSnapshot) => T): T {
    const working = clone(this.state(organizationId));
    const result = operation(working);
    this.states.set(organizationId, working);
    return structuredClone(result);
  }
  private audit(
    state: MutableSnapshot,
    actor: Pick<AuthorizedTenantActorContext, 'actorType' | 'actorId' | 'entryPoint' | 'requestId'>,
    action: string,
    targetType: string,
    targetId: string | null,
    before: object | null,
    after: object | null,
    now: string,
    outcome: AuditRecord['outcome'] = 'succeeded',
  ): void {
    if (this.failNextAudit) { this.failNextAudit = false; throw new Error('Injected audit failure'); }
    state.auditLogs.push({
      id: crypto.randomUUID(), organizationId: state.organizationId, actorType: actor.actorType, actorId: actor.actorId,
      entryPoint: actor.entryPoint, action, targetType, targetId, outcome,
      changedFields: after === null ? [] : Object.keys(after).sort(), before: before === null ? null : redact(before) as Record<string, unknown>,
      after: after === null ? null : redact(after) as Record<string, unknown>, requestId: actor.requestId, occurredAt: now,
    });
  }
  private system(actorId: string, entryPoint: 'worker' | 'reconciler' = 'worker') {
    return { actorType: 'system' as const, actorId, entryPoint, requestId: `stage4:${actorId}` };
  }
  private receipt(state: MutableSnapshot, job: PublicationJobRecord, targetId: string | null, fromState: PublicationJobRecord['state'], toState: PublicationJobRecord['state'], now: string, acknowledged = false): TransitionReceiptRecord {
    const value: TransitionReceiptRecord = {
      id: crypto.randomUUID(), organizationId: state.organizationId, transitionId: crypto.randomUUID(), jobId: job.id,
      targetId, fromState, toState, fencingToken: job.fencingToken, acknowledgedAt: acknowledged ? now : null, createdAt: now,
    };
    state.transitionReceipts.push(value);
    return value;
  }
  private status(state: MutableSnapshot, job: PublicationJobRecord): PublicationStatusProjection {
    const targets = state.targets.filter(({ jobId }) => jobId === job.id);
    return structuredClone({ job, targets, result: job.state === 'published' || job.state === 'failed' ? projectPublicationResult(targets) : null });
  }

  async recordDenial(actor: AuthorizedTenantActorContext, action: string, targetType: string, now: string): Promise<void> {
    this.mutate(actor.organizationId, (state) => this.audit(state, actor, action, targetType, null, null, { reason: 'authorization_denied' }, now, 'denied'));
  }

  async reserveMediaCandidate(actor: AuthorizedTenantActorContext, input: ReserveMediaCandidate): Promise<ReservationCandidateResult> {
    this.authorize(actor, MEDIA_MANAGE);
    for (const state of this.states.values()) if (state.reservations.some(({ objectKey }) => objectKey === input.objectKey) || state.media.some(({ objectKey }) => objectKey === input.objectKey)) return { kind: 'occupied' };
    return this.mutate(actor.organizationId, (state) => {
      const owner = input.owner;
      if (owner.kind === 'article' && !state.articles.some(({ id, active }) => id === owner.articleId && active)) throw new Stage4AccessDeniedError();
      if (owner.kind === 'site' && !state.sites.some(({ id, active }) => id === owner.siteId && active)) throw new Stage4AccessDeniedError();
      const reservation = {
        id: input.reservationId, organizationId: actor.organizationId, objectKey: input.objectKey, purpose: input.purpose,
        owner: input.owner, expectedMediaType: input.expectedMediaType, expectedSizeBytes: input.expectedSizeBytes,
        expectedChecksum: input.expectedChecksum, status: 'reserved' as const, expiresAt: input.expiresAt, createdAt: input.now, updatedAt: input.now,
      };
      state.reservations.push(reservation);
      this.audit(state, actor, 'media.upload.reserve', 'media_key_reservation', reservation.id, null, { objectKey: reservation.objectKey, purpose: reservation.purpose }, input.now);
      return { kind: 'reserved' as const, reservation };
    });
  }
  async markReservationOccupied(actor: AuthorizedTenantActorContext, reservationId: string, now: string): Promise<void> {
    this.authorize(actor, MEDIA_MANAGE);
    this.mutate(actor.organizationId, (state) => {
      const index = state.reservations.findIndex(({ id, status }) => id === reservationId && status === 'reserved');
      if (index < 0) throw new Stage4AccessDeniedError();
      state.reservations[index] = { ...state.reservations[index]!, status: 'occupied', updatedAt: now };
    });
  }
  async readReservation(actor: AuthorizedTenantActorContext, reservationId: string) {
    return structuredClone(this.authorize(actor, MEDIA_MANAGE).reservations.find(({ id }) => id === reservationId) ?? null);
  }
  async activateMedia(actor: AuthorizedTenantActorContext, input: ActivateMediaInput): Promise<MediaAssetRecord> {
    this.authorize(actor, MEDIA_MANAGE);
    return this.mutate(actor.organizationId, (state) => {
      const reservationIndex = state.reservations.findIndex(({ id, status }) => id === input.reservationId && status === 'reserved');
      const reservation = state.reservations[reservationIndex];
      if (reservation === undefined || reservation.expiresAt < input.now) throw new Stage4AccessDeniedError();
      const media: MediaAssetRecord = {
        id: input.mediaId, organizationId: actor.organizationId, objectKey: reservation.objectKey, purpose: reservation.purpose,
        mediaType: input.mediaType, sizeBytes: input.sizeBytes, checksum: input.checksum, owner: reservation.owner,
        state: 'active', version: 1, createdAt: input.now, updatedAt: input.now,
      };
      state.media.push(media);
      state.reservations[reservationIndex] = { ...reservation, status: 'used', updatedAt: input.now };
      const reservationOwner = reservation.owner;
      const affectedSites = reservationOwner.kind === 'site' ? [reservationOwner.siteId]
        : reservationOwner.kind === 'article' ? state.articleSites.filter(({ articleId, active }) => articleId === reservationOwner.articleId && active).map(({ siteId }) => siteId) : [];
      for (const siteId of new Set(affectedSites)) state.invalidationIntents.push({ id: crypto.randomUUID(), organizationId: actor.organizationId, siteId, reason: 'media.activated', tags: [`site:${siteId}`, `media:${media.id}`], status: 'pending' });
      this.audit(state, actor, 'media.activate', 'media', media.id, null, { ...media, checksum: '[REDACTED]' }, input.now);
      return media;
    });
  }
  async rejectMedia(actor: AuthorizedTenantActorContext, reservationId: string, reason: string, now: string): Promise<void> {
    this.authorize(actor, MEDIA_MANAGE);
    this.mutate(actor.organizationId, (state) => {
      const index = state.reservations.findIndex(({ id, status }) => id === reservationId && status === 'reserved');
      const reservation = state.reservations[index]; if (reservation === undefined) throw new Stage4AccessDeniedError();
      state.reservations[index] = { ...reservation, status: 'occupied', updatedAt: now };
      state.cleanupTasks.push({ id: crypto.randomUUID(), organizationId: actor.organizationId, objectKey: reservation.objectKey, reason, status: 'pending', attempts: 0, nextAttemptAt: now, sanitizedFailure: null });
      this.audit(state, actor, 'media.reject', 'media_key_reservation', reservation.id, null, { reason }, now);
    });
  }
  async archiveMedia(actor: AuthorizedTenantActorContext, mediaId: string, expectedVersion: number, now: string): Promise<MediaAssetRecord> {
    this.authorize(actor, MEDIA_MANAGE);
    return this.mutate(actor.organizationId, (state) => {
      const index = state.media.findIndex(({ id }) => id === mediaId); const before = state.media[index];
      if (before === undefined || before.state !== 'active') throw new Stage4AccessDeniedError();
      if (before.version !== expectedVersion) throw new Stage4ConflictError();
      const after = { ...before, state: 'archived' as const, version: before.version + 1, updatedAt: now }; state.media[index] = after;
      const affectedSites = new Set(state.sites.filter(({ settingsMediaIds }) => settingsMediaIds.includes(mediaId)).map(({ id }) => id));
      const referencedArticleIds = new Set(state.articles.filter(({ active, leadMediaId }) => active && leadMediaId === mediaId).map(({ id }) => id));
      if (before.owner.kind === 'article') referencedArticleIds.add(before.owner.articleId);
      for (const relation of state.articleSites) if (referencedArticleIds.has(relation.articleId) && relation.active && relation.state === 'published') affectedSites.add(relation.siteId);
      for (const siteId of affectedSites) state.invalidationIntents.push({ id: crypto.randomUUID(), organizationId: actor.organizationId, siteId, reason: 'media.archived', tags: [`site:${siteId}`, `media:${mediaId}`], status: 'pending' });
      this.audit(state, actor, 'media.archive', 'media', mediaId, before, after, now); return after;
    });
  }
  async listMedia(actor: AuthorizedTenantActorContext) { return structuredClone(this.authorize(actor, MEDIA_READ).media); }
  async authorizeTenantMedia(actor: AuthorizedTenantActorContext, mediaId: string) {
    this.authorize(actor, MEDIA_READ);
    return this.mutate(actor.organizationId, (state) => {
      const item = state.media.find(({ id }) => id === mediaId);
      if (item === undefined || !canTenantAccessMedia(actor.organizationId, item)) return null;
      this.audit(state, actor, 'media.access.authorize', 'media', item.id, null, { scope: 'tenant' }, new Date().toISOString());
      return item;
    });
  }
  async authorizePublicMedia(context: HostnameContext, mediaId: string, requestId: string) {
    const current = this.states.get(context.organizationId); if (current === undefined) return null;
    const item = current.media.find(({ id }) => id === mediaId); const site = current.sites.find(({ id }) => id === context.siteId);
    if (item === undefined || site === undefined || !canPublicAccessMedia({ context, media: item, site, articles: current.articles, articleSites: current.articleSites })) return null;
    return this.mutate(context.organizationId, (state) => {
      const authorized = state.media.find(({ id }) => id === mediaId); if (authorized === undefined) return null;
      this.audit(state, { actorType: 'system', actorId: context.siteId, entryPoint: 'api', requestId }, 'media.access.authorize', 'media', mediaId, null, { scope: 'public', siteId: context.siteId }, new Date().toISOString());
      return authorized;
    });
  }

  async acceptPublication(actor: AuthorizedTenantActorContext, input: AcceptPublicationInput): Promise<AcceptPublicationResult> {
    this.authorize(actor, PUBLISH_REQUEST);
    return this.mutate(actor.organizationId, (state) => {
      const existing = state.jobs.find(({ idempotencyKey }) => idempotencyKey === input.idempotencyKey);
      if (existing !== undefined) return existing.fingerprint === input.fingerprint ? { kind: 'reused' as const, job: existing } : { kind: 'conflict' as const, existingJobId: existing.id };
      const article = state.articles.find(({ id, active }) => id === input.articleId && active); if (article === undefined) throw new Stage4AccessDeniedError();
      const siteIds = [...new Set(input.siteIds)];
      if (siteIds.length !== input.targetIds.length || siteIds.length !== input.articleSiteIds.length) throw new Stage4ConflictError();
      if (siteIds.some((siteId) => !state.sites.some(({ id, active }) => id === siteId && active))) throw new Stage4AccessDeniedError();
      for (const siteId of siteIds) {
        const relation = state.articleSites.find((candidate) => candidate.articleId === article.id && candidate.siteId === siteId);
        if (relation !== undefined && state.targets.some((target) => target.articleSiteId === relation.id && ['queued', 'processing', 'retrying'].includes(target.state))) throw new Stage4ConflictError();
      }
      const job: PublicationJobRecord = {
        id: input.jobId, organizationId: actor.organizationId, articleId: article.id, idempotencyKey: input.idempotencyKey,
        fingerprint: input.fingerprint, fingerprintVersion: input.fingerprintVersion, state: 'queued', options: input.options,
        dispatchStatus: 'pending', dispatchAttempts: 0, nextDispatchAt: input.now, leaseOwner: null, leaseExpiresAt: null,
        fencingToken: 0, finalizedAt: null, version: 1, createdAt: input.now, updatedAt: input.now,
      };
      state.jobs.push(job);
      siteIds.forEach((siteId, index) => {
        let relation = state.articleSites.find((candidate) => candidate.articleId === article.id && candidate.siteId === siteId);
        if (relation === undefined) {
          relation = { id: input.articleSiteIds[index]!, organizationId: actor.organizationId, articleId: article.id, siteId, active: true, state: 'queued', publishedUrl: null, publishedAt: null, version: 1 };
          state.articleSites.push(relation);
        }
        const target: PublicationTargetRecord = { id: input.targetIds[index]!, organizationId: actor.organizationId, jobId: job.id, articleSiteId: relation.id, siteId, state: 'queued', attempt: 0, fencingToken: 0, nextAttemptAt: input.now, startedAt: null, finishedAt: null, publishedUrl: null, publishedAt: null, sanitizedError: null };
        state.targets.push(target);
        const relationIndex = state.articleSites.findIndex(({ id }) => id === relation!.id);
        state.articleSites[relationIndex] = { ...relation, active: true, state: 'queued', publishedUrl: null, publishedAt: null, version: relation.version + (relation.version > 0 ? 1 : 0) };
      });
      this.audit(state, actor, 'publication.request', 'publishing_job', job.id, null, { articleId: article.id, siteIds }, input.now);
      return { kind: 'created' as const, job };
    });
  }
  async recordDispatchScheduled(organizationId: string, jobId: string, now: string, claimToken?: string): Promise<void> {
    this.mutate(organizationId, (state) => {
      if (claimToken !== undefined && this.dispatchClaims.get(claimKey(organizationId, jobId))?.token !== claimToken) return;
      const index = state.jobs.findIndex(({ id }) => id === jobId); const job = state.jobs[index];
      if (job === undefined || job.dispatchStatus !== 'pending') return;
      state.jobs[index] = { ...job, dispatchStatus: 'scheduled', dispatchAttempts: job.dispatchAttempts + 1, updatedAt: now, version: job.version + 1 };
      this.dispatchClaims.delete(claimKey(organizationId, jobId));
    });
  }
  async recordDispatchFailure(organizationId: string, jobId: string, retryable: boolean, nextAt: string, now: string, claimToken?: string): Promise<void> {
    this.mutate(organizationId, (state) => {
      if (claimToken !== undefined && this.dispatchClaims.get(claimKey(organizationId, jobId))?.token !== claimToken) return;
      const index = state.jobs.findIndex(({ id }) => id === jobId); const job = state.jobs[index];
      if (job === undefined || job.dispatchStatus !== 'pending') return;
      if (!retryable) {
        for (let targetIndex = 0; targetIndex < state.targets.length; targetIndex += 1) {
          const target = state.targets[targetIndex]!; if (target.jobId !== jobId || target.state === 'published' || target.state === 'failed') continue;
          const failed = { ...target, state: 'failed' as const, finishedAt: now, sanitizedError: { code: 'dispatch_exhausted' } }; state.targets[targetIndex] = failed;
          const relationIndex = state.articleSites.findIndex(({ id }) => id === target.articleSiteId);
          const relation = state.articleSites[relationIndex]; if (relation !== undefined) state.articleSites[relationIndex] = { ...relation, state: 'failed', publishedUrl: null, publishedAt: null, version: relation.version + 1 };
        }
      }
      const nextState = retryable ? 'retrying' as const : 'failed' as const;
      state.jobs[index] = { ...job, state: nextState, dispatchStatus: retryable ? 'pending' : 'failed', dispatchAttempts: job.dispatchAttempts + 1, nextDispatchAt: nextAt, finalizedAt: retryable ? null : now, updatedAt: now, version: job.version + 1 };
      this.receipt(state, job, null, job.state, nextState, now, true);
      this.audit(state, this.system(jobId, 'reconciler'), 'publication.dispatch.failure', 'publishing_job', jobId, null, { retryable }, now);
      this.dispatchClaims.delete(claimKey(organizationId, jobId));
    });
  }
  async getPublication(actor: AuthorizedTenantActorContext, jobId: string): Promise<PublicationStatusProjection | null> {
    const state = this.authorize(actor, PUBLISH_READ); const job = state.jobs.find(({ id }) => id === jobId); return job === undefined ? null : this.status(state, job);
  }
  async claimDispatchGaps(now: string, limit: number, claimToken: string, claimExpiresAt: string) {
    const candidates = [...this.states.values()].flatMap((state) => state.jobs).filter((job) => ['queued', 'retrying'].includes(job.state) && job.dispatchStatus === 'pending' && job.nextDispatchAt <= now)
      .sort((a, b) => a.nextDispatchAt.localeCompare(b.nextDispatchAt));
    const claimed: PublicationJobRecord[] = [];
    for (const job of candidates) {
      if (claimed.length >= Math.max(1, limit)) break;
      const key = claimKey(job.organizationId, job.id); const current = this.dispatchClaims.get(key);
      if (current !== undefined && current.expiresAt > now) continue;
      this.dispatchClaims.set(key, { token: claimToken, expiresAt: claimExpiresAt }); claimed.push(structuredClone(job));
    }
    return claimed;
  }
  async claimJob(organizationId: string, jobId: string, workerId: string, leaseExpiresAt: string, now: string): Promise<WorkerClaim | null> {
    return this.mutate(organizationId, (state) => {
      const index = state.jobs.findIndex(({ id }) => id === jobId); const job = state.jobs[index];
      if (job === undefined || !['queued', 'retrying'].includes(job.state) || (job.leaseExpiresAt !== null && job.leaseExpiresAt > now)) return null;
      const token = job.fencingToken + 1; const updated = { ...job, state: 'processing' as const, dispatchStatus: 'leased' as const, leaseOwner: workerId, leaseExpiresAt, fencingToken: token, updatedAt: now, version: job.version + 1 };
      state.jobs[index] = updated; this.receipt(state, updated, null, job.state, 'processing', now, true);
      this.audit(state, this.system(jobId), 'publication.job.claim', 'publishing_job', jobId, null, { fencingToken: token }, now);
      return { organizationId, jobId, workerId, fencingToken: token, leaseExpiresAt };
    });
  }
  async runnableTargets(claim: WorkerClaim, now: string, limit: number) {
    const state = this.state(claim.organizationId); const job = state.jobs.find(({ id }) => id === claim.jobId);
    if (job === undefined || !hasCurrentFence(job.fencingToken, claim.fencingToken) || job.leaseOwner !== claim.workerId || job.leaseExpiresAt === null || job.leaseExpiresAt <= now) throw new Stage4ConflictError('stale_fence');
    return structuredClone(state.targets.filter(({ jobId, state: targetState, nextAttemptAt }) => jobId === claim.jobId && (targetState === 'queued' || targetState === 'retrying') && nextAttemptAt <= now).slice(0, limit));
  }
  async transitionTarget(claim: WorkerClaim, input: TargetTransitionInput): Promise<TargetTransitionCommit> {
    return this.mutate(claim.organizationId, (state) => {
      const jobIndex = state.jobs.findIndex(({ id }) => id === claim.jobId); const job = state.jobs[jobIndex];
      if (job === undefined || !hasCurrentFence(job.fencingToken, claim.fencingToken) || job.leaseOwner !== claim.workerId || job.leaseExpiresAt === null || job.leaseExpiresAt <= input.now) throw new Stage4ConflictError('stale_fence');
      const targetIndex = state.targets.findIndex(({ id, jobId }) => id === input.targetId && jobId === claim.jobId); const target = state.targets[targetIndex]; if (target === undefined) throw new Stage4AccessDeniedError();
      if (!isAllowedTargetTransition(target.state, input.toState)) throw new Stage4ConflictError('invalid_transition');
      if ((target.state === 'published' || target.state === 'failed') && target.state === input.toState) return { status: this.status(state, job), receiptId: state.transitionReceipts.find((item) => item.targetId === target.id)?.id ?? crypto.randomUUID() };
      if (input.toState === 'published' && input.publishedUrl == null) throw new Stage4ConflictError('invalid_transition');
      const after: PublicationTargetRecord = {
        ...target, state: input.toState, attempt: input.toState === 'processing' ? target.attempt + 1 : target.attempt,
        fencingToken: claim.fencingToken, nextAttemptAt: input.nextAttemptAt ?? target.nextAttemptAt,
        startedAt: input.toState === 'processing' ? input.now : target.startedAt,
        finishedAt: input.toState === 'published' || input.toState === 'failed' ? input.now : null,
        publishedUrl: input.toState === 'published' ? input.publishedUrl ?? null : target.publishedUrl,
        publishedAt: input.toState === 'published' ? input.now : target.publishedAt,
        sanitizedError: input.sanitizedError ?? (input.toState === 'processing' ? null : target.sanitizedError),
      };
      state.targets[targetIndex] = after;
      const relationIndex = state.articleSites.findIndex(({ id }) => id === target.articleSiteId); const relation = state.articleSites[relationIndex]; if (relation === undefined) throw new Stage4ConflictError();
      state.articleSites[relationIndex] = { ...relation, state: after.state, publishedUrl: after.state === 'published' ? after.publishedUrl : null, publishedAt: after.state === 'published' ? after.publishedAt : null, version: relation.version + 1 };
      let aggregate = aggregateJobState(state.targets.filter(({ jobId }) => jobId === job.id).map(({ state: value }) => value));
      if (aggregate === 'queued') aggregate = 'processing';
      const terminal = aggregate === 'published' || aggregate === 'failed';
      const retryAt = aggregate === 'retrying' ? state.targets.filter(({ jobId, state: value }) => jobId === job.id && value === 'retrying').map(({ nextAttemptAt }) => nextAttemptAt).sort()[0] ?? input.now : job.nextDispatchAt;
      const updatedJob = { ...job, state: aggregate, dispatchStatus: aggregate === 'retrying' ? 'pending' as const : job.dispatchStatus, nextDispatchAt: retryAt, finalizedAt: terminal ? input.now : null, updatedAt: input.now, version: job.version + 1 };
      state.jobs[jobIndex] = updatedJob;
      const receipt = this.receipt(state, updatedJob, target.id, target.state, input.toState, input.now);
      this.audit(state, this.system(claim.jobId), `publication.target.${input.toState}`, 'publishing_job_target', target.id, target, after, input.now);
      return { status: this.status(state, updatedJob), receiptId: receipt.id };
    });
  }
  async acknowledgeTransitionReceipt(organizationId: string, receiptId: string, now: string): Promise<void> {
    if (this.failNextReceiptAcknowledgement) { this.failNextReceiptAcknowledgement = false; throw new Error('Injected transition acknowledgement crash.'); }
    this.mutate(organizationId, (state) => {
      const index = state.transitionReceipts.findIndex(({ id }) => id === receiptId); const receipt = state.transitionReceipts[index];
      if (receipt === undefined) throw new Stage4AccessDeniedError();
      state.transitionReceipts[index] = { ...receipt, acknowledgedAt: receipt.acknowledgedAt ?? now };
    });
  }
  async releaseJob(claim: WorkerClaim, now: string): Promise<void> {
    this.mutate(claim.organizationId, (state) => {
      const index = state.jobs.findIndex(({ id }) => id === claim.jobId); const job = state.jobs[index];
      if (job === undefined || job.fencingToken !== claim.fencingToken || job.leaseOwner !== claim.workerId || job.leaseExpiresAt === null || job.leaseExpiresAt <= now) throw new Stage4ConflictError('stale_fence');
      const incomplete = state.targets.filter((target) => target.jobId === job.id && (target.state === 'queued' || target.state === 'retrying'));
      const nextState = job.state === 'processing' && incomplete.length > 0 ? 'retrying' as const : job.state;
      const nextDispatchAt = nextState === 'retrying'
        ? incomplete.some(({ state: targetState }) => targetState === 'queued')
          ? now
          : incomplete.map(({ nextAttemptAt }) => nextAttemptAt).sort()[0] ?? job.nextDispatchAt
        : job.nextDispatchAt;
      state.jobs[index] = { ...job, state: nextState, dispatchStatus: nextState === 'published' || nextState === 'failed' ? 'acknowledged' : nextState === 'retrying' ? 'pending' : 'scheduled', nextDispatchAt, leaseOwner: null, leaseExpiresAt: null, updatedAt: now, version: job.version + 1 };
      if (nextState !== job.state) this.receipt(state, job, null, job.state, nextState, now, true);
    });
  }
  async findExpiredLeases(now: string, limit: number) { return [...this.states.values()].flatMap((state) => state.jobs).filter((job) => job.leaseExpiresAt !== null && job.leaseExpiresAt <= now && job.state === 'processing').slice(0, Math.max(1, limit)).map((value) => structuredClone(value)); }
  async recoverExpiredLease(organizationId: string, jobId: string, maxAttempts: number, now: string): Promise<void> {
    this.mutate(organizationId, (state) => {
      const index = state.jobs.findIndex(({ id }) => id === jobId); const job = state.jobs[index];
      if (job === undefined || job.state !== 'processing' || job.leaseExpiresAt === null || job.leaseExpiresAt > now) return;
      for (let targetIndex = 0; targetIndex < state.targets.length; targetIndex += 1) {
        const target = state.targets[targetIndex]!; if (target.jobId !== jobId || target.state !== 'processing') continue;
        const exhausted = target.attempt >= maxAttempts;
        state.targets[targetIndex] = { ...target, state: exhausted ? 'failed' : 'retrying', nextAttemptAt: now, finishedAt: exhausted ? now : null, sanitizedError: { code: exhausted ? 'retry_exhausted' : 'lease_expired' } };
        const relationIndex = state.articleSites.findIndex(({ id }) => id === target.articleSiteId); const relation = state.articleSites[relationIndex];
        if (relation !== undefined) state.articleSites[relationIndex] = { ...relation, state: exhausted ? 'failed' : 'retrying', publishedUrl: null, publishedAt: null, version: relation.version + 1 };
      }
      let aggregate = aggregateJobState(state.targets.filter(({ jobId: id }) => id === jobId).map(({ state }) => state));
      if (aggregate === 'queued') aggregate = 'retrying';
      const terminal = aggregate === 'published' || aggregate === 'failed';
      state.jobs[index] = { ...job, state: aggregate, dispatchStatus: terminal ? 'acknowledged' : 'pending', leaseOwner: null, leaseExpiresAt: null, nextDispatchAt: now, finalizedAt: terminal ? now : null, updatedAt: now, version: job.version + 1 };
      this.receipt(state, job, null, job.state, aggregate, now, true);
      this.audit(state, this.system(jobId, 'reconciler'), 'publication.lease.recover', 'publishing_job', jobId, null, { state: aggregate }, now);
    });
  }
  async claimTransitionReceipts(now: string, limit: number, claimToken: string, claimExpiresAt: string): Promise<readonly TransitionReceiptRecord[]> {
    const output: TransitionReceiptRecord[] = [];
    for (const state of this.states.values()) for (const receipt of state.transitionReceipts) {
      if (output.length >= Math.max(1, limit)) return output;
      if (receipt.acknowledgedAt !== null) continue;
      const key = claimKey(receipt.organizationId, receipt.id); const current = this.receiptClaims.get(key);
      if (current !== undefined && current.expiresAt > now) continue;
      this.receiptClaims.set(key, { token: claimToken, expiresAt: claimExpiresAt }); output.push(structuredClone(receipt));
    }
    return output;
  }
  async reconcileTransitionReceipt(receipt: TransitionReceiptRecord, claimToken: string, now: string): Promise<void> {
    const key = claimKey(receipt.organizationId, receipt.id); const claim = this.receiptClaims.get(key);
    if (claim?.token !== claimToken || claim.expiresAt <= now) return;
    this.mutate(receipt.organizationId, (state) => {
      const index = state.transitionReceipts.findIndex(({ id }) => id === receipt.id); const current = state.transitionReceipts[index]; if (current === undefined || current.acknowledgedAt !== null) return;
      state.transitionReceipts[index] = { ...current, acknowledgedAt: now };
    });
    this.receiptClaims.delete(key);
  }
  async claimCleanupTasks(now: string, limit: number, claimToken: string, claimExpiresAt: string): Promise<readonly ClaimedCleanupTask[]> {
    const output: ClaimedCleanupTask[] = [];
    for (const state of this.states.values()) for (let index = 0; index < state.cleanupTasks.length; index += 1) {
      if (output.length >= Math.max(1, limit)) return output;
      const task = state.cleanupTasks[index]!; if (task.status !== 'pending' || task.nextAttemptAt > now) continue;
      const key = claimKey(task.organizationId, task.id); const current = this.cleanupClaims.get(key); if (current !== undefined && current.expiresAt > now) continue;
      this.cleanupClaims.set(key, { token: claimToken, expiresAt: claimExpiresAt }); state.cleanupTasks[index] = { ...task, status: 'processing' }; output.push({ ...structuredClone(task), status: 'processing', claimToken });
    }
    return output;
  }
  async completeCleanupTask(organizationId: string, taskId: string, claimToken: string): Promise<void> {
    const key = claimKey(organizationId, taskId); if (this.cleanupClaims.get(key)?.token !== claimToken) return;
    this.mutate(organizationId, (state) => { const index = state.cleanupTasks.findIndex(({ id }) => id === taskId); const task = state.cleanupTasks[index]; if (task !== undefined && task.status === 'processing') state.cleanupTasks[index] = { ...task, status: 'completed' }; }); this.cleanupClaims.delete(key);
  }
  async failCleanupTask(organizationId: string, taskId: string, claimToken: string, retryable: boolean, nextAt: string, failure: Readonly<Record<string, unknown>>): Promise<void> {
    const key = claimKey(organizationId, taskId); if (this.cleanupClaims.get(key)?.token !== claimToken) return;
    this.mutate(organizationId, (state) => { const index = state.cleanupTasks.findIndex(({ id }) => id === taskId); const task = state.cleanupTasks[index]; if (task !== undefined && task.status === 'processing') state.cleanupTasks[index] = { ...task, status: retryable ? 'pending' : 'failed', attempts: task.attempts + 1, nextAttemptAt: nextAt, sanitizedFailure: redact(failure) as Record<string, unknown> }; }); this.cleanupClaims.delete(key);
  }
  async snapshot(organizationId: string) { const state = this.states.get(organizationId); return state === undefined ? null : frozen(state); }
}
