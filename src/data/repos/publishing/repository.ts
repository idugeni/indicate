import { and, desc, eq, gt, inArray, isNull, lte, or, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import type { AuthorizedTenantActorContext, HostnameContext } from '@/core/operation-context';
import { canPublicAccessMedia } from '@/modules/publishing/media-authorization';
import type {
  ClaimedCleanupTask, MediaAssetRecord, PublicationJobRecord,
  PublicationStatusProjection, PublishingTenantSnapshot, TargetTransitionCommit,
  TransitionReceiptRecord, WorkerClaim,
} from '@/modules/publishing/models';
import { aggregateJobState, isAllowedTargetTransition, projectPublicationResult, seedInitialViewCount } from '@/modules/publishing/publication-policy';
import { excerptForDescription } from '@/modules/publishing/variant-suggester';
import { PUBLISHING_PERMISSIONS } from '@/modules/publishing/permissions';
import {
  PublishingAccessDeniedError, PublishingConflictError, PublishingSubscriptionInactiveError, type AcceptPublicationInput, type AcceptPublicationResult,
  type ActivateMediaInput, type ArticleVariantContext, type JobNotificationContext, type PublicationTargetSelection, type ReserveMediaCandidate, type ReservationCandidateResult, type PublishingRepository,
  type TargetTransitionInput,
} from '@/modules/publishing/ports';
import { redact } from '@/core/security/redaction';
import {
  articleSites, articles, auditLogs, categories, domains, invalidationTasks, media, mediaKeyReservations, memberships, objectCleanupTasks,
  organizations, permissions, publicationTransitionReceipts, publishingJobs, publishingJobTargets, regions, rolePermissions,
  roles, sites, siteSettings,
} from '@/data/schema';
import type * as schema from '@/data/schema';
import { completeInvalidationValues } from '@/data/repos/shared/delivery-invalidation-values';
import {
  isUniqueViolation,
  mapCleanup,
  mapJob,
  mapMedia,
  mapReceipt,
  mapReservation,
  mapTarget,
  getOwnerColumns,
  mapOwnerFromRow,
  type JobRow,
  iso,
  optionalIso,
} from '@/data/repos/shared/publishing-mappers';
type Database = PostgresJsDatabase<typeof schema>;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
const SYSTEM_REQUEST = 'publishing-reconciler';

export class DrizzlePublishingRepository implements PublishingRepository {
  constructor(private readonly database: Database) {}

  private async context(transaction: Transaction, organizationId: string, actorId: string, requestId: string, verifiedAuthUserId?: string): Promise<void> {
    await transaction.execute(sql`SELECT indicate_private.set_tenant_context(${organizationId}::uuid, ${actorId}, ${requestId})`);
    await transaction.execute(sql`SELECT indicate_private.set_region_context(NULL::uuid)`);
    if (verifiedAuthUserId !== undefined) await transaction.execute(sql`SELECT indicate_private.set_verified_user_context(${verifiedAuthUserId}::uuid)`);
  }
  private async actorContext(transaction: Transaction, actor: AuthorizedTenantActorContext): Promise<void> { await this.context(transaction, actor.organizationId, actor.actorId, actor.requestId, actor.actorType === 'user' ? actor.verifiedAuthUserId : undefined); await transaction.execute(sql`SELECT indicate_private.set_region_context(${actor.regionScopeId ?? null}::uuid)`); }
  private async authorize(transaction: Transaction, actor: AuthorizedTenantActorContext, permission: string): Promise<void> {
    if (actor.actorType !== 'user') { if (!actor.permissionSet.has(permission)) throw new PublishingAccessDeniedError(); return; }
    const rows = await transaction.select({ id: memberships.userId }).from(memberships)
      .innerJoin(roles, and(eq(roles.organizationId, memberships.organizationId), eq(roles.id, memberships.roleId)))
      .innerJoin(rolePermissions, and(eq(rolePermissions.organizationId, roles.organizationId), eq(rolePermissions.roleId, roles.id)))
      .innerJoin(permissions, and(eq(permissions.id, rolePermissions.permissionId), eq(permissions.organizationId, actor.organizationId), eq(permissions.scope, 'organization')))
      .where(and(eq(memberships.organizationId, actor.organizationId), eq(memberships.userId, actor.actorId), eq(memberships.status, 'active'), eq(roles.active, true), eq(permissions.name, permission))).limit(1);
    if (rows.length !== 1) throw new PublishingAccessDeniedError();
  }
  private async enforceWritableSubscription(transaction: Transaction, actor: AuthorizedTenantActorContext): Promise<void> {
    if (actor.actorType !== 'user') return;
    const rows = await transaction.execute<{ state: string }>(sql`SELECT indicate_private.subscription_access_state(${actor.organizationId}::uuid) AS state`);
    const state = rows[0]?.state;
    if (state === 'platform' || state === 'active') return;
    throw new PublishingSubscriptionInactiveError(state ?? 'none');
  }
  private async audit(
    transaction: Transaction,
    actor: Pick<AuthorizedTenantActorContext, 'organizationId' | 'actorType' | 'actorId' | 'entryPoint' | 'requestId'>,
    action: string,
    targetType: string,
    targetId: string | null,
    context: object,
    now: Date,
    outcome: 'succeeded' | 'denied' | 'failed' = 'succeeded',
  ): Promise<void> {
    await transaction.insert(auditLogs).values({ organizationId: actor.organizationId, id: crypto.randomUUID(), actorType: actor.actorType, actorId: actor.actorId, entryPoint: actor.entryPoint, action, targetType, targetId, outcome, changedFields: Object.keys(context).sort(), after: redact(context) as Record<string, unknown>, requestId: actor.requestId, occurredAt: now });
  }
  private system(organizationId: string, jobId: string, entryPoint: 'worker' | 'reconciler' = 'worker') { return { organizationId, actorType: 'system' as const, actorId: jobId, entryPoint, requestId: SYSTEM_REQUEST }; }
  private async insertReceipt(transaction: Transaction, job: JobRow, targetId: string | null, fromState: JobRow['state'], toState: JobRow['state'], now: Date, acknowledged: boolean) {
    const rows = await transaction.insert(publicationTransitionReceipts).values({ organizationId: job.organizationId, id: crypto.randomUUID(), transitionId: crypto.randomUUID(), jobId: job.id, targetId, fromState, toState, fencingToken: job.fencingToken, acknowledgedAt: acknowledged ? now : null, createdAt: now }).returning();
    return rows[0]!;
  }
  private async enqueuePublicInvalidation(transaction: Transaction, organizationId: string, siteId: string, reason: string, now: Date, articleId?: string, mediaId?: string): Promise<void> {
    const siteRows = await transaction.select({ hostname: sites.normalizedHostname }).from(sites).where(and(eq(sites.organizationId, organizationId), eq(sites.id, siteId))).limit(1);
    const site = siteRows[0]; if (site === undefined) return;
    let articleSlugs: string[] = []; let categorySlugs: string[] = []; const extraMediaIds: string[] = [];
    if (articleId !== undefined) {
      const rows = await transaction.select({ articleSlug: articles.slug, categorySlug: categories.slug, leadMediaId: articles.leadMediaId }).from(articles).leftJoin(categories, and(eq(categories.organizationId, articles.organizationId), eq(categories.id, articles.categoryId))).where(and(eq(articles.organizationId, organizationId), eq(articles.id, articleId))).limit(1);
      if (rows[0] !== undefined) {
        articleSlugs = [rows[0].articleSlug]; if (rows[0].categorySlug !== null) categorySlugs = [rows[0].categorySlug];
        if (rows[0].leadMediaId !== null) extraMediaIds.push(rows[0].leadMediaId);
      }
      const relation = (await transaction.select({ customImageMediaId: articleSites.customImageMediaId }).from(articleSites).where(and(eq(articleSites.organizationId, organizationId), eq(articleSites.articleId, articleId), eq(articleSites.siteId, siteId))).limit(1))[0];
      if (relation?.customImageMediaId != null) extraMediaIds.push(relation.customImageMediaId);
    }
    const siblings = await transaction.select({ hostname: sites.normalizedHostname }).from(sites).where(and(eq(sites.organizationId, organizationId), sql`${sites.normalizedHostname} LIKE ${`%.${site.hostname}`}`));
    await transaction.insert(invalidationTasks).values(completeInvalidationValues({ organizationId, siteId, currentHostname: site.hostname, siblingHostnames: siblings.map((row) => row.hostname), reason, articleSlugs, categorySlugs, mediaIds: [...(mediaId === undefined ? [] : [mediaId]), ...extraMediaIds], now }));
  }

  async recordDenial(actor: AuthorizedTenantActorContext, action: string, targetType: string, now: string): Promise<void> {
    await this.database.transaction(async (transaction) => {
      await this.actorContext(transaction, actor);
      await this.audit(transaction, actor, action, targetType, null, { reason: 'authorization_denied' }, new Date(now), 'denied');
    });
  }

  async reserveMediaCandidate(actor: AuthorizedTenantActorContext, input: ReserveMediaCandidate): Promise<ReservationCandidateResult> {
    try {
      return await this.database.transaction(async (transaction) => {
        await this.actorContext(transaction, actor); await this.authorize(transaction, actor, PUBLISHING_PERMISSIONS.mediaManage); await this.enforceWritableSubscription(transaction, actor);
        if (input.owner.kind === 'organization' && actor.regionScopeId !== undefined && actor.regionScopeId !== null) throw new PublishingAccessDeniedError();
        if (input.owner.kind === 'article') {
          const rows = await transaction.select({ id: articles.id, regionId: articles.regionId }).from(articles).where(and(eq(articles.organizationId, actor.organizationId), eq(articles.id, input.owner.articleId), inArray(articles.status, ['draft', 'active']))).limit(1);
          if (rows.length !== 1) throw new PublishingAccessDeniedError();
          if (actor.regionScopeId !== undefined && actor.regionScopeId !== null && rows[0]!.regionId !== actor.regionScopeId) throw new PublishingAccessDeniedError();
        } else if (input.owner.kind === 'site') {
          const rows = await transaction.select({ id: sites.id, regionId: sites.regionId }).from(sites).where(and(eq(sites.organizationId, actor.organizationId), eq(sites.id, input.owner.siteId), eq(sites.status, 'active'))).limit(1);
          if (rows.length !== 1) throw new PublishingAccessDeniedError();
          const regionId = rows[0]!.regionId;
          if (actor.regionScopeId !== undefined && actor.regionScopeId !== null && regionId !== null && regionId !== actor.regionScopeId) throw new PublishingAccessDeniedError();
        }
        const rows = await transaction.insert(mediaKeyReservations).values({ organizationId: actor.organizationId, id: input.reservationId, objectKey: input.objectKey, purpose: input.purpose, ...getOwnerColumns(input.owner), expectedMediaType: input.expectedMediaType, expectedSizeBytes: input.expectedSizeBytes, expectedChecksum: input.expectedChecksum, status: 'reserved', expiresAt: new Date(input.expiresAt), createdAt: new Date(input.now), updatedAt: new Date(input.now) }).onConflictDoNothing({ target: mediaKeyReservations.objectKey }).returning();
        const row = rows[0]; if (row === undefined) return { kind: 'occupied' as const };
        await this.audit(transaction, actor, 'media.upload.reserve', 'media_key_reservation', row.id, { objectKey: row.objectKey, purpose: row.purpose }, new Date(input.now));
        return { kind: 'reserved' as const, reservation: mapReservation(row) };
      });
    } catch (error) { if (isUniqueViolation(error)) return { kind: 'occupied' }; throw error; }
  }
  async markReservationOccupied(actor: AuthorizedTenantActorContext, reservationId: string, now: string): Promise<void> {
    await this.database.transaction(async (transaction) => {
      await this.actorContext(transaction, actor); await this.authorize(transaction, actor, PUBLISHING_PERMISSIONS.mediaManage); await this.enforceWritableSubscription(transaction, actor);
      const rows = await transaction.update(mediaKeyReservations).set({ status: 'occupied', updatedAt: new Date(now) }).where(and(eq(mediaKeyReservations.organizationId, actor.organizationId), eq(mediaKeyReservations.id, reservationId), eq(mediaKeyReservations.status, 'reserved'))).returning({ id: mediaKeyReservations.id, organizationAsset: mediaKeyReservations.organizationAsset });
      if (rows.length !== 1) throw new PublishingAccessDeniedError();
      if (rows[0]!.organizationAsset && actor.regionScopeId !== undefined && actor.regionScopeId !== null) throw new PublishingAccessDeniedError();
    });
  }
  async readReservation(actor: AuthorizedTenantActorContext, reservationId: string) {
    return this.database.transaction(async (transaction) => {
      await this.actorContext(transaction, actor); await this.authorize(transaction, actor, PUBLISHING_PERMISSIONS.mediaManage);
      const rows = await transaction.select().from(mediaKeyReservations).where(and(eq(mediaKeyReservations.organizationId, actor.organizationId), eq(mediaKeyReservations.id, reservationId))).limit(1);
      return rows[0] === undefined ? null : mapReservation(rows[0]);
    });
  }
  async activateMedia(actor: AuthorizedTenantActorContext, input: ActivateMediaInput): Promise<MediaAssetRecord> {
    return this.database.transaction(async (transaction) => {
      await this.actorContext(transaction, actor); await this.authorize(transaction, actor, PUBLISHING_PERMISSIONS.mediaManage); await this.enforceWritableSubscription(transaction, actor);
      const reservations = await transaction.select().from(mediaKeyReservations).where(and(eq(mediaKeyReservations.organizationId, actor.organizationId), eq(mediaKeyReservations.id, input.reservationId), eq(mediaKeyReservations.status, 'reserved'), gt(mediaKeyReservations.expiresAt, sql`clock_timestamp()`))).limit(1).for('update');
      const reservation = reservations[0]; if (reservation === undefined) throw new PublishingAccessDeniedError();
      if (reservation.organizationAsset && actor.regionScopeId !== undefined && actor.regionScopeId !== null) throw new PublishingAccessDeniedError();
      const rows = await transaction.insert(media).values({ organizationId: actor.organizationId, id: input.mediaId, objectKey: reservation.objectKey, purpose: reservation.purpose, mediaType: input.mediaType, sizeBytes: input.sizeBytes, checksum: input.checksum, thumbObjectKey: input.thumbObjectKey, widthPx: input.widthPx, heightPx: input.heightPx, ...getOwnerColumns(mapOwnerFromRow(reservation)), state: 'active', createdAt: new Date(input.now), updatedAt: new Date(input.now) }).returning();
      await transaction.update(mediaKeyReservations).set({ status: 'used', updatedAt: new Date(input.now) }).where(and(eq(mediaKeyReservations.organizationId, actor.organizationId), eq(mediaKeyReservations.id, reservation.id)));
      const affected = reservation.siteId !== null ? [reservation.siteId] : reservation.articleId !== null ? (await transaction.select({ siteId: articleSites.siteId }).from(articleSites).where(and(eq(articleSites.organizationId, actor.organizationId), eq(articleSites.articleId, reservation.articleId), eq(articleSites.active, true)))).map(({ siteId }) => siteId) : [];
      for (const siteId of new Set(affected)) await this.enqueuePublicInvalidation(transaction, actor.organizationId, siteId, 'media.activated', new Date(input.now), reservation.articleId ?? undefined, input.mediaId);
      await this.audit(transaction, actor, 'media.activate', 'media', input.mediaId, { objectKey: reservation.objectKey, purpose: reservation.purpose }, new Date(input.now));
      return mapMedia(rows[0]!);
    });
  }
  async rejectMedia(actor: AuthorizedTenantActorContext, reservationId: string, reason: string, now: string): Promise<void> {
    await this.database.transaction(async (transaction) => {
      await this.actorContext(transaction, actor); await this.authorize(transaction, actor, PUBLISHING_PERMISSIONS.mediaManage); await this.enforceWritableSubscription(transaction, actor);
      const rows = await transaction.update(mediaKeyReservations).set({ status: 'occupied', updatedAt: new Date(now) }).where(and(eq(mediaKeyReservations.organizationId, actor.organizationId), eq(mediaKeyReservations.id, reservationId), eq(mediaKeyReservations.status, 'reserved'))).returning({ id: mediaKeyReservations.id, objectKey: mediaKeyReservations.objectKey, organizationAsset: mediaKeyReservations.organizationAsset });
      const row = rows[0]; if (row === undefined) throw new PublishingAccessDeniedError();
      if (row.organizationAsset && actor.regionScopeId !== undefined && actor.regionScopeId !== null) throw new PublishingAccessDeniedError();
      await transaction.insert(objectCleanupTasks).values({ organizationId: actor.organizationId, id: crypto.randomUUID(), objectKey: row.objectKey, reason, status: 'pending', attempts: 0, nextAttemptAt: new Date(now) });
      await this.audit(transaction, actor, 'media.reject', 'media_key_reservation', row.id, { reason }, new Date(now));
    });
  }
  async archiveMedia(actor: AuthorizedTenantActorContext, mediaId: string, expectedVersion: number, now: string): Promise<MediaAssetRecord> {
    return this.database.transaction(async (transaction) => {
      await this.actorContext(transaction, actor); await this.authorize(transaction, actor, PUBLISHING_PERMISSIONS.mediaManage); await this.enforceWritableSubscription(transaction, actor);
      const existingRows = await transaction.select().from(media).where(and(eq(media.organizationId, actor.organizationId), eq(media.id, mediaId))).limit(1).for('update');
      const existing = existingRows[0]; if (existing === undefined || existing.state !== 'active') throw new PublishingAccessDeniedError();
      if (existing.organizationAsset && actor.regionScopeId !== undefined && actor.regionScopeId !== null) throw new PublishingAccessDeniedError();
      if (existing.version !== expectedVersion) throw new PublishingConflictError();
      const rows = await transaction.update(media).set({ state: 'archived', version: existing.version + 1, updatedAt: new Date(now) }).where(and(eq(media.organizationId, actor.organizationId), eq(media.id, mediaId), eq(media.version, existing.version), eq(media.state, 'active'))).returning();
      if (rows.length !== 1) throw new PublishingConflictError();
      const settingsRefs = await transaction.select({ siteId: siteSettings.siteId }).from(siteSettings).where(and(eq(siteSettings.organizationId, actor.organizationId), or(eq(siteSettings.logoMediaId, mediaId), eq(siteSettings.faviconMediaId, mediaId), eq(siteSettings.defaultMediaId, mediaId))));
      const articleReference = existing.articleId === null
        ? eq(articles.leadMediaId, mediaId)
        : or(eq(articles.id, existing.articleId), eq(articles.leadMediaId, mediaId));
      const articleRefs = await transaction.select({ siteId: articleSites.siteId }).from(articleSites)
        .innerJoin(articles, and(eq(articles.organizationId, articleSites.organizationId), eq(articles.id, articleSites.articleId)))
        .where(and(eq(articleSites.organizationId, actor.organizationId), eq(articleSites.active, true), eq(articleSites.state, 'published'), eq(articles.status, 'active'), articleReference));
      for (const siteId of new Set([...settingsRefs, ...articleRefs].map(({ siteId }) => siteId))) await this.enqueuePublicInvalidation(transaction, actor.organizationId, siteId, 'media.archived', new Date(now), existing.articleId ?? undefined, mediaId);
      await this.audit(transaction, actor, 'media.archive', 'media', mediaId, { state: 'archived' }, new Date(now));
      return mapMedia(rows[0]!);
    });
  }
  async listMedia(actor: AuthorizedTenantActorContext) {
    return this.database.transaction(async (transaction) => {
      await this.actorContext(transaction, actor); await this.authorize(transaction, actor, PUBLISHING_PERMISSIONS.mediaRead);
      return (await transaction.select().from(media).where(eq(media.organizationId, actor.organizationId))).filter((row) => row.state !== 'reserved').map(mapMedia);
    });
  }
  async authorizeTenantMedia(actor: AuthorizedTenantActorContext, mediaId: string) {
    return this.database.transaction(async (transaction) => {
      await this.actorContext(transaction, actor); await this.authorize(transaction, actor, PUBLISHING_PERMISSIONS.mediaRead);
      const rows = await transaction.select().from(media).where(and(eq(media.organizationId, actor.organizationId), eq(media.id, mediaId), eq(media.state, 'active'))).limit(1);
      const row = rows[0]; if (row === undefined) return null;
      await this.audit(transaction, actor, 'media.access.authorize', 'media', mediaId, { scope: 'tenant' }, new Date());
      return mapMedia(row);
    });
  }
  async authorizePublicMedia(context: HostnameContext, mediaId: string, requestId: string) {
    return this.database.transaction(async (transaction) => {
      await this.context(transaction, context.organizationId, `public:${context.siteId}`, requestId);
      const mediaRows = await transaction.select().from(media).where(and(eq(media.organizationId, context.organizationId), eq(media.id, mediaId), eq(media.state, 'active'))).limit(1);
      const siteRows = await transaction.select({ site: sites }).from(sites)
        .innerJoin(domains, and(eq(domains.organizationId, sites.organizationId), eq(domains.id, sites.domainId), eq(domains.status, 'active')))
        .leftJoin(regions, and(eq(regions.organizationId, sites.organizationId), eq(regions.id, sites.regionId)))
        .where(and(eq(sites.organizationId, context.organizationId), eq(sites.id, context.siteId), eq(sites.normalizedHostname, context.normalizedHostname), eq(sites.status, 'active'), eq(sites.activationState, 'active'), eq(sites.routingVersion, context.routingVersion), or(sql`${sites.regionId} IS NULL`, eq(regions.status, 'active')))).limit(1);
      if (mediaRows[0] === undefined || siteRows[0] === undefined) return null;
      const settings = await transaction.select().from(siteSettings).where(and(eq(siteSettings.organizationId, context.organizationId), eq(siteSettings.siteId, context.siteId))).limit(1);
      const ownMediaIds = settings[0] === undefined ? [] : [settings[0].logoMediaId, settings[0].faviconMediaId, settings[0].defaultMediaId].filter((value): value is string => value !== null);
      let inheritedMediaIds: string[] = [];
      if (context.regionId !== null) {
        const parentRows = await transaction.select({ logoMediaId: siteSettings.logoMediaId, faviconMediaId: siteSettings.faviconMediaId, defaultMediaId: siteSettings.defaultMediaId })
          .from(sites)
          .innerJoin(siteSettings, and(eq(siteSettings.organizationId, sites.organizationId), eq(siteSettings.siteId, sites.id)))
          .where(and(eq(sites.organizationId, context.organizationId), eq(sites.domainId, context.domainId), sql`${sites.regionId} IS NULL`, eq(sites.status, 'active'), eq(sites.activationState, 'active'))).limit(1);
        const parent = parentRows[0];
        if (parent !== undefined) inheritedMediaIds = [parent.logoMediaId, parent.faviconMediaId, parent.defaultMediaId].filter((value): value is string => value !== null);
      }
      const asset = mapMedia(mediaRows[0]);
      const site = { id: siteRows[0].site.id, organizationId: context.organizationId, active: true, normalizedHostname: siteRows[0].site.normalizedHostname, settingsMediaIds: [...new Set([...ownMediaIds, ...inheritedMediaIds])] };
      const articleRefs = asset.owner.kind !== 'article' ? [] : (await transaction.select({ id: articles.id, status: articles.status }).from(articles).where(and(eq(articles.organizationId, context.organizationId), eq(articles.id, asset.owner.articleId))).limit(1))
        .map((row) => ({ id: row.id, organizationId: context.organizationId, active: row.status === 'active', leadMediaId: null, title: '', slug: '' }));
      const refs = asset.owner.kind !== 'article' ? [] : (await transaction.select({ id: articleSites.id, organizationId: articleSites.organizationId, articleId: articleSites.articleId, siteId: articleSites.siteId, active: articleSites.active, state: articleSites.state }).from(articleSites).where(and(eq(articleSites.organizationId, context.organizationId), eq(articleSites.siteId, context.siteId), eq(articleSites.articleId, asset.owner.articleId), eq(articleSites.active, true))).limit(1))
        .map((row) => ({ id: row.id, organizationId: row.organizationId, articleId: row.articleId, siteId: row.siteId, active: row.active, state: row.state, publishedUrl: null, publishedAt: null, version: 0 }));
      if (!canPublicAccessMedia({ context, media: asset, site, articles: articleRefs, articleSites: refs })) return null;
      return asset;
    });
  }

  private async rejectCrossSiteDuplicates(
    transaction: Transaction,
    organizationId: string,
    articleId: string,
    canonicalTitle: string,
    canonicalDescription: string,
    siteIds: readonly string[],
    overrides: Readonly<Record<string, { readonly title?: string | undefined; readonly description?: string | undefined }>>,
  ): Promise<void> {
    const rows = await transaction.select({
      siteId: articleSites.siteId, customTitle: articleSites.customTitle, customDescription: articleSites.customDescription,
      active: articleSites.active, state: articleSites.state,
    }).from(articleSites).where(and(eq(articleSites.organizationId, organizationId), eq(articleSites.articleId, articleId)));
    const titles = new Map<string, number>();
    const descriptions = new Map<string, number>();
    const count = (bucket: Map<string, number>, value: string) => {
      const folded = value.trim().toLowerCase();
      if (folded.length > 0) bucket.set(folded, (bucket.get(folded) ?? 0) + 1);
    };
    const effective = new Map<string, { title: string; description: string }>();
    for (const row of rows) {
      if (!row.active || (row.state !== 'queued' && row.state !== 'processing' && row.state !== 'retrying' && row.state !== 'published')) continue;
      effective.set(row.siteId, { title: row.customTitle ?? canonicalTitle, description: row.customDescription ?? canonicalDescription });
    }
    for (const siteId of siteIds) {
      const prior = effective.get(siteId);
      effective.set(siteId, {
        title: overrides[siteId]?.title ?? prior?.title ?? canonicalTitle,
        description: overrides[siteId]?.description ?? prior?.description ?? canonicalDescription,
      });
    }
    for (const value of effective.values()) { count(titles, value.title); count(descriptions, value.description); }
    if ([...titles.values()].some((total) => total > 1) || [...descriptions.values()].some((total) => total > 1)) {
      throw new PublishingConflictError('duplicate_variant');
    }
  }

  async getArticleVariantContext(actor: AuthorizedTenantActorContext, articleId: string): Promise<ArticleVariantContext | null> {
    return this.database.transaction(async (transaction) => {
      await this.actorContext(transaction, actor); await this.authorize(transaction, actor, PUBLISHING_PERMISSIONS.publishingRequest);
      const articleRows = await transaction.select({ id: articles.id, title: articles.title, body: articles.body })
        .from(articles).where(and(eq(articles.organizationId, actor.organizationId), eq(articles.id, articleId))).limit(1);
      const article = articleRows[0];
      if (article === undefined) return null;
      const siteRows = await transaction.select({ id: sites.id, hostname: sites.normalizedHostname })
        .from(sites).where(and(eq(sites.organizationId, actor.organizationId), eq(sites.status, 'active')));
      const variantRows = await transaction.select({
        siteId: articleSites.siteId, customTitle: articleSites.customTitle, customDescription: articleSites.customDescription,
        active: articleSites.active, state: articleSites.state,
      }).from(articleSites).where(and(eq(articleSites.organizationId, actor.organizationId), eq(articleSites.articleId, articleId)));
      const bySite = new Map(variantRows.map((row) => [row.siteId, row] as const));
      return {
        articleId: article.id,
        title: article.title,
        body: article.body,
        variants: siteRows.map((site) => ({
          siteId: site.id,
          normalizedHostname: site.hostname,
          customTitle: bySite.get(site.id)?.customTitle ?? null,
          customDescription: bySite.get(site.id)?.customDescription ?? null,
          active: bySite.get(site.id)?.active ?? false,
          state: bySite.get(site.id)?.state ?? 'unpublished',
        })),
      };
    });
  }

  async acceptPublication(actor: AuthorizedTenantActorContext, input: AcceptPublicationInput): Promise<AcceptPublicationResult> {
    try {
      return await this.database.transaction(async (transaction) => {
        await this.actorContext(transaction, actor); await this.authorize(transaction, actor, PUBLISHING_PERMISSIONS.publishingRequest); await this.enforceWritableSubscription(transaction, actor);
        const existingRows = await transaction.select().from(publishingJobs).where(and(eq(publishingJobs.organizationId, actor.organizationId), eq(publishingJobs.idempotencyKey, input.idempotencyKey))).limit(1).for('update');
        const existing = existingRows[0];
        if (existing !== undefined) return existing.fingerprint === input.fingerprint ? { kind: 'reused' as const, job: mapJob(existing) } : { kind: 'conflict' as const, existingJobId: existing.id };
        const articleRows = await transaction.select({ id: articles.id, title: articles.title, body: articles.body, regionId: articles.regionId }).from(articles).where(and(eq(articles.organizationId, actor.organizationId), eq(articles.id, input.articleId), inArray(articles.status, ['draft', 'active']))).limit(1);
        if (articleRows.length !== 1) throw new PublishingAccessDeniedError();
        const lock = actor.regionScopeId ?? null;
        if (lock !== null && articleRows[0]!.regionId !== lock) throw new PublishingAccessDeniedError();
        const distinctSites = [...new Set(input.siteIds)];
        const siteRows = await transaction.select({ id: sites.id, regionId: sites.regionId }).from(sites).where(and(eq(sites.organizationId, actor.organizationId), inArray(sites.id, distinctSites), eq(sites.status, 'active')));
        if (siteRows.length !== distinctSites.length) throw new PublishingAccessDeniedError();
        if (lock !== null && siteRows.some(({ regionId }) => regionId !== null && regionId !== lock)) throw new PublishingAccessDeniedError();
        await this.rejectCrossSiteDuplicates(transaction, actor.organizationId, input.articleId, articleRows[0]!.title, excerptForDescription(articleRows[0]!.body), distinctSites, input.overrides);
        const jobRows = await transaction.insert(publishingJobs).values({ organizationId: actor.organizationId, id: input.jobId, articleId: input.articleId, idempotencyKey: input.idempotencyKey, fingerprint: input.fingerprint, fingerprintVersion: input.fingerprintVersion, state: 'queued', options: input.options as Record<string, unknown>, dispatchStatus: 'pending', nextDispatchAt: new Date(input.now), createdAt: new Date(input.now), updatedAt: new Date(input.now) }).returning();
        for (let index = 0; index < distinctSites.length; index += 1) {
          const siteId = distinctSites[index]!;
          const override = input.overrides[siteId];
          const existingRelation = await transaction.select().from(articleSites).where(and(eq(articleSites.organizationId, actor.organizationId), eq(articleSites.articleId, input.articleId), eq(articleSites.siteId, siteId))).limit(1).for('update');
          let relation = existingRelation[0];
          if (relation === undefined) {
            relation = (await transaction.insert(articleSites).values({ organizationId: actor.organizationId, id: input.articleSiteIds[index]!, articleId: input.articleId, siteId, state: 'queued', stateOccurredAt: new Date(input.now), active: true, customTitle: override?.title ?? null, customDescription: override?.description ?? null, customImageMediaId: override?.imageMediaId ?? null, createdAt: new Date(input.now), updatedAt: new Date(input.now) }).returning())[0]!;
          } else if (relation.state !== 'published' && relation.state !== 'failed' && relation.state !== 'unpublished') {
            throw new PublishingConflictError();
          }
          await transaction.insert(publishingJobTargets).values({ organizationId: actor.organizationId, id: input.targetIds[index]!, jobId: input.jobId, articleSiteId: relation.id, state: 'queued', nextAttemptAt: new Date(input.now), publishedUrl: null, publishedAt: null, createdAt: new Date(input.now), updatedAt: new Date(input.now) });
          if (existingRelation[0] !== undefined) {
            const updated = await transaction.update(articleSites).set({ state: 'queued', stateOccurredAt: new Date(input.now), publishedUrl: null, publishedAt: null, sanitizedFailure: null, active: true, customTitle: override?.title ?? null, customDescription: override?.description ?? null, customImageMediaId: override?.imageMediaId ?? null, version: relation.version + 1, updatedAt: new Date(input.now) }).where(and(eq(articleSites.organizationId, actor.organizationId), eq(articleSites.id, relation.id), eq(articleSites.version, relation.version))).returning();
            if (updated.length !== 1) throw new PublishingConflictError();
          }
        }
        await this.audit(transaction, actor, 'publication.request', 'publishing_job', input.jobId, { articleId: input.articleId, siteIds: distinctSites }, new Date(input.now));
        return { kind: 'created' as const, job: mapJob(jobRows[0]!) };
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      return this.database.transaction(async (transaction) => {
        await this.actorContext(transaction, actor); await this.authorize(transaction, actor, PUBLISHING_PERMISSIONS.publishingRequest); await this.enforceWritableSubscription(transaction, actor);
        const rows = await transaction.select().from(publishingJobs).where(and(eq(publishingJobs.organizationId, actor.organizationId), eq(publishingJobs.idempotencyKey, input.idempotencyKey))).limit(1);
        const existing = rows[0]; if (existing === undefined) throw new PublishingConflictError();
        return existing.fingerprint === input.fingerprint ? { kind: 'reused' as const, job: mapJob(existing) } : { kind: 'conflict' as const, existingJobId: existing.id };
      });
    }
  }

  private async loadJobForMutation(transaction: Transaction, organizationId: string, jobId: string, now: Date) {
    const rows = await transaction.select().from(publishingJobs).where(and(eq(publishingJobs.organizationId, organizationId), eq(publishingJobs.id, jobId))).limit(1).for('update');
    const job = rows[0]; if (job === undefined) throw new PublishingAccessDeniedError();
    if (job.leaseOwner !== null && job.leaseExpiresAt !== null && job.leaseExpiresAt > now) throw new PublishingConflictError();
    return job;
  }

  /** Manual retry: failed targets back to retrying; the worker picks them up via the normal queue claim. */
  async retryTargets(actor: AuthorizedTenantActorContext, input: PublicationTargetSelection): Promise<PublicationStatusProjection> {
    return this.database.transaction(async (transaction) => {
      await this.actorContext(transaction, actor); await this.authorize(transaction, actor, PUBLISHING_PERMISSIONS.publishingRequest); await this.enforceWritableSubscription(transaction, actor);
      const now = new Date(input.now);
      const job = await this.loadJobForMutation(transaction, actor.organizationId, input.jobId, now);
      const selected = input.targetIds === undefined ? undefined : [...new Set(input.targetIds)];
      const rows = await transaction.select({ target: publishingJobTargets }).from(publishingJobTargets)
        .where(and(eq(publishingJobTargets.organizationId, actor.organizationId), eq(publishingJobTargets.jobId, input.jobId), selected === undefined ? undefined : inArray(publishingJobTargets.id, selected))).for('update');
      if (selected !== undefined) {
        const found = new Set(rows.map(({ target }) => target.id));
        if (selected.some((id) => !found.has(id))) throw new PublishingAccessDeniedError();
      }
      const failed = rows.map(({ target }) => target).filter((target) => target.state === 'failed');
      for (const target of failed) {
        await transaction.update(publishingJobTargets).set({ state: 'retrying', nextAttemptAt: now, finishedAt: null, updatedAt: now }).where(and(eq(publishingJobTargets.organizationId, actor.organizationId), eq(publishingJobTargets.id, target.id)));
      }
      if (failed.length > 0) {
        await transaction.update(publishingJobs).set({ state: 'retrying', dispatchStatus: 'pending', nextDispatchAt: now, finalizedAt: null, version: job.version + 1, updatedAt: now }).where(and(eq(publishingJobs.organizationId, actor.organizationId), eq(publishingJobs.id, job.id), eq(publishingJobs.version, job.version)));
      }
      const refreshed = await transaction.select().from(publishingJobs).where(and(eq(publishingJobs.organizationId, actor.organizationId), eq(publishingJobs.id, job.id))).limit(1);
      await this.audit(transaction, actor, 'publication.retry', 'publishing_job', job.id, { targetIds: failed.map(({ id }) => id) }, now);
      return this.statusTx(transaction, refreshed[0]!);
    });
  }

  /** Withdraw published targets; delivery drops them on the next read and caches are purged. */
  async unpublishTargets(actor: AuthorizedTenantActorContext, input: PublicationTargetSelection): Promise<PublicationStatusProjection> {
    return this.database.transaction(async (transaction) => {
      await this.actorContext(transaction, actor); await this.authorize(transaction, actor, PUBLISHING_PERMISSIONS.publishingRequest); await this.enforceWritableSubscription(transaction, actor);
      const now = new Date(input.now);
      const job = await this.loadJobForMutation(transaction, actor.organizationId, input.jobId, now);
      const selected = input.targetIds === undefined ? undefined : [...new Set(input.targetIds)];
      const rows = await transaction.select({ target: publishingJobTargets, siteId: articleSites.siteId, articleId: articleSites.articleId }).from(publishingJobTargets)
        .innerJoin(articleSites, and(eq(articleSites.organizationId, publishingJobTargets.organizationId), eq(articleSites.id, publishingJobTargets.articleSiteId)))
        .where(and(eq(publishingJobTargets.organizationId, actor.organizationId), eq(publishingJobTargets.jobId, input.jobId), selected === undefined ? undefined : inArray(publishingJobTargets.id, selected))).for('update');
      if (selected !== undefined) {
        const found = new Set(rows.map(({ target }) => target.id));
        if (selected.some((id) => !found.has(id))) throw new PublishingAccessDeniedError();
      }
      const published = rows.filter(({ target }) => target.state === 'published');
      for (const { target, siteId, articleId } of published) {
        await transaction.update(publishingJobTargets).set({ state: 'unpublished', finishedAt: now, updatedAt: now }).where(and(eq(publishingJobTargets.organizationId, actor.organizationId), eq(publishingJobTargets.id, target.id)));
        await transaction.update(articleSites).set({ state: 'unpublished', stateOccurredAt: now, publishedUrl: null, publishedAt: null, version: sql`${articleSites.version} + 1`, updatedAt: now }).where(and(eq(articleSites.organizationId, actor.organizationId), eq(articleSites.id, target.articleSiteId)));
        await this.enqueuePublicInvalidation(transaction, actor.organizationId, siteId, 'publication.unpublished', now, articleId);
      }
      const states = await transaction.select({ state: publishingJobTargets.state }).from(publishingJobTargets).where(and(eq(publishingJobTargets.organizationId, actor.organizationId), eq(publishingJobTargets.jobId, job.id)));
      let aggregate = aggregateJobState(states.map(({ state }) => state));
      if (aggregate === 'queued') aggregate = job.state;
      const terminal = aggregate === 'published' || aggregate === 'failed' || aggregate === 'unpublished';
      await transaction.update(publishingJobs).set({ state: aggregate, finalizedAt: terminal ? now : job.finalizedAt, version: job.version + 1, updatedAt: now }).where(and(eq(publishingJobs.organizationId, actor.organizationId), eq(publishingJobs.id, job.id), eq(publishingJobs.version, job.version)));
      const refreshed = await transaction.select().from(publishingJobs).where(and(eq(publishingJobs.organizationId, actor.organizationId), eq(publishingJobs.id, job.id))).limit(1);
      await this.audit(transaction, actor, 'publication.unpublish', 'publishing_job', job.id, { targetIds: published.map(({ target }) => target.id) }, now);
      return this.statusTx(transaction, refreshed[0]!);
    });
  }

  private async systemJobMutation(organizationId: string, jobId: string, operation: (transaction: Transaction, job: JobRow) => Promise<void>): Promise<void> {
    await this.database.transaction(async (transaction) => {
      await this.context(transaction, organizationId, jobId, SYSTEM_REQUEST);
      const rows = await transaction.select().from(publishingJobs).where(and(eq(publishingJobs.organizationId, organizationId), eq(publishingJobs.id, jobId))).limit(1).for('update');
      if (rows[0] === undefined) throw new PublishingAccessDeniedError();
      await operation(transaction, rows[0]);
    });
  }
  async recordDispatchScheduled(organizationId: string, jobId: string, now: string, claimToken?: string): Promise<void> {
    await this.systemJobMutation(organizationId, jobId, async (transaction, job) => {
      const predicate = claimToken === undefined ? and(eq(publishingJobs.organizationId, organizationId), eq(publishingJobs.id, jobId), eq(publishingJobs.version, job.version), eq(publishingJobs.dispatchStatus, 'pending')) : and(eq(publishingJobs.organizationId, organizationId), eq(publishingJobs.id, jobId), eq(publishingJobs.version, job.version), eq(publishingJobs.dispatchStatus, 'pending'), eq(publishingJobs.reconciliationClaimToken, claimToken), gt(publishingJobs.reconciliationClaimExpiresAt, sql`clock_timestamp()`));
      await transaction.update(publishingJobs).set({ dispatchStatus: 'scheduled', dispatchAttempts: job.dispatchAttempts + 1, reconciliationClaimToken: null, reconciliationClaimExpiresAt: null, updatedAt: new Date(now), version: job.version + 1 }).where(predicate);
    });
  }
  async recordDispatchFailure(organizationId: string, jobId: string, retryable: boolean, nextAt: string, now: string, claimToken?: string): Promise<void> {
    await this.systemJobMutation(organizationId, jobId, async (transaction, job) => {
      if (claimToken !== undefined) {
        const validClaim = await transaction.select({ id: publishingJobs.id }).from(publishingJobs).where(and(eq(publishingJobs.organizationId, organizationId), eq(publishingJobs.id, jobId), eq(publishingJobs.reconciliationClaimToken, claimToken), gt(publishingJobs.reconciliationClaimExpiresAt, sql`clock_timestamp()`))).limit(1);
        if (validClaim.length !== 1) return;
      }
      if (job.dispatchStatus !== 'pending') return;
      if (!retryable) {
        const targets = await transaction.select().from(publishingJobTargets).where(and(eq(publishingJobTargets.organizationId, organizationId), eq(publishingJobTargets.jobId, jobId))).for('update');
        for (const target of targets) {
          if (target.state === 'published' || target.state === 'failed') continue;
          if (target.state === 'queued') {
            await transaction.update(publishingJobTargets).set({ state: 'processing', attempt: target.attempt + 1, startedAt: new Date(now), updatedAt: new Date(now) }).where(and(eq(publishingJobTargets.organizationId, organizationId), eq(publishingJobTargets.id, target.id)));
            await transaction.update(articleSites).set({ state: 'processing', stateOccurredAt: new Date(now), attempt: target.attempt + 1, publishedUrl: null, publishedAt: null, version: sql`${articleSites.version} + 1`, updatedAt: new Date(now) }).where(and(eq(articleSites.organizationId, organizationId), eq(articleSites.id, target.articleSiteId)));
          }
          await transaction.update(publishingJobTargets).set({ state: 'failed', finishedAt: new Date(now), sanitizedError: { code: 'dispatch_exhausted' }, updatedAt: new Date(now) }).where(and(eq(publishingJobTargets.organizationId, organizationId), eq(publishingJobTargets.id, target.id)));
          await transaction.update(articleSites).set({ state: 'failed', stateOccurredAt: new Date(now), sanitizedFailure: { code: 'dispatch_exhausted' }, publishedUrl: null, publishedAt: null, version: sql`${articleSites.version} + 1`, updatedAt: new Date(now) }).where(and(eq(articleSites.organizationId, organizationId), eq(articleSites.id, target.articleSiteId)));
        }
      }
      const nextState = retryable ? 'retrying' as const : 'failed' as const;
      const updated = await transaction.update(publishingJobs).set({ state: nextState, dispatchStatus: retryable ? 'pending' : 'failed', dispatchAttempts: job.dispatchAttempts + 1, nextDispatchAt: new Date(nextAt), finalizedAt: retryable ? null : new Date(now), reconciliationClaimToken: null, reconciliationClaimExpiresAt: null, updatedAt: new Date(now), version: job.version + 1 }).where(and(eq(publishingJobs.organizationId, organizationId), eq(publishingJobs.id, jobId), eq(publishingJobs.version, job.version))).returning();
      if (updated.length !== 1) return;
      await this.insertReceipt(transaction, updated[0]!, null, job.state, nextState, new Date(now), true);
      await this.audit(transaction, this.system(organizationId, jobId, 'reconciler'), 'publication.dispatch.failure', 'publishing_job', jobId, { retryable }, new Date(now));
    });
  }

  private async statusTx(transaction: Transaction, job: JobRow): Promise<PublicationStatusProjection> {
    const rows = await transaction.select({ target: publishingJobTargets, siteId: articleSites.siteId }).from(publishingJobTargets).innerJoin(articleSites, and(eq(articleSites.organizationId, publishingJobTargets.organizationId), eq(articleSites.id, publishingJobTargets.articleSiteId))).where(and(eq(publishingJobTargets.organizationId, job.organizationId), eq(publishingJobTargets.jobId, job.id)));
    const targets = rows.map(({ target, siteId }) => mapTarget({ ...target, siteId })); const mappedJob = mapJob(job);
    return { job: mappedJob, targets, result: mappedJob.state === 'published' || mappedJob.state === 'failed' ? projectPublicationResult(targets) : null };
  }
  async getPublication(actor: AuthorizedTenantActorContext, jobId: string) {
    return this.database.transaction(async (transaction) => {
      await this.actorContext(transaction, actor); await this.authorize(transaction, actor, PUBLISHING_PERMISSIONS.publishingRead);
      const rows = await transaction.select().from(publishingJobs).where(and(eq(publishingJobs.organizationId, actor.organizationId), eq(publishingJobs.id, jobId))).limit(1);
      return rows[0] === undefined ? null : this.statusTx(transaction, rows[0]);
    });
  }
  async listPublications(actor: AuthorizedTenantActorContext, limit: number) {
    return this.database.transaction(async (transaction) => {
      await this.actorContext(transaction, actor); await this.authorize(transaction, actor, PUBLISHING_PERMISSIONS.publishingRead);
      const rows = await transaction.select({ job: publishingJobs, articleTitle: articles.title }).from(publishingJobs)
        .innerJoin(articles, and(eq(articles.organizationId, publishingJobs.organizationId), eq(articles.id, publishingJobs.articleId)))
        .where(eq(publishingJobs.organizationId, actor.organizationId))
        .orderBy(desc(publishingJobs.createdAt)).limit(Math.max(1, Math.min(limit, 20)));
      return rows.map(({ job, articleTitle }) => ({ job: mapJob(job), articleTitle }));
    });
  }
  async loadJobNotificationContext(organizationId: string, jobId: string): Promise<JobNotificationContext | null> {
    return this.database.transaction(async (transaction) => {
      await this.context(transaction, organizationId, jobId, 'worker-notify');
      const jobs = await transaction.select({ articleId: publishingJobs.articleId }).from(publishingJobs).where(and(eq(publishingJobs.organizationId, organizationId), eq(publishingJobs.id, jobId))).limit(1);
      const job = jobs[0]; if (job === undefined) return null;
      const titles = await transaction.select({ title: articles.title }).from(articles).where(and(eq(articles.organizationId, organizationId), eq(articles.id, job.articleId))).limit(1);
      const title = titles[0]?.title; if (title === undefined) return null;
      const hosts = await transaction.select({ siteId: sites.id, hostname: sites.normalizedHostname }).from(publishingJobTargets)
        .innerJoin(articleSites, and(eq(articleSites.organizationId, publishingJobTargets.organizationId), eq(articleSites.id, publishingJobTargets.articleSiteId)))
        .innerJoin(sites, and(eq(sites.organizationId, publishingJobTargets.organizationId), eq(sites.id, articleSites.siteId)))
        .where(and(eq(publishingJobTargets.organizationId, organizationId), eq(publishingJobTargets.jobId, jobId)));
      return { articleTitle: title, hostnames: Object.fromEntries(hosts.map(({ siteId, hostname }) => [siteId, hostname])) };
    });
  }
  private async loadJobs(refs: readonly { organization_id: string; job_id: string }[]): Promise<PublicationJobRecord[]> {
    const output: PublicationJobRecord[] = [];
    for (const ref of refs) await this.database.transaction(async (transaction) => {
      await this.context(transaction, ref.organization_id, ref.job_id, SYSTEM_REQUEST);
      const rows = await transaction.select().from(publishingJobs).where(and(eq(publishingJobs.organizationId, ref.organization_id), eq(publishingJobs.id, ref.job_id))).limit(1);
      if (rows[0] !== undefined) output.push(mapJob(rows[0]));
    });
    return output;
  }
  async claimDispatchGaps(now: string, limit: number, claimToken: string, claimExpiresAt: string) {
    const refs = await this.database.execute<{ organization_id: string; job_id: string }>(sql`SELECT * FROM indicate_private.claim_publishing_dispatch_gaps(${now}::timestamptz, ${limit}, ${claimToken}::uuid, ${claimExpiresAt}::timestamptz)`);
    return this.loadJobs(refs);
  }
  async claimJob(organizationId: string, jobId: string, workerId: string, leaseExpiresAt: string, now: string): Promise<WorkerClaim | null> {
    return this.database.transaction(async (transaction) => {
      await this.context(transaction, organizationId, jobId, `worker:${workerId}`);
      const beforeRows = await transaction.select().from(publishingJobs).where(and(eq(publishingJobs.organizationId, organizationId), eq(publishingJobs.id, jobId), inArray(publishingJobs.state, ['queued', 'retrying']), or(isNull(publishingJobs.leaseExpiresAt), lte(publishingJobs.leaseExpiresAt, sql`clock_timestamp()`)))).limit(1).for('update');
      const before = beforeRows[0]; if (before === undefined) return null;
      const rows = await transaction.update(publishingJobs).set({ state: 'processing', dispatchStatus: 'leased', leaseOwner: workerId, leaseExpiresAt: new Date(leaseExpiresAt), fencingToken: before.fencingToken + 1, reconciliationClaimToken: null, reconciliationClaimExpiresAt: null, version: before.version + 1, updatedAt: new Date(now) }).where(and(eq(publishingJobs.organizationId, organizationId), eq(publishingJobs.id, jobId), eq(publishingJobs.version, before.version), sql`${leaseExpiresAt}::timestamptz > clock_timestamp()`)).returning();
      const job = rows[0]; if (job === undefined) return null;
      await this.insertReceipt(transaction, job, null, before.state, 'processing', new Date(now), true);
      await this.audit(transaction, this.system(organizationId, jobId), 'publication.job.claim', 'publishing_job', jobId, { fencingToken: job.fencingToken }, new Date(now));
      return { organizationId, jobId, workerId, fencingToken: job.fencingToken, leaseExpiresAt: iso(job.leaseExpiresAt!) };
    });
  }
  async runnableTargets(claim: WorkerClaim, now: string, limit: number) {
    return this.database.transaction(async (transaction) => {
      await this.context(transaction, claim.organizationId, claim.jobId, `worker:${claim.workerId}`);
      const jobs = await transaction.select({ id: publishingJobs.id }).from(publishingJobs).where(and(eq(publishingJobs.organizationId, claim.organizationId), eq(publishingJobs.id, claim.jobId), eq(publishingJobs.fencingToken, claim.fencingToken), eq(publishingJobs.leaseOwner, claim.workerId), gt(publishingJobs.leaseExpiresAt, sql`clock_timestamp()`))).limit(1);
      if (jobs.length !== 1) throw new PublishingConflictError('stale_fence');
      const rows = await transaction.select({ target: publishingJobTargets, siteId: articleSites.siteId }).from(publishingJobTargets).innerJoin(articleSites, and(eq(articleSites.organizationId, publishingJobTargets.organizationId), eq(articleSites.id, publishingJobTargets.articleSiteId))).where(and(eq(publishingJobTargets.organizationId, claim.organizationId), eq(publishingJobTargets.jobId, claim.jobId), inArray(publishingJobTargets.state, ['queued', 'retrying']), lte(publishingJobTargets.nextAttemptAt, new Date(now)))).limit(limit);
      return rows.map(({ target, siteId }) => mapTarget({ ...target, siteId }));
    });
  }
  async transitionTarget(claim: WorkerClaim, input: TargetTransitionInput): Promise<TargetTransitionCommit> {
    return this.database.transaction(async (transaction) => {
      await this.context(transaction, claim.organizationId, claim.jobId, `worker:${claim.workerId}`);
      const jobs = await transaction.select().from(publishingJobs).where(and(eq(publishingJobs.organizationId, claim.organizationId), eq(publishingJobs.id, claim.jobId), eq(publishingJobs.fencingToken, claim.fencingToken), eq(publishingJobs.leaseOwner, claim.workerId), gt(publishingJobs.leaseExpiresAt, sql`clock_timestamp()`))).limit(1).for('update');
      const job = jobs[0]; if (job === undefined) throw new PublishingConflictError('stale_fence');
      const targets = await transaction.select().from(publishingJobTargets).where(and(eq(publishingJobTargets.organizationId, claim.organizationId), eq(publishingJobTargets.id, input.targetId), eq(publishingJobTargets.jobId, claim.jobId))).limit(1).for('update');
      const target = targets[0]; if (target === undefined) throw new PublishingAccessDeniedError();
      if (!isAllowedTargetTransition(target.state, input.toState)) throw new PublishingConflictError('invalid_transition');
      if ((target.state === 'published' || target.state === 'failed' || target.state === 'unpublished') && target.state === input.toState) {
        const prior = await transaction.select().from(publicationTransitionReceipts).where(and(eq(publicationTransitionReceipts.organizationId, claim.organizationId), eq(publicationTransitionReceipts.targetId, target.id), eq(publicationTransitionReceipts.toState, input.toState))).limit(1);
        return { status: await this.statusTx(transaction, job), receiptId: prior[0]?.id ?? crypto.randomUUID() };
      }
      if (input.toState === 'published' && input.publishedUrl == null) throw new PublishingConflictError('invalid_transition');
      const targetRows = await transaction.update(publishingJobTargets).set({ state: input.toState, attempt: input.toState === 'processing' ? target.attempt + 1 : target.attempt, fencingToken: claim.fencingToken, nextAttemptAt: input.nextAttemptAt === undefined ? target.nextAttemptAt : new Date(input.nextAttemptAt), startedAt: input.toState === 'processing' ? new Date(input.now) : target.startedAt, finishedAt: input.toState === 'published' || input.toState === 'failed' ? new Date(input.now) : null, publishedUrl: input.toState === 'published' ? input.publishedUrl ?? null : target.publishedUrl, publishedAt: input.toState === 'published' ? new Date(input.now) : target.publishedAt, sanitizedError: input.sanitizedError ?? (input.toState === 'processing' ? null : target.sanitizedError), updatedAt: new Date(input.now) }).where(and(eq(publishingJobTargets.organizationId, claim.organizationId), eq(publishingJobTargets.id, target.id), eq(publishingJobTargets.fencingToken, target.fencingToken))).returning();
      if (targetRows.length !== 1) throw new PublishingConflictError('stale_fence');
      let seededViews: number | null = null;
      if (input.toState === 'published') {
        const current = (await transaction.select({ viewCount: articleSites.viewCount, publishedAt: articleSites.publishedAt }).from(articleSites).where(and(eq(articleSites.organizationId, claim.organizationId), eq(articleSites.id, target.articleSiteId))).limit(1))[0];
        if (current !== undefined && current.viewCount === 0) seededViews = seedInitialViewCount(current.viewCount, current.publishedAt !== null);
        await transaction.update(articles).set({ status: 'active', updatedAt: new Date(input.now) }).where(and(eq(articles.organizationId, claim.organizationId), eq(articles.id, job.articleId), eq(articles.status, 'draft')));
      }
      await transaction.update(articleSites).set({ state: input.toState, stateOccurredAt: new Date(input.now), publishedUrl: input.toState === 'published' ? input.publishedUrl ?? null : null, publishedAt: input.toState === 'published' ? new Date(input.now) : null, sanitizedFailure: input.sanitizedError ?? null, attempt: input.toState === 'processing' ? target.attempt + 1 : target.attempt, ...(seededViews === null ? {} : { viewCount: seededViews }), version: sql`${articleSites.version} + 1`, updatedAt: new Date(input.now) }).where(and(eq(articleSites.organizationId, claim.organizationId), eq(articleSites.id, target.articleSiteId)));
      if (input.toState === 'published' || input.toState === 'unpublished') {
        const relation = (await transaction.select({ siteId: articleSites.siteId, articleId: articleSites.articleId }).from(articleSites).where(and(eq(articleSites.organizationId, claim.organizationId), eq(articleSites.id, target.articleSiteId))).limit(1))[0];
        if (relation !== undefined) await this.enqueuePublicInvalidation(transaction, claim.organizationId, relation.siteId, `publication.${input.toState}`, new Date(input.now), relation.articleId);
      }
      const stateRows = await transaction.select({ state: publishingJobTargets.state }).from(publishingJobTargets).where(and(eq(publishingJobTargets.organizationId, claim.organizationId), eq(publishingJobTargets.jobId, claim.jobId)));
      let aggregate = aggregateJobState(stateRows.map(({ state }) => state)); if (aggregate === 'queued') aggregate = 'processing';
      const terminal = aggregate === 'published' || aggregate === 'failed' || aggregate === 'unpublished';
      const retryAt = aggregate === 'retrying' ? (await transaction.select({ nextAttemptAt: publishingJobTargets.nextAttemptAt }).from(publishingJobTargets).where(and(eq(publishingJobTargets.organizationId, claim.organizationId), eq(publishingJobTargets.jobId, claim.jobId), eq(publishingJobTargets.state, 'retrying'))).orderBy(publishingJobTargets.nextAttemptAt).limit(1))[0]?.nextAttemptAt ?? new Date(input.now) : job.nextDispatchAt;
      const updatedJobs = await transaction.update(publishingJobs).set({ state: aggregate, dispatchStatus: aggregate === 'retrying' ? 'pending' : job.dispatchStatus, nextDispatchAt: retryAt, finalizedAt: terminal ? new Date(input.now) : null, version: job.version + 1, updatedAt: new Date(input.now) }).where(and(eq(publishingJobs.organizationId, claim.organizationId), eq(publishingJobs.id, claim.jobId), eq(publishingJobs.fencingToken, claim.fencingToken), eq(publishingJobs.version, job.version), gt(publishingJobs.leaseExpiresAt, sql`clock_timestamp()`))).returning();
      if (updatedJobs.length !== 1) throw new PublishingConflictError('stale_fence');
      const receipt = await this.insertReceipt(transaction, updatedJobs[0]!, target.id, target.state, input.toState, new Date(input.now), false);
      await this.audit(transaction, this.system(claim.organizationId, claim.jobId), `publication.target.${input.toState}`, 'publishing_job_target', target.id, { state: input.toState, failure: input.sanitizedError ?? null }, new Date(input.now));
      return { status: await this.statusTx(transaction, updatedJobs[0]!), receiptId: receipt.id };
    });
  }
  async acknowledgeTransitionReceipt(organizationId: string, receiptId: string, now: string): Promise<void> {
    await this.database.transaction(async (transaction) => {
      await this.context(transaction, organizationId, receiptId, SYSTEM_REQUEST);
      const rows = await transaction.update(publicationTransitionReceipts).set({ acknowledgedAt: new Date(now), reconciliationClaimToken: null, reconciliationClaimExpiresAt: null }).where(and(eq(publicationTransitionReceipts.organizationId, organizationId), eq(publicationTransitionReceipts.id, receiptId), isNull(publicationTransitionReceipts.acknowledgedAt))).returning({ id: publicationTransitionReceipts.id });
      if (rows.length === 0) {
        const existing = await transaction.select({ id: publicationTransitionReceipts.id }).from(publicationTransitionReceipts).where(and(eq(publicationTransitionReceipts.organizationId, organizationId), eq(publicationTransitionReceipts.id, receiptId))).limit(1);
        if (existing.length === 0) throw new PublishingAccessDeniedError();
      }
    });
  }
  async releaseJob(claim: WorkerClaim, now: string): Promise<void> {
    await this.database.transaction(async (transaction) => {
      await this.context(transaction, claim.organizationId, claim.jobId, `worker:${claim.workerId}`);
      const rows = await transaction.select().from(publishingJobs).where(and(eq(publishingJobs.organizationId, claim.organizationId), eq(publishingJobs.id, claim.jobId), eq(publishingJobs.fencingToken, claim.fencingToken), eq(publishingJobs.leaseOwner, claim.workerId), gt(publishingJobs.leaseExpiresAt, sql`clock_timestamp()`))).limit(1).for('update');
      const job = rows[0]; if (job === undefined) throw new PublishingConflictError('stale_fence');
      const incomplete = await transaction.select({ state: publishingJobTargets.state, nextAttemptAt: publishingJobTargets.nextAttemptAt }).from(publishingJobTargets).where(and(eq(publishingJobTargets.organizationId, claim.organizationId), eq(publishingJobTargets.jobId, claim.jobId), inArray(publishingJobTargets.state, ['queued', 'retrying'])));
      const nextState = job.state === 'processing' && incomplete.length > 0 ? 'retrying' as const : job.state;
      const nextDispatchAt = nextState === 'retrying'
        ? incomplete.some(({ state }) => state === 'queued')
          ? new Date(now)
          : incomplete.map(({ nextAttemptAt }) => nextAttemptAt).sort((left, right) => left.getTime() - right.getTime())[0] ?? job.nextDispatchAt
        : job.nextDispatchAt;
      const updated = await transaction.update(publishingJobs).set({ state: nextState, dispatchStatus: nextState === 'published' || nextState === 'failed' ? 'acknowledged' : nextState === 'retrying' ? 'pending' : 'scheduled', nextDispatchAt, leaseOwner: null, leaseExpiresAt: null, version: job.version + 1, updatedAt: new Date(now) }).where(and(eq(publishingJobs.organizationId, claim.organizationId), eq(publishingJobs.id, claim.jobId), eq(publishingJobs.fencingToken, claim.fencingToken), eq(publishingJobs.version, job.version), gt(publishingJobs.leaseExpiresAt, sql`clock_timestamp()`))).returning();
      if (updated.length !== 1) throw new PublishingConflictError('stale_fence');
      if (nextState !== job.state) await this.insertReceipt(transaction, updated[0]!, null, job.state, nextState, new Date(now), true);
    });
  }
  async findExpiredLeases(now: string, limit: number) {
    const refs = await this.database.execute<{ organization_id: string; job_id: string }>(sql`SELECT * FROM indicate_private.find_publishing_expired_leases(${now}::timestamptz, ${limit})`);
    return this.loadJobs(refs);
  }
  async recoverExpiredLease(organizationId: string, jobId: string, maxAttempts: number, now: string): Promise<void> {
    await this.database.transaction(async (transaction) => {
      await this.context(transaction, organizationId, jobId, SYSTEM_REQUEST);
      const rows = await transaction.select().from(publishingJobs).where(and(eq(publishingJobs.organizationId, organizationId), eq(publishingJobs.id, jobId), eq(publishingJobs.state, 'processing'), lte(publishingJobs.leaseExpiresAt, sql`clock_timestamp()`))).limit(1).for('update');
      const job = rows[0]; if (job === undefined) return;
      const runningTargets = await transaction.select().from(publishingJobTargets).where(and(eq(publishingJobTargets.organizationId, organizationId), eq(publishingJobTargets.jobId, jobId), eq(publishingJobTargets.state, 'processing'))).for('update');
      for (const target of runningTargets) {
        const exhausted = target.attempt >= maxAttempts; const state = exhausted ? 'failed' as const : 'retrying' as const;
        await transaction.update(publishingJobTargets).set({ state, nextAttemptAt: new Date(now), finishedAt: exhausted ? new Date(now) : null, sanitizedError: { code: exhausted ? 'retry_exhausted' : 'lease_expired' }, updatedAt: new Date(now) }).where(and(eq(publishingJobTargets.organizationId, organizationId), eq(publishingJobTargets.id, target.id), eq(publishingJobTargets.state, 'processing')));
        await transaction.update(articleSites).set({ state, stateOccurredAt: new Date(now), publishedUrl: null, publishedAt: null, sanitizedFailure: { code: exhausted ? 'retry_exhausted' : 'lease_expired' }, version: sql`${articleSites.version} + 1`, updatedAt: new Date(now) }).where(and(eq(articleSites.organizationId, organizationId), eq(articleSites.id, target.articleSiteId), eq(articleSites.state, 'processing')));
      }
      const states = await transaction.select({ state: publishingJobTargets.state }).from(publishingJobTargets).where(and(eq(publishingJobTargets.organizationId, organizationId), eq(publishingJobTargets.jobId, jobId)));
      let aggregate = aggregateJobState(states.map(({ state }) => state)); if (aggregate === 'queued') aggregate = 'retrying';
      const terminal = aggregate === 'published' || aggregate === 'failed';
      const updated = await transaction.update(publishingJobs).set({ state: aggregate, dispatchStatus: terminal ? 'acknowledged' : 'pending', leaseOwner: null, leaseExpiresAt: null, nextDispatchAt: new Date(now), finalizedAt: terminal ? new Date(now) : null, version: job.version + 1, updatedAt: new Date(now) }).where(and(eq(publishingJobs.organizationId, organizationId), eq(publishingJobs.id, jobId), eq(publishingJobs.fencingToken, job.fencingToken), eq(publishingJobs.state, 'processing'), lte(publishingJobs.leaseExpiresAt, sql`clock_timestamp()`))).returning();
      if (updated.length === 0) return;
      await this.insertReceipt(transaction, updated[0]!, null, job.state, aggregate, new Date(now), true);
      await this.audit(transaction, this.system(organizationId, jobId, 'reconciler'), 'publication.lease.recover', 'publishing_job', jobId, { recoveredTargets: runningTargets.length, state: aggregate }, new Date(now));
    });
  }
  async claimTransitionReceipts(now: string, limit: number, claimToken: string, claimExpiresAt: string): Promise<readonly TransitionReceiptRecord[]> {
    const refs = await this.database.execute<{ organization_id: string; receipt_id: string }>(sql`SELECT * FROM indicate_private.claim_publishing_transition_receipts(${now}::timestamptz, ${limit}, ${claimToken}::uuid, ${claimExpiresAt}::timestamptz)`);
    const output: TransitionReceiptRecord[] = [];
    for (const ref of refs) await this.database.transaction(async (transaction) => {
      await this.context(transaction, ref.organization_id, ref.receipt_id, SYSTEM_REQUEST);
      const rows = await transaction.select().from(publicationTransitionReceipts).where(and(eq(publicationTransitionReceipts.organizationId, ref.organization_id), eq(publicationTransitionReceipts.id, ref.receipt_id))).limit(1);
      if (rows[0] !== undefined) output.push(mapReceipt(rows[0]));
    });
    return output;
  }
  async reconcileTransitionReceipt(receipt: TransitionReceiptRecord, claimToken: string, now: string): Promise<void> {
    await this.database.transaction(async (transaction) => {
      await this.context(transaction, receipt.organizationId, receipt.id, SYSTEM_REQUEST);
      await transaction.update(publicationTransitionReceipts).set({ acknowledgedAt: new Date(now), reconciliationClaimToken: null, reconciliationClaimExpiresAt: null }).where(and(
        eq(publicationTransitionReceipts.organizationId, receipt.organizationId),
        eq(publicationTransitionReceipts.id, receipt.id),
        isNull(publicationTransitionReceipts.acknowledgedAt),
        eq(publicationTransitionReceipts.reconciliationClaimToken, claimToken),
        gt(publicationTransitionReceipts.reconciliationClaimExpiresAt, sql`clock_timestamp()`),
      ));
    });
  }
  async claimCleanupTasks(now: string, limit: number, claimToken: string, claimExpiresAt: string): Promise<readonly ClaimedCleanupTask[]> {
    const refs = await this.database.execute<{ organization_id: string; task_id: string }>(sql`SELECT * FROM indicate_private.claim_media_cleanup_tasks(${now}::timestamptz, ${limit}, ${claimToken}::uuid, ${claimExpiresAt}::timestamptz)`);
    const output: ClaimedCleanupTask[] = [];
    for (const ref of refs) await this.database.transaction(async (transaction) => {
      await this.context(transaction, ref.organization_id, ref.task_id, SYSTEM_REQUEST);
      const rows = await transaction.select().from(objectCleanupTasks).where(and(eq(objectCleanupTasks.organizationId, ref.organization_id), eq(objectCleanupTasks.id, ref.task_id), eq(objectCleanupTasks.reconciliationClaimToken, claimToken))).limit(1);
      if (rows[0] !== undefined) output.push({ ...mapCleanup(rows[0]), claimToken });
    });
    return output;
  }
  async completeCleanupTask(organizationId: string, taskId: string, claimToken: string, now: string): Promise<void> {
    await this.database.transaction(async (transaction) => {
      await this.context(transaction, organizationId, taskId, SYSTEM_REQUEST);
      await transaction.update(objectCleanupTasks).set({ status: 'completed', reconciliationClaimToken: null, reconciliationClaimExpiresAt: null, updatedAt: new Date(now) }).where(and(eq(objectCleanupTasks.organizationId, organizationId), eq(objectCleanupTasks.id, taskId), eq(objectCleanupTasks.status, 'processing'), eq(objectCleanupTasks.reconciliationClaimToken, claimToken), gt(objectCleanupTasks.reconciliationClaimExpiresAt, sql`clock_timestamp()`)));
    });
  }
  async failCleanupTask(organizationId: string, taskId: string, claimToken: string, retryable: boolean, nextAt: string, failure: Readonly<Record<string, unknown>>, now: string): Promise<void> {
    await this.database.transaction(async (transaction) => {
      await this.context(transaction, organizationId, taskId, SYSTEM_REQUEST);
      await transaction.update(objectCleanupTasks).set({ status: retryable ? 'pending' : 'failed', attempts: sql`${objectCleanupTasks.attempts} + 1`, nextAttemptAt: new Date(nextAt), reconciliationClaimToken: null, reconciliationClaimExpiresAt: null, sanitizedFailure: redact(failure) as Record<string, unknown>, updatedAt: new Date(now) }).where(and(eq(objectCleanupTasks.organizationId, organizationId), eq(objectCleanupTasks.id, taskId), eq(objectCleanupTasks.status, 'processing'), eq(objectCleanupTasks.reconciliationClaimToken, claimToken), gt(objectCleanupTasks.reconciliationClaimExpiresAt, sql`clock_timestamp()`)));
    });
  }

  async snapshot(organizationId: string, regionScopeId: string | null = null): Promise<PublishingTenantSnapshot | null> {
    return this.database.transaction(async (transaction) => {
      await this.context(transaction, organizationId, 'publishing-snapshot', SYSTEM_REQUEST);
      const organization = await transaction.select({ id: organizations.id }).from(organizations).where(eq(organizations.id, organizationId)).limit(1); if (organization.length === 0) return null;
      const [articleRows, siteRows, settingsRows, relationRows, reservationRows, mediaRows, cleanupRows, invalidationRows, jobRows, targetRows, receiptRows, auditRows] = await Promise.all([
        transaction.select().from(articles).where(eq(articles.organizationId, organizationId)),
        transaction.select().from(sites).where(eq(sites.organizationId, organizationId)),
        transaction.select().from(siteSettings).where(eq(siteSettings.organizationId, organizationId)),
        transaction.select().from(articleSites).where(eq(articleSites.organizationId, organizationId)),
        transaction.select().from(mediaKeyReservations).where(eq(mediaKeyReservations.organizationId, organizationId)),
        transaction.select().from(media).where(eq(media.organizationId, organizationId)),
        transaction.select().from(objectCleanupTasks).where(eq(objectCleanupTasks.organizationId, organizationId)),
        transaction.select().from(invalidationTasks).where(eq(invalidationTasks.organizationId, organizationId)),
        transaction.select().from(publishingJobs).where(eq(publishingJobs.organizationId, organizationId)),
        transaction.select({ target: publishingJobTargets, siteId: articleSites.siteId }).from(publishingJobTargets).innerJoin(articleSites, and(eq(articleSites.organizationId, publishingJobTargets.organizationId), eq(articleSites.id, publishingJobTargets.articleSiteId))).where(eq(publishingJobTargets.organizationId, organizationId)),
        transaction.select().from(publicationTransitionReceipts).where(eq(publicationTransitionReceipts.organizationId, organizationId)),
        transaction.select().from(auditLogs).where(eq(auditLogs.organizationId, organizationId)),
      ]);
      const settingsBySite = new Map(settingsRows.map((row) => [row.siteId, [row.logoMediaId, row.faviconMediaId, row.defaultMediaId].filter((value): value is string => value !== null)]));
      const lock = regionScopeId ?? null;
      const articleRegion = new Map(articleRows.map((row) => [row.id, row.regionId] as const));
      const siteRegion = new Map(siteRows.map((row) => [row.id, row.regionId] as const));
      const articleVisible = (articleId: string) => lock === null || articleRegion.get(articleId) === lock;
      const siteVisible = (siteId: string) => lock === null || siteRegion.get(siteId) === null || siteRegion.get(siteId) === lock;
      const ownerVisible = (owner: { readonly kind: string; readonly articleId?: string; readonly siteId?: string }) => {
        if (lock === null || owner.kind === 'organization') return true;
        if (owner.kind === 'article') return owner.articleId !== undefined && articleVisible(owner.articleId);
        if (owner.kind === 'site') return owner.siteId !== undefined && siteVisible(owner.siteId);
        return true;
      };
      const visibleArticles = articleRows.filter((row) => articleVisible(row.id));
      const visibleArticleIds = new Set(visibleArticles.map((row) => row.id));
      const visibleSites = siteRows.filter((row) => siteVisible(row.id));
      const visibleSiteIds = new Set(visibleSites.map((row) => row.id));
      const visibleJobs = jobRows.filter((row) => visibleArticleIds.has(row.articleId));
      const visibleJobIds = new Set(visibleJobs.map((row) => row.id));
      return {
        organizationId,
        articles: visibleArticles.map((row) => ({ id: row.id, organizationId, active: row.status === 'active', leadMediaId: row.leadMediaId, title: row.title, slug: row.slug })),
        sites: visibleSites.map((row) => ({ id: row.id, organizationId, active: row.status === 'active' && row.activationState === 'active', normalizedHostname: row.normalizedHostname, settingsMediaIds: settingsBySite.get(row.id) ?? [] })),
        articleSites: relationRows.filter((row) => visibleArticleIds.has(row.articleId) || visibleSiteIds.has(row.siteId)).map((row) => ({ id: row.id, organizationId, articleId: row.articleId, siteId: row.siteId, active: row.active, state: row.state, publishedUrl: row.publishedUrl, publishedAt: optionalIso(row.publishedAt), version: row.version })),
        reservations: reservationRows.map(mapReservation).filter((row) => ownerVisible(row.owner)), media: mediaRows.filter((row) => row.state !== 'reserved').map(mapMedia).filter((asset) => ownerVisible(asset.owner)), cleanupTasks: cleanupRows.map(mapCleanup),
        invalidationIntents: invalidationRows.filter((row) => visibleSiteIds.has(row.siteId)).map((row) => ({ id: row.id, organizationId, siteId: row.siteId, reason: row.reason, tags: row.tags, status: row.status })),
        jobs: visibleJobs.map(mapJob), targets: targetRows.filter(({ target }) => visibleJobIds.has(target.jobId)).map(({ target, siteId }) => mapTarget({ ...target, siteId })), transitionReceipts: receiptRows.map(mapReceipt),
        auditLogs: auditRows.map((row) => ({ id: row.id, organizationId, actorType: row.actorType, actorId: row.actorId, entryPoint: row.entryPoint, action: row.action, targetType: row.targetType, targetId: row.targetId, outcome: row.outcome, changedFields: row.changedFields, before: row.before ?? null, after: row.after ?? null, requestId: row.requestId, occurredAt: iso(row.occurredAt) })),
      };
    });
  }
}
