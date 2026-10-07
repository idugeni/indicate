import type { AuthorizedTenantActorContext } from '@/core/operation-context';
import { FINGERPRINT_VERSION, publicationFingerprint, retryDelaySeconds, type RetryPolicy } from '@/modules/publishing/publication-policy';
import type { PublicationOptions, PublicationOverride, PublicationStatusProjection } from '@/modules/publishing/models';
import type { ArticleVariantContext } from '@/modules/publishing/ports';
import { excerptForDescription, suggestPublicationVariants } from '@/modules/publishing/variant-suggester';
import { CascadeIncompleteError, unresolvedCascadeAncestors } from '@/modules/site/site-cascade';
import type { IdentifierGenerator } from '@/core/system/ports';
import type { RedisCoordinationPort } from '@/integrations/redis/ports';
import { PublishingAccessDeniedError, PublishingConflictError, PublishingSubscriptionInactiveError, type ArticleSiteRobotsResult, type PublicationJobSummary, type PublishingRepository } from '@/modules/publishing/ports';
import { createNonDisclosingDenial, createPublicError, type PublicErrorEnvelope } from '@/core/errors';
import type { Result } from '@/core/result';
import { publicationRequestSchema, publicationBulkRequestSchema, publicationSiteRobotsSchema, publicationStatusSchema, publicationSuggestSchema, publicationTargetSelectionSchema } from '@/modules/publishing/schemas';

interface ClockLike { now(): Date }

const PUBLICATION_JOB_SIZE = 100;

export class PublicationService {
  constructor(
    private readonly repository: PublishingRepository,
    private readonly queue: RedisCoordinationPort,
    private readonly identifiers: IdentifierGenerator,
    private readonly retryPolicy: RetryPolicy,
    private readonly clock: ClockLike = { now: () => new Date() },
  ) {}

  private async denied(actor: AuthorizedTenantActorContext, action: string): Promise<Result<never, PublicErrorEnvelope>> {
    try {
      await this.repository.recordDenial(actor, action, 'publishing_job', this.clock.now().toISOString());
    } catch {
      return { ok: false, error: createNonDisclosingDenial(actor.requestId) };
    }
    return { ok: false, error: createNonDisclosingDenial(actor.requestId) };
  }

  /**
   * Resolve the sites a publication writes an assignment row to.
   *
   * @param context - Article variant context carrying the org's site tree.
   * @param manualSiteIds - Sites the editor explicitly targeted.
   * @returns The requested portals, deduplicated and ordered.
   *
   * @remarks Only the requested portals get a row, and the hierarchy is still
   * checked so an incomplete `apex -> region -> city` chain is refused before
   * anything is written. Nothing is derived: a region and an apex list their
   * descendant cities' articles by walking the tree at read time, so copying the
   * row upward bought nothing and multiplied storage and edge purges by the
   * portal count. An apex publication stays apex-only, because a city portal
   * lists its own rows and nothing else.
   */
  private expandRequest(
    context: ArticleVariantContext,
    manualSiteIds: readonly string[],
  ): readonly string[] {
    const scope = context.variants.map((variant) => ({
      id: variant.siteId,
      siteLevel: variant.siteLevel,
      parentSiteId: variant.parentSiteId,
      status: 'active' as const,
    }));
    const known = new Set(scope.map((site) => site.id));
    const unresolved = unresolvedCascadeAncestors(scope, manualSiteIds.filter((siteId) => known.has(siteId)));
    if (unresolved.length > 0) throw new CascadeIncompleteError(unresolved);
    return [...new Set(manualSiteIds)].sort();
  }

  private incompleteHierarchyError(actor: AuthorizedTenantActorContext, error: CascadeIncompleteError) {
    const missing = [...new Set(error.unresolved.map((entry) => entry.missing))].join(' dan ');
    return createPublicError('INVALID_INPUT', `Hierarki portal tidak lengkap: ${missing} belum tersedia. Lengkapi rantai apex -> region -> city di pengaturan situs sebelum menerbitkan.`, actor.requestId);
  }

  private resolvePublishAt(context: ArticleVariantContext, requested: string | null | undefined, now: Date): Date | null {
    const candidate = requested === undefined
      ? context.status === 'scheduled' ? context.scheduledAt : null
      : requested;
    if (candidate === null) return now;
    if (candidate === undefined) return null;
    const publishAt = new Date(candidate);
    if (Number.isNaN(publishAt.getTime())) return null;
    return publishAt;
  }

  private invalidPublishTime(actor: AuthorizedTenantActorContext): Result<never, PublicErrorEnvelope> {
    return { ok: false, error: createPublicError('INVALID_INPUT', 'Waktu publish tidak valid.', actor.requestId) };
  }

  private async enqueueBatches(
    actor: AuthorizedTenantActorContext,
    articleId: string,
    siteIds: readonly string[],
    idempotencyKey: string,
    options: PublicationOptions,
    overrides: Readonly<Record<string, PublicationOverride>>,
    publishAt: Date,
    publishAtKey: string | null,
    now: Date,
  ): Promise<Result<readonly PublicationStatusProjection[], PublicErrorEnvelope>> {
    const results: PublicationStatusProjection[] = [];
    const batchCount = Math.ceil(siteIds.length / PUBLICATION_JOB_SIZE);
    for (let index = 0; index < batchCount; index += 1) {
      const batch = siteIds.slice(index * PUBLICATION_JOB_SIZE, (index + 1) * PUBLICATION_JOB_SIZE);
      const batchOverrides = Object.fromEntries(batch.flatMap((siteId) => overrides[siteId] === undefined ? [] : [[siteId, overrides[siteId]]]));
      const fingerprint = await publicationFingerprint({ organizationId: actor.organizationId, articleId, siteIds: batch, options, publishAt: publishAtKey, overrides: batchOverrides });
      const accepted = await this.repository.acceptPublication(actor, {
        jobId: this.identifiers.create(), organizationId: actor.organizationId, articleId, siteIds: batch,
        idempotencyKey: batchCount === 1 ? idempotencyKey : `${idempotencyKey}:${index}`,
        fingerprint, fingerprintVersion: FINGERPRINT_VERSION, options, publishAt: publishAt.toISOString(),
        overrides: batchOverrides, now: now.toISOString(),
        targetIds: batch.map(() => this.identifiers.create()), articleSiteIds: batch.map(() => this.identifiers.create()),
      });
      if (accepted.kind === 'conflict') return { ok: false, error: createPublicError('IDEMPOTENCY_CONFLICT', 'The idempotency key is already associated with another request.', actor.requestId) };
      if (accepted.kind === 'created') await this.scheduleDispatch(actor, accepted.job.id, publishAt, now);
      const status = await this.repository.getPublication(actor, accepted.job.id);
      if (status === null) return this.denied(actor, 'publication.request.denied');
      results.push(status);
    }
    return { ok: true, value: results };
  }

  async request(actor: AuthorizedTenantActorContext, raw: unknown): Promise<Result<PublicationStatusProjection | readonly PublicationStatusProjection[], PublicErrorEnvelope>> {
    const parsed = publicationRequestSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Please correct the publication request.', actor.requestId) };
    const manualSiteIds = [...new Set(parsed.data.siteIds)].sort();
    const overrides = parsed.data.overrides;
    for (const siteId of Object.keys(overrides)) {
      if (!manualSiteIds.includes(siteId)) return { ok: false, error: createPublicError('INVALID_INPUT', 'Overrides must reference a requested site.', actor.requestId) };
    }
    const now = this.clock.now();
    try {
      const variantContext = await this.repository.getArticleVariantContext(actor, parsed.data.articleId);
      if (variantContext === null) return this.denied(actor, 'publication.request.denied');
      const connector = manualSiteIds.find((siteId) => variantContext.variants.find((variant) => variant.siteId === siteId)?.siteLevel === 'region');
      if (connector !== undefined) return { ok: false, error: createPublicError('INVALID_INPUT', 'Portal region hanya penghubung: ia menampilkan artikel dari kota-kotanya. Terbitkan ke portal kota di bawahnya, atau ke apex bila berita memang hanya untuk apex.', actor.requestId) };
      const publishAt = this.resolvePublishAt(variantContext, parsed.data.publishAt, now);
      if (publishAt === null) return this.invalidPublishTime(actor);
      const publishAtKey = publishAt.getTime() === now.getTime() ? null : publishAt.toISOString();
      const expanded = this.expandRequest(variantContext, manualSiteIds);
      const enqueued = await this.enqueueBatches(actor, parsed.data.articleId, expanded, parsed.data.idempotencyKey, parsed.data.options, overrides, publishAt, publishAtKey, now);
      if (!enqueued.ok) return enqueued;
      return { ok: true, value: enqueued.value.length === 1 ? enqueued.value[0]! : enqueued.value };
    } catch (error) {
      if (error instanceof PublishingAccessDeniedError) return this.denied(actor, 'publication.request.denied');
      if (error instanceof CascadeIncompleteError) return { ok: false, error: this.incompleteHierarchyError(actor, error) };
      if (error instanceof PublishingSubscriptionInactiveError) return { ok: false, error: createPublicError('FORBIDDEN', 'Langganan tidak aktif. Hubungi administrator agar dapat meminta penerbitan.', actor.requestId) };
      return { ok: false, error: createPublicError('DEPENDENCY_UNAVAILABLE', 'The publication request could not be completed.', actor.requestId) };
    }
  }

  /**
   * Compose per-portal title/description overrides without writing a job.
   *
   * @param actor - Authorized tenant context.
   * @param raw - Unvalidated `{ articleId, siteIds }`.
   * @returns Map of siteId to overrides carrying the canonical copy unchanged.
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
      const canonicalDescription = excerptForDescription(context.body);
      const overrides = suggestPublicationVariants({ 
        title: context.title, 
        description: canonicalDescription, 
        sites: siteIds.map((siteId) => ({ siteId, label: '' })), 
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

  async listJobs(actor: AuthorizedTenantActorContext): Promise<Result<readonly PublicationJobSummary[], PublicErrorEnvelope>> {
    try {
      return { ok: true, value: await this.repository.listPublications(actor, 5) };
    } catch (error) {
      return error instanceof PublishingAccessDeniedError ? this.denied(actor, 'publication.list.denied')
        : { ok: false, error: createPublicError('DEPENDENCY_UNAVAILABLE', 'The publication list is temporarily unavailable.', actor.requestId) };
    }
  }

  private async scheduleDispatch(actor: AuthorizedTenantActorContext, jobId: string, dispatchAt: Date, now: Date): Promise<void> {
    try {
      await this.queue.schedule(`${actor.organizationId}:${jobId}`, dispatchAt);
      await this.repository.recordDispatchScheduled(actor.organizationId, jobId, now.toISOString());
    } catch {
      const nextDelay = retryDelaySeconds(this.retryPolicy, 1);
      const retryAt = nextDelay === null ? now : new Date(Math.max(now.getTime() + nextDelay * 1_000, dispatchAt.getTime()));
      await this.repository.recordDispatchFailure(actor.organizationId, jobId, nextDelay !== null, retryAt.toISOString(), now.toISOString());
    }
  }

  async retry(actor: AuthorizedTenantActorContext, raw: unknown): Promise<Result<PublicationStatusProjection, PublicErrorEnvelope>> {
    const parsed = publicationTargetSelectionSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Please correct the retry request.', actor.requestId) };
    const now = this.clock.now();
    try {
      await this.repository.retryTargets(actor, { jobId: parsed.data.jobId, targetIds: parsed.data.targetIds, now: now.toISOString() });
      await this.scheduleDispatch(actor, parsed.data.jobId, now, now);
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

  async setSiteRobots(actor: AuthorizedTenantActorContext, raw: unknown): Promise<Result<ArticleSiteRobotsResult, PublicErrorEnvelope>> {
    const parsed = publicationSiteRobotsSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Please correct the robots request.', actor.requestId) };
    try {
      const result = await this.repository.setArticleSiteRobots(actor, {
        articleSiteId: parsed.data.articleSiteId,
        directive: parsed.data.directive === 'noindex' ? 'noindex,nofollow' : 'index,follow',
        now: this.clock.now().toISOString(),
      });
      return { ok: true, value: result };
    } catch (error) {
      if (error instanceof PublishingAccessDeniedError) return this.denied(actor, 'publication.setSiteRobots.denied');
      if (error instanceof PublishingSubscriptionInactiveError) return { ok: false, error: createPublicError('FORBIDDEN', 'Langganan tidak aktif. Hubungi administrator agar dapat mengatur indeksasi.', actor.requestId) };
      return { ok: false, error: createPublicError('DEPENDENCY_UNAVAILABLE', 'The robots request could not be completed.', actor.requestId) };
    }
  }

  async requestBulk(actor: AuthorizedTenantActorContext, raw: unknown): Promise<Result<readonly PublicationStatusProjection[], PublicErrorEnvelope>> {
    const parsed = publicationBulkRequestSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Please correct the bulk publication request.', actor.requestId) };
    const manualSiteIds = [...new Set(parsed.data.siteIds)].sort();
    const overrides = parsed.data.overrides;
    for (const siteId of Object.keys(overrides)) {
      if (!manualSiteIds.includes(siteId)) return { ok: false, error: createPublicError('INVALID_INPUT', 'Overrides must reference a requested site.', actor.requestId) };
    }
    const articleIds = [...new Set(parsed.data.articleIds)].sort();
    const now = this.clock.now();
    const results: PublicationStatusProjection[] = [];
    try {
      for (const articleId of articleIds) {
        const variantContext = await this.repository.getArticleVariantContext(actor, articleId);
        if (variantContext === null) return this.denied(actor, 'publication.request.denied');
        const publishAt = this.resolvePublishAt(variantContext, parsed.data.publishAt, now);
        if (publishAt === null) return this.invalidPublishTime(actor);
        const publishAtKey = publishAt.getTime() === now.getTime() ? null : publishAt.toISOString();
        const expanded = this.expandRequest(variantContext, manualSiteIds);
        const enqueued = await this.enqueueBatches(actor, articleId, expanded, `${parsed.data.idempotencyKey}:${articleId}`, parsed.data.options, overrides, publishAt, publishAtKey, now);
        if (!enqueued.ok) return enqueued;
        results.push(...enqueued.value);
      }
      return { ok: true, value: results };
    } catch (error) {
      if (error instanceof PublishingAccessDeniedError) return this.denied(actor, 'publication.request.denied');
      if (error instanceof PublishingSubscriptionInactiveError) return { ok: false, error: createPublicError('FORBIDDEN', 'Langganan tidak aktif. Hubungi administrator agar dapat meminta penerbitan.', actor.requestId) };
      return { ok: false, error: createPublicError('DEPENDENCY_UNAVAILABLE', 'The bulk publication request could not be completed.', actor.requestId) };
    }
  }
}
