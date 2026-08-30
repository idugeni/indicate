import type { AuthorizedTenantActorContext } from '@/domain/context/operation-context';
import { FINGERPRINT_VERSION, publicationFingerprint, retryDelaySeconds, type RetryPolicy } from '@/domain/stage4/publication-policy';
import type { PublicationStatusProjection } from '@/domain/stage4/models';
import type { IdentifierGenerator } from '@/ports/identifier-generator';
import type { RedisCoordinationPort } from '@/ports/redis';
import { Stage4AccessDeniedError, type Stage4Repository } from '@/ports/stage4-repository';
import { createNonDisclosingDenial, createPublicError, type PublicErrorEnvelope } from '@/shared/errors/application-error';
import type { Result } from '@/shared/types/result';
import { publicationRequestSchema, publicationStatusSchema } from './schemas';

interface ClockLike { now(): Date }

export class PublicationService {
  constructor(
    private readonly repository: Stage4Repository,
    private readonly queue: RedisCoordinationPort,
    private readonly identifiers: IdentifierGenerator,
    private readonly retryPolicy: RetryPolicy,
    private readonly clock: ClockLike = { now: () => new Date() },
  ) {}

  private async denied(actor: AuthorizedTenantActorContext, action: string): Promise<Result<never, PublicErrorEnvelope>> {
    try { await this.repository.recordDenial(actor, action, 'publishing_job', this.clock.now().toISOString()); } catch { /* preserve the non-disclosing boundary */ }
    return { ok: false, error: createNonDisclosingDenial(actor.requestId) };
  }

  async request(actor: AuthorizedTenantActorContext, raw: unknown): Promise<Result<PublicationStatusProjection, PublicErrorEnvelope>> {
    const parsed = publicationRequestSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Please correct the publication request.', actor.requestId) };
    const siteIds = [...new Set(parsed.data.siteIds)].sort();
    const fingerprint = await publicationFingerprint({ organizationId: actor.organizationId, articleId: parsed.data.articleId, siteIds, options: parsed.data.options });
    const now = this.clock.now();
    try {
      const accepted = await this.repository.acceptPublication(actor, {
        jobId: this.identifiers.create(), organizationId: actor.organizationId, articleId: parsed.data.articleId, siteIds,
        idempotencyKey: parsed.data.idempotencyKey, fingerprint, fingerprintVersion: FINGERPRINT_VERSION,
        options: parsed.data.options, now: now.toISOString(), targetIds: siteIds.map(() => this.identifiers.create()), articleSiteIds: siteIds.map(() => this.identifiers.create()),
      });
      if (accepted.kind === 'conflict') return { ok: false, error: createPublicError('IDEMPOTENCY_CONFLICT', 'The idempotency key is already associated with another request.', actor.requestId) };
      if (accepted.kind === 'created') {
        try {
          await this.queue.schedule(`${actor.organizationId}:${accepted.job.id}`, now);
          await this.repository.recordDispatchScheduled(actor.organizationId, accepted.job.id, now.toISOString());
        } catch {
          const nextDelay = retryDelaySeconds(this.retryPolicy, 1);
          await this.repository.recordDispatchFailure(actor.organizationId, accepted.job.id, nextDelay !== null, nextDelay === null ? now.toISOString() : new Date(now.getTime() + nextDelay * 1_000).toISOString(), now.toISOString());
        }
      }
      const status = await this.repository.getPublication(actor, accepted.job.id);
      if (status === null) return this.denied(actor, 'publication.request.denied');
      return { ok: true, value: status };
    } catch (error) {
      if (error instanceof Stage4AccessDeniedError) return this.denied(actor, 'publication.request.denied');
      return { ok: false, error: createPublicError('DEPENDENCY_UNAVAILABLE', 'The publication request could not be completed.', actor.requestId) };
    }
  }

  async status(actor: AuthorizedTenantActorContext, raw: unknown): Promise<Result<PublicationStatusProjection, PublicErrorEnvelope>> {
    const parsed = publicationStatusSchema.safeParse(raw); if (!parsed.success) return this.denied(actor, 'publication.status.denied');
    try {
      const status = await this.repository.getPublication(actor, parsed.data.jobId);
      return status === null ? this.denied(actor, 'publication.status.denied') : { ok: true, value: status };
    } catch (error) {
      return error instanceof Stage4AccessDeniedError ? this.denied(actor, 'publication.status.denied')
        : { ok: false, error: createPublicError('DEPENDENCY_UNAVAILABLE', 'Publication status is temporarily unavailable.', actor.requestId) };
    }
  }
}
