import type { AuthorizedTenantActorContext } from '@/core/operation-context';
import { FINGERPRINT_VERSION, publicationFingerprint, retryDelaySeconds, type RetryPolicy } from '@/modules/publishing/publication-policy';
import type { PublicationOverride, PublicationStatusProjection } from '@/modules/publishing/models';
import type { ArticleVariantContext } from '@/modules/publishing/ports';
import { deriveSiteLabel, excerptForDescription, findCrossSiteDuplicates, suggestPublicationVariants } from '@/modules/publishing/variant-suggester';
import type { IdentifierGenerator } from '@/core/system/ports';
import type { RedisCoordinationPort } from '@/integrations/redis/ports';
import { PublishingAccessDeniedError, PublishingConflictError, PublishingSubscriptionInactiveError, type PublishingRepository } from '@/modules/publishing/ports';
import { createNonDisclosingDenial, createPublicError, type PublicErrorEnvelope } from '@/core/errors';
import type { Result } from '@/core/result';
import { publicationRequestSchema, publicationBulkRequestSchema, publicationStatusSchema, publicationSuggestSchema, publicationTargetSelectionSchema } from '@/modules/publishing/schemas';
import { findDuplicateOverrides } from '@/modules/site/seo-validation';

interface ClockLike { now(): Date }

export class PublicationService {
  constructor(
    private readonly repository: PublishingRepository,
    private readonly queue: RedisCoordinationPort,
    private readonly identifiers: IdentifierGenerator,
    private readonly retryPolicy: RetryPolicy,
    private readonly clock: ClockLike = { now: () => new Date() },
  ) {}

  private async denied(actor: AuthorizedTenantActorContext, action: string): Promise<Result<never, PublicErrorEnvelope>> {
    try { await this.repository.recordDenial(actor, action, 'publishing_job', this.clock.now().toISOString()); } catch { /* preserve the non-disclosing boundary */ }
    return { ok: false, error: createNonDisclosingDenial(actor.requestId) };
  }

  private crossSiteDuplicates(
    context: ArticleVariantContext,
    siteIds: readonly string[],
    overrides: Readonly<Record<string, PublicationOverride>>,
  ): readonly { field: string; code: string }[] {
    const renderable = context.variants.filter((variant) =>
      variant.active && (variant.state === 'queued' || variant.state === 'processing' || variant.state === 'retrying' || variant.state === 'published'));
    return findCrossSiteDuplicates({
      canonicalTitle: context.title,
      canonicalDescription: excerptForDescription(context.body),
      existing: renderable.map((variant) => ({ siteId: variant.siteId, customTitle: variant.customTitle, customDescription: variant.customDescription })),
      requestedSiteIds: siteIds,
      overrides,
    });
  }

  private duplicateVariantError(actor: AuthorizedTenantActorContext) {
    return createPublicError('INVALID_INPUT', 'Judul dan deskripsi antar portal harus unik, termasuk portal yang sudah tayang. Minta saran varian unik atau isi override berbeda per portal.', actor.requestId);
  }

  async request(actor: AuthorizedTenantActorContext, raw: unknown): Promise<Result<PublicationStatusProjection, PublicErrorEnvelope>> {
    const parsed = publicationRequestSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Please correct the publication request.', actor.requestId) };
    const siteIds = [...new Set(parsed.data.siteIds)].sort();
    const overrides = parsed.data.overrides;
    for (const siteId of Object.keys(overrides)) {
      if (!siteIds.includes(siteId)) return { ok: false, error: createPublicError('INVALID_INPUT', 'Overrides must reference a requested site.', actor.requestId) };
    }
    if (siteIds.length > 1) {
      for (const siteId of siteIds) {
        const override = overrides[siteId];
        if (override?.title === undefined || override.description === undefined) {
          return { ok: false, error: createPublicError('INVALID_INPUT', 'Multi-site publish requires a distinct custom title and description per site.', actor.requestId) };
        }
      }
      if (findDuplicateOverrides(overrides).length > 0) {
        return { ok: false, error: createPublicError('INVALID_INPUT', 'Each site needs a distinct title and description; duplicates were found.', actor.requestId) };
      }
    }
    const fingerprint = await publicationFingerprint({ organizationId: actor.organizationId, articleId: parsed.data.articleId, siteIds, options: parsed.data.options, overrides });
    const now = this.clock.now();
    try {
      const variantContext = await this.repository.getArticleVariantContext(actor, parsed.data.articleId);
      if (variantContext === null) return this.denied(actor, 'publication.request.denied');
      if (this.crossSiteDuplicates(variantContext, siteIds, overrides).length > 0) {
        return { ok: false, error: this.duplicateVariantError(actor) };
      }
      const accepted = await this.repository.acceptPublication(actor, {
        jobId: this.identifiers.create(), organizationId: actor.organizationId, articleId: parsed.data.articleId, siteIds,
        idempotencyKey: parsed.data.idempotencyKey, fingerprint, fingerprintVersion: FINGERPRINT_VERSION,
        options: parsed.data.options, overrides, now: now.toISOString(), targetIds: siteIds.map(() => this.identifiers.create()), articleSiteIds: siteIds.map(() => this.identifiers.create()),
      });
      if (accepted.kind === 'conflict') return { ok: false, error: createPublicError('IDEMPOTENCY_CONFLICT', 'The idempotency key is already associated with another request.', actor.requestId) };
      if (accepted.kind === 'created') await this.scheduleDispatch(actor, accepted.job.id, now);
      const status = await this.repository.getPublication(actor, accepted.job.id);
      if (status === null) return this.denied(actor, 'publication.request.denied');
      return { ok: true, value: status };
    } catch (error) {
      if (error instanceof PublishingAccessDeniedError) return this.denied(actor, 'publication.request.denied');
      if (error instanceof PublishingSubscriptionInactiveError) return { ok: false, error: createPublicError('FORBIDDEN', 'Langganan tidak aktif. Hubungi administrator agar dapat meminta penerbitan.', actor.requestId) };
      if (error instanceof PublishingConflictError && error.code === 'duplicate_variant') return { ok: false, error: this.duplicateVariantError(actor) };
      return { ok: false, error: createPublicError('DEPENDENCY_UNAVAILABLE', 'The publication request could not be completed.', actor.requestId) };
    }
  }

  /**
   * Menyusun saran override judul/deskripsi unik per portal tanpa menulis job.
   *
   * @param actor - Konteks tenant terotorisasi.
   * @param raw - `{ articleId, siteIds }` yang belum tervalidasi.
   * @returns Peta siteId ke override siap pakai di `request`.
   */
  async suggest(actor: AuthorizedTenantActorContext, raw: unknown): Promise<Result<{ readonly articleId: string; readonly overrides: Readonly<Record<string, PublicationOverride>> }, PublicErrorEnvelope>> {
    const parsed = publicationSuggestSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Please correct the suggestion request.', actor.requestId) };
    const siteIds = [...new Set(parsed.data.siteIds)].sort();
    try {
      const context = await this.repository.getArticleVariantContext(actor, parsed.data.articleId);
      if (context === null) return this.denied(actor, 'publication.suggest.denied');
      const known = new Map(context.variants.map((variant) => [variant.siteId, variant] as const));
      for (const siteId of siteIds) {
        if (!known.has(siteId)) return this.denied(actor, 'publication.suggest.denied');
      }
      const renderable = context.variants.filter((variant) =>
        variant.active && (variant.state === 'queued' || variant.state === 'processing' || variant.state === 'retrying' || variant.state === 'published')
        && !siteIds.includes(variant.siteId));
      const canonicalDescription = excerptForDescription(context.body);
      const overrides = suggestPublicationVariants({
        title: context.title,
        description: canonicalDescription,
        sites: siteIds.map((siteId) => ({ siteId, label: deriveSiteLabel(known.get(siteId)!.normalizedHostname) })),
        takenTitles: renderable.map((variant) => variant.customTitle ?? context.title),
        takenDescriptions: renderable.map((variant) => variant.customDescription ?? canonicalDescription),
      });
      return { ok: true, value: { articleId: context.articleId, overrides } };
    } catch (error) {
      if (error instanceof PublishingAccessDeniedError) return this.denied(actor, 'publication.suggest.denied');
      return { ok: false, error: createPublicError('DEPENDENCY_UNAVAILABLE', 'Variant suggestions are temporarily unavailable.', actor.requestId) };
    }
  }

  async status(actor: AuthorizedTenantActorContext, raw: unknown): Promise<Result<PublicationStatusProjection, PublicErrorEnvelope>> {
    const parsed = publicationStatusSchema.safeParse(raw); if (!parsed.success) return this.denied(actor, 'publication.status.denied');
    try {
      const status = await this.repository.getPublication(actor, parsed.data.jobId);
      return status === null ? this.denied(actor, 'publication.status.denied') : { ok: true, value: status };
    } catch (error) {
      return error instanceof PublishingAccessDeniedError ? this.denied(actor, 'publication.status.denied')
        : { ok: false, error: createPublicError('DEPENDENCY_UNAVAILABLE', 'Publication status is temporarily unavailable.', actor.requestId) };
    }
  }

  private async scheduleDispatch(actor: AuthorizedTenantActorContext, jobId: string, now: Date): Promise<void> {
    try {
      await this.queue.schedule(`${actor.organizationId}:${jobId}`, now);
      await this.repository.recordDispatchScheduled(actor.organizationId, jobId, now.toISOString());
    } catch {
      const nextDelay = retryDelaySeconds(this.retryPolicy, 1);
      await this.repository.recordDispatchFailure(actor.organizationId, jobId, nextDelay !== null, nextDelay === null ? now.toISOString() : new Date(now.getTime() + nextDelay * 1_000).toISOString(), now.toISOString());
    }
  }

  async retry(actor: AuthorizedTenantActorContext, raw: unknown): Promise<Result<PublicationStatusProjection, PublicErrorEnvelope>> {
    const parsed = publicationTargetSelectionSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Please correct the retry request.', actor.requestId) };
    const now = this.clock.now();
    try {
      await this.repository.retryTargets(actor, { jobId: parsed.data.jobId, targetIds: parsed.data.targetIds, now: now.toISOString() });
      await this.scheduleDispatch(actor, parsed.data.jobId, now);
      const refreshed = await this.repository.getPublication(actor, parsed.data.jobId);
      return refreshed === null ? this.denied(actor, 'publication.retry.denied') : { ok: true, value: refreshed };
    } catch (error) {
      if (error instanceof PublishingAccessDeniedError) return this.denied(actor, 'publication.retry.denied');
      if (error instanceof PublishingSubscriptionInactiveError) return { ok: false, error: createPublicError('FORBIDDEN', 'Langganan tidak aktif. Hubungi administrator agar dapat mengulang penerbitan.', actor.requestId) };
      if (error instanceof PublishingConflictError) return { ok: false, error: createPublicError('INVALID_STATE_TRANSITION', 'The job is currently leased by a worker. Try again shortly.', actor.requestId) };
      return { ok: false, error: createPublicError('DEPENDENCY_UNAVAILABLE', 'The retry request could not be completed.', actor.requestId) };
    }
  }

  async unpublish(actor: AuthorizedTenantActorContext, raw: unknown): Promise<Result<PublicationStatusProjection, PublicErrorEnvelope>> {
    const parsed = publicationTargetSelectionSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Please correct the unpublish request.', actor.requestId) };
    try {
      const status = await this.repository.unpublishTargets(actor, { jobId: parsed.data.jobId, targetIds: parsed.data.targetIds, now: this.clock.now().toISOString() });
      return { ok: true, value: status };
    } catch (error) {
      if (error instanceof PublishingAccessDeniedError) return this.denied(actor, 'publication.unpublish.denied');
      if (error instanceof PublishingSubscriptionInactiveError) return { ok: false, error: createPublicError('FORBIDDEN', 'Langganan tidak aktif. Hubungi administrator agar dapat menarik publikasi.', actor.requestId) };
      if (error instanceof PublishingConflictError) return { ok: false, error: createPublicError('INVALID_STATE_TRANSITION', 'The job is currently leased by a worker. Try again shortly.', actor.requestId) };
      return { ok: false, error: createPublicError('DEPENDENCY_UNAVAILABLE', 'The unpublish request could not be completed.', actor.requestId) };
    }
  }

  async requestBulk(actor: AuthorizedTenantActorContext, raw: unknown): Promise<Result<readonly PublicationStatusProjection[], PublicErrorEnvelope>> {
    const parsed = publicationBulkRequestSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Please correct the bulk publication request.', actor.requestId) };
    const siteIds = [...new Set(parsed.data.siteIds)].sort();
    const overrides = parsed.data.overrides;
    for (const siteId of Object.keys(overrides)) {
      if (!siteIds.includes(siteId)) return { ok: false, error: createPublicError('INVALID_INPUT', 'Overrides must reference a requested site.', actor.requestId) };
    }
    if (siteIds.length > 1) {
      for (const siteId of siteIds) {
        const override = overrides[siteId];
        if (override?.title === undefined || override.description === undefined) {
          return { ok: false, error: createPublicError('INVALID_INPUT', 'Multi-site publish requires a distinct custom title and description per site.', actor.requestId) };
        }
      }
      if (findDuplicateOverrides(overrides).length > 0) {
        return { ok: false, error: createPublicError('INVALID_INPUT', 'Each site needs a distinct title and description; duplicates were found.', actor.requestId) };
      }
    }
    const articleIds = [...new Set(parsed.data.articleIds)].sort();
    const now = this.clock.now();
    const results: PublicationStatusProjection[] = [];
    try {
      for (const articleId of articleIds) {
        const variantContext = await this.repository.getArticleVariantContext(actor, articleId);
        if (variantContext === null) return this.denied(actor, 'publication.request.denied');
        if (this.crossSiteDuplicates(variantContext, siteIds, overrides).length > 0) {
          return { ok: false, error: this.duplicateVariantError(actor) };
        }
        const fingerprint = await publicationFingerprint({ organizationId: actor.organizationId, articleId, siteIds, options: parsed.data.options, overrides });
        const accepted = await this.repository.acceptPublication(actor, {
          jobId: this.identifiers.create(), organizationId: actor.organizationId, articleId, siteIds,
          idempotencyKey: `${parsed.data.idempotencyKey}:${articleId}`, fingerprint, fingerprintVersion: FINGERPRINT_VERSION,
          options: parsed.data.options, overrides, now: now.toISOString(), targetIds: siteIds.map(() => this.identifiers.create()), articleSiteIds: siteIds.map(() => this.identifiers.create()),
        });
        if (accepted.kind === 'conflict') return { ok: false, error: createPublicError('IDEMPOTENCY_CONFLICT', `The idempotency key is already associated with another request for article ${articleId}.`, actor.requestId) };
        if (accepted.kind === 'created') await this.scheduleDispatch(actor, accepted.job.id, now);
        const status = await this.repository.getPublication(actor, accepted.job.id);
        if (status === null) return this.denied(actor, 'publication.request.denied');
        results.push(status);
      }
      return { ok: true, value: results };
    } catch (error) {
      if (error instanceof PublishingAccessDeniedError) return this.denied(actor, 'publication.request.denied');
      if (error instanceof PublishingSubscriptionInactiveError) return { ok: false, error: createPublicError('FORBIDDEN', 'Langganan tidak aktif. Hubungi administrator agar dapat meminta penerbitan.', actor.requestId) };
      if (error instanceof PublishingConflictError && error.code === 'duplicate_variant') return { ok: false, error: this.duplicateVariantError(actor) };
      return { ok: false, error: createPublicError('DEPENDENCY_UNAVAILABLE', 'The bulk publication request could not be completed.', actor.requestId) };
    }
  }
}
