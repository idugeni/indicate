import { aliasedTable, and, eq, gt, inArray, isNotNull, or, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import type { AuthorizedTenantActorContext } from '@/core/operation-context';
import type { ActivationAttempt, InvalidationPlan, InvalidationTask, NetworkContentQuery, NetworkSiteData, ResolvedSiteContext } from '@/modules/delivery/models';
import { articleBodyText } from '@/modules/site/article-markup';
import { DeliveryConflictError, DeliveryResourceUnavailableError, type DeliveryRepository } from '@/modules/delivery/ports';
import { articleSites, articles, auditLogs, authors, cacheBypasses, categories, domainActivationAttempts, domains, invalidationTasks, media, officialAffiliations, publishers, regions, sites, siteSettings } from '@/data/schema';
import type * as schema from '@/data/schema';

type Database = PostgresJsDatabase<typeof schema>;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
const iso = (value: Date | string) => (value instanceof Date ? value : new Date(value)).toISOString();
const stripMarkup = (value: string) => value.replaceAll(/<[^>]*>/gu, ' ').replaceAll(/\s+/gu, ' ').trim();
const excerptForDescription = (body: string, maxLength = 180) => {
  const clean = stripMarkup(body);
  const chars = Array.from(clean);
  if (chars.length <= maxLength) return clean;
  const slice = chars.slice(0, maxLength).join('');
  const lastSpace = slice.lastIndexOf(' ');
  if (lastSpace > maxLength * 0.5) return slice.slice(0, lastSpace).trimEnd();
  return slice.trimEnd();
};
const absoluteMediaUrl = (context: ResolvedSiteContext, mediaId: string) => `https://${context.normalizedHostname}/api/network/media/${mediaId}`;
const absoluteDefaultAssetUrl = (context: ResolvedSiteContext, configuredUrl: string) => { const parsed = new URL(configuredUrl); return `https://${context.normalizedHostname}${parsed.pathname}${parsed.search}`; };

export class DrizzleDeliveryRepository implements DeliveryRepository {
  constructor(private readonly database: Database, private readonly defaultImageUrl: string) {}

  private async tenant(transaction: Transaction, actor: AuthorizedTenantActorContext): Promise<void> {
    if (!actor.permissionSet.has('sites.manage')) throw new DeliveryResourceUnavailableError();
    await transaction.execute(sql`SELECT indicate_private.set_tenant_context(${actor.organizationId}::uuid, ${actor.actorId}, ${actor.requestId})`);
    await transaction.execute(sql`SELECT indicate_private.set_region_context(${actor.regionScopeId ?? null}::uuid)`);
    if (actor.actorType === 'user') await transaction.execute(sql`SELECT indicate_private.set_verified_user_context(${actor.verifiedAuthUserId}::uuid)`);
  }

  private async publicTenant(transaction: Transaction, context: ResolvedSiteContext, requestId = crypto.randomUUID()): Promise<void> {
    await transaction.execute(sql`SELECT indicate_private.set_tenant_context(${context.organizationId}::uuid, ${`public:${context.siteId}`}, ${requestId})`);
  }

  async findActiveSitesByExactHostname(hostname: string): Promise<readonly ResolvedSiteContext[]> {
    const rows = await this.database.execute<{
      hostname: string; organization_id: string; domain_id: string; site_id: string;
      region_id: string | null; routing_version: number; content_version: number;
    }>(sql`SELECT * FROM indicate_private.discover_release_active_hosts(ARRAY[${hostname}])`);
    // Fail closed cepat: baris tanpa versi routing/konten valid diperlakukan
    // sebagai host tak dikenal (404) alih-alih meledak sebagai UNDEFINED_VALUE
    // jauh di dalam pembangunan query (500 + CPU terbuang).
    return [...rows]
      .filter((row) => Number.isFinite(row.routing_version) && Number.isFinite(row.content_version))
      .map((row) => ({ normalizedHostname: row.hostname, organizationId: row.organization_id, domainId: row.domain_id, siteId: row.site_id, regionId: row.region_id, routingVersion: row.routing_version, contentVersion: row.content_version }));
  }

  async findPendingActivation(hostname: string, attemptId: string): Promise<boolean> {
    const rows = await this.database.execute<{ pending: boolean }>(sql`SELECT indicate_private.is_delivery_pending_host(${hostname}, ${attemptId}::uuid) AS pending`);
    return rows[0]?.pending === true;
  }

  async loadNetworkSite(context: ResolvedSiteContext, query: NetworkContentQuery): Promise<NetworkSiteData | null> {
    return this.database.transaction(async (transaction) => {
      await this.publicTenant(transaction, context);
      const settingsRows = await transaction.select({ name: siteSettings.name, description: siteSettings.description, seoDefaultTitle: siteSettings.seoDefaultTitle, seoDefaultDescription: siteSettings.seoDefaultDescription, seoOpenGraphSiteName: siteSettings.seoOpenGraphSiteName, locale: siteSettings.locale, colors: siteSettings.colors, socialLinks: siteSettings.socialLinks, seo: siteSettings.seo, navigation: siteSettings.navigation, logoMediaId: siteSettings.logoMediaId, faviconMediaId: siteSettings.faviconMediaId, defaultMediaId: siteSettings.defaultMediaId, regionName: regions.name })
        .from(sites)
        .innerJoin(domains, and(eq(domains.organizationId, sites.organizationId), eq(domains.id, sites.domainId), eq(domains.status, 'active')))
        .leftJoin(regions, and(eq(regions.organizationId, sites.organizationId), eq(regions.id, sites.regionId)))
        .innerJoin(siteSettings, and(eq(siteSettings.organizationId, sites.organizationId), eq(siteSettings.siteId, sites.id)))
        .where(and(eq(sites.organizationId, context.organizationId), eq(sites.id, context.siteId), eq(sites.normalizedHostname, context.normalizedHostname), eq(sites.status, 'active'), eq(sites.activationState, 'active'), eq(sites.routingVersion, context.routingVersion), eq(sites.contentVersion, context.contentVersion), or(sql`${sites.regionId} IS NULL`, eq(regions.status, 'active')))).limit(1);
      const settings = settingsRows[0]; if (settings === undefined) return null;
      let logoMediaId = settings.logoMediaId;
      let faviconMediaId = settings.faviconMediaId;
      if (context.regionId !== null && (logoMediaId === null || faviconMediaId === null)) {
        const parentRows = await transaction.select({ logoMediaId: siteSettings.logoMediaId, faviconMediaId: siteSettings.faviconMediaId })
          .from(sites)
          .innerJoin(siteSettings, and(eq(siteSettings.organizationId, sites.organizationId), eq(siteSettings.siteId, sites.id)))
          .where(and(eq(sites.organizationId, context.organizationId), eq(sites.domainId, context.domainId), sql`${sites.regionId} IS NULL`, eq(sites.status, 'active'), eq(sites.activationState, 'active'))).limit(1);
        const parent = parentRows[0];
        if (parent !== undefined) {
          if (logoMediaId === null) logoMediaId = parent.logoMediaId;
          if (faviconMediaId === null) faviconMediaId = parent.faviconMediaId;
        }
      }

      const conditions = [eq(articles.organizationId, context.organizationId), eq(articleSites.organizationId, context.organizationId), eq(articleSites.siteId, context.siteId), eq(articleSites.state, 'published'), eq(articleSites.active, true), eq(articles.status, 'active'), isNotNull(articleSites.publishedAt)];
      // Sindikasi penuh: satu artikel kanonis tayang di portal mana pun yang diberi assignment,
      // lintas region sekalipun. Region artikel adalah kanal asal/atribusi, bukan kunci tampil.
      if (query.articleSlug !== undefined) conditions.push(eq(articles.slug, query.articleSlug));
      if (query.categorySlug !== undefined) conditions.push(eq(categories.slug, query.categorySlug));
      if (query.tag !== undefined) conditions.push(sql`${articles.tags} @> ARRAY[${query.tag}]::text[]`);
      if (query.search !== undefined) conditions.push(or(sql`${articles.title} ILIKE ${`%${query.search}%`}`, sql`${articles.body} ILIKE ${`%${query.search}%`}`)!);
      const customMedia = aliasedTable(media, 'custom_media');
       const rows = await transaction.select({ id: articles.id, slug: articles.slug, title: articles.title, body: articles.body, tags: articles.tags, regionId: articles.regionId, categoryId: articles.categoryId, categorySlug: categories.slug, categoryName: categories.name, authorName: authors.byline, authorDisplayName: authors.displayName, authorBio: authors.bio, authorAvatarUrl: authors.avatarUrl, publisherName: publishers.name, attribution: publishers.attributionLabel, publisherLogoUrl: sql<string | null>`(${publishers.contacts}->>'logoUrl')`, publisherCity: sql<string | null>`(${publishers.contacts}->>'city')`, publisherType: publishers.type, publisherVerification: publishers.verificationStatus, publishedAt: articleSites.publishedAt, updatedAt: articles.updatedAt, leadMediaId: articles.leadMediaId, coverImageUrl: articles.coverImageUrl, mediaState: media.state, leadThumbKey: media.thumbObjectKey, customTitle: articleSites.customTitle, customDescription: articleSites.customDescription, customImageMediaId: customMedia.id, customThumbKey: customMedia.thumbObjectKey, affiliationInstitution: officialAffiliations.institutionName, articleSiteId: articleSites.id, viewCount: articleSites.viewCount })
        .from(articleSites).innerJoin(articles, and(eq(articles.organizationId, articleSites.organizationId), eq(articles.id, articleSites.articleId)))
        .leftJoin(categories, and(eq(categories.organizationId, articles.organizationId), eq(categories.id, articles.categoryId), eq(categories.status, 'active')))
        .leftJoin(authors, and(eq(authors.organizationId, articles.organizationId), eq(authors.id, articles.authorId), eq(authors.status, 'active')))
        .leftJoin(publishers, and(eq(publishers.organizationId, articles.organizationId), eq(publishers.id, articles.publisherId), eq(publishers.status, 'active')))
        .leftJoin(media, and(eq(media.organizationId, articles.organizationId), eq(media.id, articles.leadMediaId), eq(media.state, 'active')))
        .leftJoin(customMedia, and(eq(customMedia.organizationId, articles.organizationId), eq(customMedia.id, articleSites.customImageMediaId), eq(customMedia.state, 'active')))
        .leftJoin(officialAffiliations, and(eq(officialAffiliations.organizationId, articles.organizationId), eq(officialAffiliations.publisherId, articles.publisherId), eq(officialAffiliations.siteId, context.siteId), eq(officialAffiliations.active, true), isNotNull(officialAffiliations.verifiedAt), sql`${officialAffiliations.claimScopes} @> ARRAY['site_name']::text[]`))
        .where(and(...conditions)).orderBy(sql`${articleSites.publishedAt} DESC`).limit(query.articleSlug === undefined ? 100 : 2);
      const galleryByArticle = new Map<string, { url: string; thumbnailUrl: string | null }[]>();
      if (rows.length > 0) {
        const galleryRows = await transaction.select({ articleId: media.articleId, id: media.id, thumbObjectKey: media.thumbObjectKey })
          .from(media)
          .where(and(eq(media.organizationId, context.organizationId), inArray(media.articleId, [...new Set(rows.map((row) => row.id))]), eq(media.state, 'active'), sql`${media.mediaType} LIKE 'image/%'`))
          .orderBy(media.createdAt);
        for (const galleryRow of galleryRows) {
          if (galleryRow.articleId === null) continue;
          const url = absoluteMediaUrl(context, galleryRow.id);
          const list = galleryByArticle.get(galleryRow.articleId) ?? [];
          list.push({ url, thumbnailUrl: galleryRow.thumbObjectKey === null ? null : `${url}?variant=thumb` });
          galleryByArticle.set(galleryRow.articleId, list);
        }
      }

      if (logoMediaId === null) return null;
      return {
        context,
        regionName: settings.regionName,
        settings: {
          name: settings.name, description: settings.description,
          seoDefaultTitle: settings.seoDefaultTitle, seoDefaultDescription: settings.seoDefaultDescription,
          seoSiteName: settings.seoOpenGraphSiteName, locale: settings.locale,
          colors: settings.colors, socialLinks: settings.socialLinks,
          navigation: settings.navigation.map((item) => ({ label: String(item.label ?? ''), path: String(item.path ?? '/') })),
          logoUrl: absoluteMediaUrl(context, logoMediaId),
          faviconUrl: faviconMediaId === null ? null : absoluteMediaUrl(context, faviconMediaId),
          defaultImageUrl: settings.defaultMediaId === null ? absoluteDefaultAssetUrl(context, this.defaultImageUrl) : absoluteMediaUrl(context, settings.defaultMediaId),
          robots: Array.isArray(settings.seo.robots) ? settings.seo.robots.map(String) : [],
        },
        articles: rows.filter((row) => row.publishedAt !== null).map((row) => ({ id: row.id, slug: row.slug, title: row.customTitle ?? row.title, description: row.customDescription ?? excerptForDescription(articleBodyText(row.body), 180), body: row.body, gallery: galleryByArticle.get(row.id) ?? [], tags: [...row.tags], regionId: row.regionId, categoryId: row.categoryId, categorySlug: row.categorySlug, categoryName: row.categoryName, authorName: row.authorName, authorDisplayName: row.authorDisplayName, authorBio: row.authorBio, authorAvatarUrl: row.authorAvatarUrl, publisherName: row.publisherName, attribution: row.attribution ?? row.publisherName ?? 'Redaksi', publisherLogoUrl: row.publisherLogoUrl, publisherCity: row.publisherCity, publisherVerified: row.publisherVerification === 'verified', independent: row.publisherType === 'independent_publisher', officialInstitution: row.publisherVerification === 'verified' ? row.affiliationInstitution : null, publishedAt: iso(row.publishedAt!), updatedAt: iso(row.updatedAt), articleSiteId: row.articleSiteId, viewCount: row.viewCount, imageUrl: row.customImageMediaId !== null ? absoluteMediaUrl(context, row.customImageMediaId) : row.leadMediaId !== null && row.mediaState === 'active' ? absoluteMediaUrl(context, row.leadMediaId) : row.coverImageUrl, thumbnailUrl: row.customImageMediaId !== null ? (row.customThumbKey === null ? null : `${absoluteMediaUrl(context, row.customImageMediaId)}?variant=thumb`) : row.leadMediaId !== null && row.mediaState === 'active' ? (row.leadThumbKey === null ? null : `${absoluteMediaUrl(context, row.leadMediaId)}?variant=thumb`) : null, imageWidth: null, imageHeight: null })),
      };
    });
  }

  async loadSiteRobots(context: ResolvedSiteContext): Promise<readonly string[] | null> {
    return this.database.transaction(async (transaction) => {
      await this.publicTenant(transaction, context);
      const rows = await transaction.select({ seo: siteSettings.seo })
        .from(sites)
        .innerJoin(domains, and(eq(domains.organizationId, sites.organizationId), eq(domains.id, sites.domainId), eq(domains.status, 'active')))
        .leftJoin(regions, and(eq(regions.organizationId, sites.organizationId), eq(regions.id, sites.regionId)))
        .innerJoin(siteSettings, and(eq(siteSettings.organizationId, sites.organizationId), eq(siteSettings.siteId, sites.id)))
        .where(and(eq(sites.organizationId, context.organizationId), eq(sites.id, context.siteId), eq(sites.normalizedHostname, context.normalizedHostname), eq(sites.status, 'active'), eq(sites.activationState, 'active'), eq(sites.routingVersion, context.routingVersion), eq(sites.contentVersion, context.contentVersion), or(sql`${sites.regionId} IS NULL`, eq(regions.status, 'active')))).limit(1);
      const row = rows[0];
      if (row === undefined) return null;
      const robots = (row.seo as Record<string, unknown>)['robots'];
      return Array.isArray(robots) ? robots.map(String) : [];
    });
  }

  async loadSiteCategories(context: ResolvedSiteContext): Promise<readonly { slug: string; name: string }[]> {    return this.database.transaction(async (transaction) => {
      await this.publicTenant(transaction, context);
      const rows = await transaction.select({ slug: categories.slug, name: categories.name })
        .from(categories)
        .where(and(eq(categories.organizationId, context.organizationId), eq(categories.status, 'active')))
        .orderBy(sql`${categories.name} ASC`);
      return rows.map((row) => ({ slug: row.slug, name: row.name }));
    });
  }

  async isCacheBypassed(context: ResolvedSiteContext): Promise<boolean> {
    return this.database.transaction(async (transaction) => {
      await this.publicTenant(transaction, context);
      const rows = await transaction.select({ bypass: cacheBypasses.bypass }).from(cacheBypasses).where(and(eq(cacheBypasses.organizationId, context.organizationId), eq(cacheBypasses.siteId, context.siteId))).limit(1);
      return rows[0]?.bypass === true;
    });
  }

  async beginActivation(actor: AuthorizedTenantActorContext, siteId: string, hostname: string, previousHostname: string | null, now: string): Promise<ActivationAttempt> {
    return this.database.transaction(async (transaction) => {
      await this.tenant(transaction, actor);
      const existing = await transaction.select().from(domainActivationAttempts).where(and(eq(domainActivationAttempts.organizationId, actor.organizationId), eq(domainActivationAttempts.siteId, siteId), eq(domainActivationAttempts.operation, 'activate'), inArray(domainActivationAttempts.status, ['pending', 'processing']))).orderBy(sql`${domainActivationAttempts.createdAt} DESC`).limit(1);
      if (existing[0] !== undefined) {
        if (existing[0].hostname !== hostname) throw new DeliveryConflictError('Another hostname activation is pending');
        return this.mapAttempt(existing[0]);
      }
      const rows = await transaction.select({ site: sites, domain: domains, region: regions }).from(sites).innerJoin(domains, and(eq(domains.organizationId, sites.organizationId), eq(domains.id, sites.domainId))).leftJoin(regions, and(eq(regions.organizationId, sites.organizationId), eq(regions.id, sites.regionId))).where(and(eq(sites.organizationId, actor.organizationId), eq(sites.id, siteId))).limit(1).for('update', { of: sites });
      const row = rows[0]; if (row === undefined || row.domain.status !== 'active' || (row.site.regionId !== null && row.region?.status !== 'active')) throw new DeliveryResourceUnavailableError();
      if (previousHostname !== null) {
        const ownership = await transaction.execute<{ owned: boolean }>(sql`
          SELECT indicate_private.is_delivery_previous_host_owned(
            ${actor.organizationId}::uuid, ${siteId}::uuid, ${previousHostname}
          ) AS owned
        `);
        if (ownership[0]?.owned !== true) throw new DeliveryConflictError('Previous hostname is not owned by Site');
      }
      const expected = row.region === null ? row.domain.normalizedHostname : `${row.region.slug}.${row.domain.normalizedHostname}`;
      if (expected !== hostname || row.site.normalizedHostname !== hostname) throw new DeliveryConflictError('Invalid exact Site hostname');
      const duplicates = await transaction.select({ id: sites.id }).from(sites).where(and(eq(sites.normalizedHostname, hostname), sql`${sites.id} <> ${siteId}`)).limit(1);
      if (duplicates.length > 0) throw new DeliveryConflictError('Hostname already mapped');
      const id = crypto.randomUUID(); const date = new Date(now);
      await transaction.update(sites).set({ activationState: 'pending', status: 'inactive', updatedAt: date, version: row.site.version + 1 }).where(and(eq(sites.organizationId, actor.organizationId), eq(sites.id, siteId)));
      await transaction.insert(domainActivationAttempts).values({ organizationId: actor.organizationId, id, siteId, hostname, previousHostname, operation: 'activate', activationState: 'pending', status: 'pending', nextAttemptAt: date, externalStatus: {}, createdAt: date, updatedAt: date });
      await transaction.insert(auditLogs).values({ organizationId: actor.organizationId, id: crypto.randomUUID(), actorType: actor.actorType, actorId: actor.actorId, entryPoint: actor.entryPoint, action: 'site.activation.request', targetType: 'site', targetId: siteId, outcome: 'succeeded', changedFields: ['activationState'], after: { hostname, previousHostname, activationState: 'pending' }, requestId: actor.requestId, occurredAt: date });
      return this.mapAttempt((await transaction.select().from(domainActivationAttempts).where(and(eq(domainActivationAttempts.organizationId, actor.organizationId), eq(domainActivationAttempts.id, id))).limit(1))[0]!);
    });
  }

  private mapAttempt(row: typeof domainActivationAttempts.$inferSelect): ActivationAttempt {
    return { id: row.id, organizationId: row.organizationId, siteId: row.siteId, hostname: row.hostname, previousHostname: row.previousHostname, operation: row.operation, activationState: row.activationState as ActivationAttempt['activationState'], status: row.status, attempts: row.attempts, nextAttemptAt: iso(row.nextAttemptAt), claimToken: row.reconciliationClaimToken, claimExpiresAt: row.reconciliationClaimExpiresAt === null ? null : iso(row.reconciliationClaimExpiresAt), externalStatus: row.externalStatus };
  }

  async updateActivation(actor: AuthorizedTenantActorContext, attemptId: string, activationState: ActivationAttempt['activationState'], externalStatus: Readonly<Record<string, unknown>>, now: string): Promise<ActivationAttempt> {
    return this.database.transaction(async (transaction) => {
      await this.tenant(transaction, actor);
      const rows = await transaction.update(domainActivationAttempts).set({ activationState, status: activationState === 'completed' ? 'completed' : 'processing', externalStatus: { ...externalStatus }, sanitizedFailure: null, updatedAt: new Date(now) }).where(and(eq(domainActivationAttempts.organizationId, actor.organizationId), eq(domainActivationAttempts.id, attemptId), inArray(domainActivationAttempts.status, ['pending', 'processing']), actor.entryPoint === 'reconciler' ? and(eq(domainActivationAttempts.reconciliationClaimToken, actor.requestId), gt(domainActivationAttempts.reconciliationClaimExpiresAt, new Date(now))) : undefined)).returning();
      if (rows[0] === undefined) throw new DeliveryResourceUnavailableError(); return this.mapAttempt(rows[0]);
    });
  }

  async failActivation(actor: AuthorizedTenantActorContext, attemptId: string, failure: Readonly<Record<string, unknown>>, nextAttemptAt: string, terminal: boolean, now: string): Promise<ActivationAttempt> {
    return this.database.transaction(async (transaction) => {
      await this.tenant(transaction, actor);
      const rows = await transaction.update(domainActivationAttempts).set({ status: terminal ? 'failed' : 'pending', activationState: terminal ? 'failed' : undefined, attempts: sql`${domainActivationAttempts.attempts} + 1`, nextAttemptAt: new Date(nextAttemptAt), reconciliationClaimToken: null, reconciliationClaimExpiresAt: null, sanitizedFailure: { ...failure }, updatedAt: new Date(now) }).where(and(eq(domainActivationAttempts.organizationId, actor.organizationId), eq(domainActivationAttempts.id, attemptId), inArray(domainActivationAttempts.status, ['pending', 'processing']), actor.entryPoint === 'reconciler' ? and(eq(domainActivationAttempts.reconciliationClaimToken, actor.requestId), gt(domainActivationAttempts.reconciliationClaimExpiresAt, new Date(now))) : undefined)).returning();
      if (rows[0] === undefined) throw new DeliveryResourceUnavailableError();
      if (terminal && rows[0].operation === 'activate') await transaction.update(sites).set({ activationState: 'failed', status: 'inactive', updatedAt: new Date(now), version: sql`${sites.version} + 1` }).where(and(eq(sites.organizationId, actor.organizationId), eq(sites.id, rows[0].siteId)));
      return this.mapAttempt(rows[0]);
    });
  }

  async claimActivationAttempts(now: string, limit: number, claimToken: string, claimExpiresAt: string): Promise<readonly ActivationAttempt[]> {
    const rows = await this.database.execute<typeof domainActivationAttempts.$inferSelect>(sql`
      SELECT
        organization_id AS "organizationId", id, site_id AS "siteId", hostname,
        previous_hostname AS "previousHostname", operation, activation_state AS "activationState", status, attempts,
        next_attempt_at AS "nextAttemptAt",
        reconciliation_claim_token AS "reconciliationClaimToken",
        reconciliation_claim_expires_at AS "reconciliationClaimExpiresAt",
        sanitized_failure AS "sanitizedFailure", external_status AS "externalStatus",
        created_at AS "createdAt", updated_at AS "updatedAt"
      FROM indicate_private.claim_delivery_activation_attempts(
        ${now}::timestamptz, ${limit}, ${claimToken}::uuid, ${claimExpiresAt}::timestamptz
      )
    `);
    return [...rows].map((row) => this.mapAttempt(row));
  }

  private taskValues(plan: InvalidationPlan, now: string) { return { organizationId: plan.organizationId, id: crypto.randomUUID(), siteId: plan.siteId, previousHostname: plan.previousHostname, currentHostname: plan.currentHostname, tags: [...plan.tags], paths: [...plan.paths], urls: [...plan.urls], reason: plan.reason, status: 'pending' as const, attempts: 0, nextAttemptAt: new Date(now), createdAt: new Date(now), updatedAt: new Date(now) }; }

  async completeActivation(actor: AuthorizedTenantActorContext, attemptId: string, plan: InvalidationPlan, now: string): Promise<ResolvedSiteContext> {
    return this.database.transaction(async (transaction) => {
      await this.tenant(transaction, actor);
      const attempts = await transaction.select().from(domainActivationAttempts).where(and(eq(domainActivationAttempts.organizationId, actor.organizationId), eq(domainActivationAttempts.id, attemptId), eq(domainActivationAttempts.operation, 'activate'), actor.entryPoint === 'reconciler' ? and(eq(domainActivationAttempts.reconciliationClaimToken, actor.requestId), gt(domainActivationAttempts.reconciliationClaimExpiresAt, new Date(now))) : undefined)).limit(1).for('update');
      const attempt = attempts[0]; if (attempt === undefined || attempt.activationState !== 'probe_verified') throw new DeliveryConflictError();
      const activated = await transaction.update(sites).set({ status: 'active', activationState: 'active', routingVersion: sql`${sites.routingVersion} + 1`, version: sql`${sites.version} + 1`, updatedAt: new Date(now) }).where(and(eq(sites.organizationId, actor.organizationId), eq(sites.id, attempt.siteId), eq(sites.normalizedHostname, attempt.hostname))).returning();
      const site = activated[0]; if (site === undefined) throw new DeliveryResourceUnavailableError();
      await transaction.update(domainActivationAttempts).set({ activationState: 'completed', status: 'completed', reconciliationClaimToken: null, reconciliationClaimExpiresAt: null, updatedAt: new Date(now) }).where(and(eq(domainActivationAttempts.organizationId, actor.organizationId), eq(domainActivationAttempts.id, attemptId)));
      await transaction.insert(invalidationTasks).values(this.taskValues(plan, now));
      await transaction.insert(auditLogs).values({ organizationId: actor.organizationId, id: crypto.randomUUID(), actorType: actor.actorType, actorId: actor.actorId, entryPoint: actor.entryPoint, action: 'site.activation.complete', targetType: 'site', targetId: site.id, outcome: 'succeeded', changedFields: ['status', 'activationState', 'routingVersion'], after: { hostname: site.normalizedHostname, previousHostname: attempt.previousHostname, status: 'active' }, requestId: actor.requestId, occurredAt: new Date(now) });
      return { normalizedHostname: site.normalizedHostname, organizationId: site.organizationId, domainId: site.domainId, siteId: site.id, regionId: site.regionId, routingVersion: site.routingVersion, contentVersion: site.contentVersion };
    });
  }

  async deactivateSite(actor: AuthorizedTenantActorContext, siteId: string, hostname: string, plan: InvalidationPlan, now: string): Promise<ActivationAttempt> {
    return this.database.transaction(async (transaction) => {
      await this.tenant(transaction, actor);
      const existing = await transaction.select().from(domainActivationAttempts).where(and(eq(domainActivationAttempts.organizationId, actor.organizationId), eq(domainActivationAttempts.siteId, siteId), eq(domainActivationAttempts.operation, 'deactivate'), inArray(domainActivationAttempts.status, ['pending', 'processing']))).orderBy(sql`${domainActivationAttempts.createdAt} DESC`).limit(1);
      if (existing[0] !== undefined) return this.mapAttempt(existing[0]);
      const changed = await transaction.update(sites).set({ status: 'inactive', activationState: 'inactive', routingVersion: sql`${sites.routingVersion} + 1`, version: sql`${sites.version} + 1`, updatedAt: new Date(now) }).where(and(eq(sites.organizationId, actor.organizationId), eq(sites.id, siteId), eq(sites.normalizedHostname, hostname), eq(sites.status, 'active'))).returning({ id: sites.id });
      if (changed.length !== 1) throw new DeliveryResourceUnavailableError();
      const id = crypto.randomUUID();
      await transaction.insert(domainActivationAttempts).values({ organizationId: actor.organizationId, id, siteId, hostname, previousHostname: hostname, operation: 'deactivate', activationState: 'deactivating', status: 'pending', nextAttemptAt: new Date(now), externalStatus: {}, createdAt: new Date(now), updatedAt: new Date(now) });
      await transaction.insert(invalidationTasks).values(this.taskValues(plan, now));
      await transaction.insert(auditLogs).values({ organizationId: actor.organizationId, id: crypto.randomUUID(), actorType: actor.actorType, actorId: actor.actorId, entryPoint: actor.entryPoint, action: 'site.deactivate', targetType: 'site', targetId: siteId, outcome: 'succeeded', changedFields: ['status', 'activationState', 'routingVersion'], after: { status: 'inactive', cleanup: 'pending' }, requestId: actor.requestId, occurredAt: new Date(now) });
      return this.mapAttempt((await transaction.select().from(domainActivationAttempts).where(and(eq(domainActivationAttempts.organizationId, actor.organizationId), eq(domainActivationAttempts.id, id))).limit(1))[0]!);
    });
  }

  async completeDeactivation(actor: AuthorizedTenantActorContext, attemptId: string, now: string): Promise<void> {
    await this.database.transaction(async (transaction) => {
      await this.tenant(transaction, actor);
      const rows = await transaction.update(domainActivationAttempts).set({ activationState: 'completed', status: 'completed', reconciliationClaimToken: null, reconciliationClaimExpiresAt: null, sanitizedFailure: null, updatedAt: new Date(now) }).where(and(eq(domainActivationAttempts.organizationId, actor.organizationId), eq(domainActivationAttempts.id, attemptId), eq(domainActivationAttempts.operation, 'deactivate'), eq(domainActivationAttempts.activationState, 'deactivating'), inArray(domainActivationAttempts.status, ['pending', 'processing']), actor.entryPoint === 'reconciler' ? and(eq(domainActivationAttempts.reconciliationClaimToken, actor.requestId), gt(domainActivationAttempts.reconciliationClaimExpiresAt, new Date(now))) : undefined)).returning({ id: domainActivationAttempts.id });
      if (rows.length !== 1) throw new DeliveryResourceUnavailableError();
    });
  }

  async createInvalidation(plan: InvalidationPlan, now: string): Promise<InvalidationTask> {
    const value = this.taskValues(plan, now);
    await this.database.transaction(async (transaction) => {
      await transaction.execute(sql`SELECT indicate_private.set_tenant_context(${plan.organizationId}::uuid, ${'system:invalidation-scheduler'}, ${crypto.randomUUID()})`);
      const rows = await transaction.insert(invalidationTasks).values(value).returning({ id: invalidationTasks.id });
      if (rows.length !== 1) throw new DeliveryResourceUnavailableError();
    });
    return { ...plan, id: value.id, attempts: 0, nextAttemptAt: now, status: 'pending', claimToken: null, claimExpiresAt: null, sanitizedFailure: null };
  }
  private mapTask(row: typeof invalidationTasks.$inferSelect): InvalidationTask { return { id: row.id, organizationId: row.organizationId, siteId: row.siteId, previousHostname: row.previousHostname, currentHostname: row.currentHostname, tags: row.tags, paths: row.paths, urls: row.urls, reason: row.reason, attempts: row.attempts, nextAttemptAt: iso(row.nextAttemptAt), status: row.status, claimToken: row.reconciliationClaimToken, claimExpiresAt: row.reconciliationClaimExpiresAt === null ? null : iso(row.reconciliationClaimExpiresAt), sanitizedFailure: row.sanitizedFailure ?? null }; }
  async claimInvalidations(now: string, limit: number): Promise<readonly InvalidationTask[]> {
    const token = crypto.randomUUID();
    const claimExpiresAt = new Date(Date.parse(now) + 30_000).toISOString();
    const rows = await this.database.execute<typeof invalidationTasks.$inferSelect>(sql`
      SELECT
        organization_id AS "organizationId", id, site_id AS "siteId",
        previous_hostname AS "previousHostname", current_hostname AS "currentHostname",
        tags, paths, urls, reason, attempts, next_attempt_at AS "nextAttemptAt", status,
        reconciliation_claim_token AS "reconciliationClaimToken",
        reconciliation_claim_expires_at AS "reconciliationClaimExpiresAt",
        sanitized_failure AS "sanitizedFailure"
      FROM indicate_private.claim_delivery_invalidation_tasks(
        ${now}::timestamptz, ${limit}, ${token}::uuid, ${claimExpiresAt}::timestamptz
      )
    `);
    return [...rows].map((row) => this.mapTask(row));
  }
  async completeInvalidation(task: InvalidationTask, now: string): Promise<void> { if (task.claimToken === null) throw new DeliveryConflictError('missing_claim'); const rows = await this.database.execute<{ completed: boolean }>(sql`SELECT indicate_private.complete_delivery_invalidation(${task.organizationId}::uuid, ${task.id}::uuid, ${task.claimToken}::uuid, ${now}::timestamptz) AS completed`); if (rows[0]?.completed !== true) throw new DeliveryConflictError('stale_claim'); }
  async failInvalidation(task: InvalidationTask, failure: Readonly<Record<string, unknown>>, nextAttemptAt: string, terminal: boolean, now: string): Promise<void> { if (task.claimToken === null) throw new DeliveryConflictError('missing_claim'); const rows = await this.database.execute<{ failed: boolean }>(sql`SELECT indicate_private.fail_delivery_invalidation(${task.organizationId}::uuid, ${task.id}::uuid, ${task.claimToken}::uuid, ${JSON.stringify(failure)}::jsonb, ${nextAttemptAt}::timestamptz, ${terminal}, ${now}::timestamptz) AS failed`); if (rows[0]?.failed !== true) throw new DeliveryConflictError('stale_claim'); }
}
