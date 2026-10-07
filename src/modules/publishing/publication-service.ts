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