import { aliasedTable, and, desc, eq, gt, inArray, isNotNull, notInArray, or, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import type { AuthorizedTenantActorContext } from '@/core/operation-context';
import type { ActivationAttempt, ArticleListItem, FeedArticle, InvalidationPlan, InvalidationTask, NetworkContentQuery, NetworkSiteData, ResolvedSiteContext } from '@/modules/delivery/models';
import { DEFAULT_PUBLISHER_BIO } from '@/modules/delivery/models';
import { articleBodyText } from '@/modules/site/article-markup';
import { youtubeThumbnailUrl } from '@/modules/site/article-type';
import { isTipTapDoc, extractTipTapImages, tiptapToText } from '@/modules/site/tiptap-document';
import { pickPublisherSocials } from '@/modules/site/company-contact';
import { isPublicObjectKey } from '@/modules/publishing/object-key';
import { parseTenantAdOverrides, safeTemplateId } from '@/modules/ads/config';
import { mapPlacementRows, mapTenantAdRows } from '@/modules/ads/db-mapping';
import { DeliveryConflictError, DeliveryResourceUnavailableError, type DeliveryRepository, type PublicBundle, type SiteCategory } from '@/modules/delivery/ports';
import { sqlStringArray } from '@/data/repos/shared/sql-array';
import { articleSites, articleUpdates, articles, adCreatives, adPlacements, adSlots, auditLogs, authors, cacheBypasses, campaigns, categories, domainActivationAttempts, domains, invalidationTasks, media, officialAffiliations, portalAssignments, publishers, regions, sites, siteSettings, tenantAdSettings } from '@/data/schema';
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

/**
 * Build the site ids whose published articles a portal serves.
 *
 * @param context - Resolved tenant hostname context.
 * @returns SQL subquery yielding the portal plus every transitive descendant.
 *
 * @remarks A city portal owns its rows, so its lineage is itself alone and an
 * apex assignment can never leak downward. A region or apex portal only
 * aggregates its own subtree, so one assignment at a city reaches every ancestor
 * without a second `article_sites` row. Inlined as a subquery to hold the read at
 * a single round trip; `sites_parent_idx` walks at most 33 rows per domain.
 */
function lineageSiteIds(context: ResolvedSiteContext) {
  return sql`(with recursive lineage as (
    select ${sites.id} from ${sites}
    where ${sites.organizationId} = ${context.organizationId} and ${sites.id} = ${context.siteId}
    union all
    select child.id from ${sites} child join lineage parent on child.parent_site_id = parent.id
    where child.organization_id = ${context.organizationId}
  ) select id from lineage)`;
}

/**
 * Build the site ids whose bridge assignments a portal inherits.
 *
 * @param context - Resolved tenant hostname context.
 * @returns SQL subquery yielding the portal plus every transitive ancestor.
 * @remarks Mirror image of `lineageSiteIds`: a bridge assignment made on an
 * apex portal serves the apex itself and every descendant city, so a city
 * portal collects the assignments of its ancestors. Depth is at most 3
 * (apex -> region -> city).
 */
function ancestorSiteIds(context: ResolvedSiteContext) {
  return sql`(with recursive ancestry as (
    select ${sites.id}, ${sites.parentSiteId} from ${sites}
    where ${sites.organizationId} = ${context.organizationId} and ${sites.id} = ${context.siteId}
    union all
    select parent.id, parent.parent_site_id from ${sites} parent join ancestry child on parent.id = child.parent_site_id
    where parent.organization_id = ${context.organizationId}
  ) select id from ancestry)`;
}

/** One bridge assignment row as read for listings. */
export interface BridgeAssignmentRow {
  readonly id: string;
  readonly siteId: string;
  readonly sourceOrganizationId: string;
  readonly sourceArticleId: string;
  readonly publishedAt: Date;
}

/**
 * Collapse duplicate bridge rows for one article to a single display row.
 *
 * @param rows - Published assignment rows in listing scope, possibly holding
 * the same owner article on several portals of one lineage.
 * @param siteId - Portal rendering the listing; its own row wins ties.
 * @returns One row per owner article, preferring the rendering portal.
 * @remarks Listings union ancestors and descendants, so an article bridged
 * to both apex and city would otherwise render twice on each portal.
 */
export function dedupeBridgeAssignmentRows<T extends BridgeAssignmentRow>(rows: readonly T[], siteId: string): T[] {
  const byArticle = new Map<string, T>();
  for (const row of rows) {
    const key = `${row.sourceOrganizationId}:${row.sourceArticleId}`;
    const current = byArticle.get(key);
    if (current === undefined || (current.siteId !== siteId && row.siteId === siteId)) byArticle.set(key, row);
  }
  return [...byArticle.values()];
}

/** One row from `fetch_assigned_article_details`: public display columns only. */
type BridgeDetail = {
  readonly article_id: string;
  readonly slug: string;
  readonly title: string;
  readonly excerpt: string | null;
  readonly canonical_url: string | null;
  readonly tags: readonly string[];
  readonly status: string;
  readonly article_type: string;
  readonly is_sponsored: boolean;
  readonly video_url: string | null;
  readonly audio_url: string | null;
  readonly duration_seconds: number | null;
  readonly region_id: string | null;
  readonly category_slug: string | null;
  readonly category_name: string | null;
  readonly publisher_name: string | null;
  readonly attribution: string | null;
  readonly publisher_logo: string | null;
  readonly publisher_city: string | null;
  readonly publisher_bio: string | null;
  readonly publisher_verified: boolean;
  readonly publisher_type: string | null;
  readonly author_display: string | null;
  readonly author_bio: string | null;
  readonly author_avatar: string | null;
  readonly author_url: string | null;
  readonly cover_image_url: string | null;
  readonly published_at: Date | string;
  readonly updated_at: Date | string;
  readonly body: string;
  readonly body_json: unknown | null;
};

/** Bridge assignment joined to its fetched owner detail. */
interface BridgePair {
  readonly bridgeId: string;
  readonly siteId: string;
  readonly publishedAt: Date | string;
  readonly detail: BridgeDetail;
}

/**
 * Resolve the URL a listing must link to for an article visible on this portal.
 *
 * @param originHost - Hostname of the portal that owns the assignment.
 * @param context - Resolved tenant hostname context serving the page.
 * @param slug - Normalized article slug.
 * @returns Host-relative path on the origin, otherwise the origin's absolute URL.
 */
function originHref(originHost: string, context: ResolvedSiteContext, slug: string): string {
  return originHost === context.normalizedHostname ? `/${slug}` : `https://${originHost}/${slug}`;
}

/**
 * Map the stored per-copy robots enum onto the SEO document vocabulary.
 *
 * @param value - Stored `seo_robots_directive`, or null when the copy inherits the site default.
 * @returns Document directive, or null to inherit.
 */
function robotsDirectiveFor(value: 'index,follow' | 'noindex,nofollow' | null): 'index, follow' | 'noindex, nofollow' | null {
  if (value === 'noindex,nofollow') return 'noindex, nofollow';
  if (value === 'index,follow') return 'index, follow';
  return null;
}

/**
 * Normalize a bridge owner `article_type` into the delivery mode union.
 *
 * @param value - Raw owner type string from `fetch_assigned_article_details`.
 * @returns Known mode, or `standard` for unknown legacy values.
 */
function bridgeArticleType(value: string): ArticleListItem['type'] {
  return value === 'video' || value === 'gallery' || value === 'audio' || value === 'liveblog' || value === 'short' ? value : 'standard';
}

/**
 * Resolve the card byline for one article on the serving portal.
 *
 * @param raw - Joined attribution label, publisher name, or site fallback.
 * @param siteName - Display name of the portal serving the article.
 * @returns `Redaksi {siteName}` for the generic newsroom label, otherwise raw.
 */
export function resolvePublisherAttribution(raw: string, siteName: string): string {
  if (raw.trim().toLowerCase() !== 'redaksi') return raw;
  const site = siteName.trim();
  if (site === '') return raw;
  if (/^redaksi\b/iu.test(site)) return site;
  return `Redaksi ${site}`;
}

/**
 * Direct public URL for bytes living in the public bucket.
 *
 * @param publicHost - R2 custom domain, or null when public serving is off.
 * @param objectKey - Stored object key; only `pub/` keys qualify.
 * @returns Direct URL, or null to fall back to the signed media route.
 */
function publicMediaUrl(publicHost: string | null, objectKey: string | null): string | null {
  if (publicHost === null || objectKey === null || !isPublicObjectKey(objectKey)) return null;
  return `https://${publicHost}/${objectKey}`;
}

/**
 * Select the images a gallery should list on its own.
 *
 * @remarks The body already renders every image node in `bodyJson`, in place,
 * between the paragraphs around it. Listing those same nodes again in the
 * gallery therefore printed every inline image twice per article. The gallery
 * is for article-owned media that was never placed in the body, so anything
 * the body already shows is excluded.
 */
function galleryScope(articleId: string, referencedIds: readonly string[]) {
  const owned = eq(media.articleId, articleId);
  if (referencedIds.length === 0) return owned;
  return and(owned, notInArray(media.id, [...referencedIds]));
}

/**
 * Serve delivery reads and activation writes.
 *
 * @remarks Full syndication: one canonical article airs on any portal granted an assignment, even across regions. The article region is the origin/attribution channel, not a visibility key.
 */
export class DrizzleDeliveryRepository implements DeliveryRepository {
  constructor(private readonly database: Database, private readonly defaultImageUrl: string, private readonly publicHost: string | null = null) {}

  private async tenant(transaction: Transaction, actor: AuthorizedTenantActorContext): Promise<void> {
    if (!actor.permissionSet.has('sites.manage')) throw new DeliveryResourceUnavailableError();
    await transaction.execute(sql`SELECT indicate_private.set_tenant_context(${actor.organizationId}::uuid, ${actor.actorId}, ${actor.requestId})`);
    await transaction.execute(sql`SELECT indicate_private.set_region_context(${actor.regionScopeId ?? null}::uuid)`);
    if (actor.actorType === 'user') await transaction.execute(sql`SELECT indicate_private.set_verified_user_context(${actor.verifiedAuthUserId}::uuid)`);
  }

  private async publicTenant(transaction: Transaction, context: ResolvedSiteContext, requestId = crypto.randomUUID()): Promise<void> {
    await transaction.execute(sql`SELECT indicate_private.set_tenant_context(${context.organizationId}::uuid, ${`public:${context.siteId}`}, ${requestId})`);
  }

  /**
   * Find active sites by exact hostname.
   *
   * @param hostname - Exact hostname to resolve.
   * @returns Resolved site contexts with valid versions.
   * @remarks Fail closed fast: rows without a valid routing/content version are treated as unknown hosts (404) instead of exploding as UNDEFINED_VALUE deep inside query building (500 + wasted CPU).
   */
  async findActiveSitesByExactHostname(hostname: string): Promise<readonly ResolvedSiteContext[]> {
    const rows = await this.database.execute<{
      hostname: string; organization_id: string; domain_id: string; site_id: string;
      region_id: string | null; routing_version: number; content_version: number;
    }>(sql`SELECT * FROM indicate_private.discover_release_active_hosts(ARRAY[${hostname}])`);
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
      return this.readSite(transaction, context, query);
    });
  }

  async loadNetworkBundle(context: ResolvedSiteContext, query: NetworkContentQuery): Promise<PublicBundle> {
    return this.database.transaction(async (transaction) => {
      await this.publicTenant(transaction, context);
      const site = await this.readSite(transaction, context, query);
      const bypassed = await this.readBypassed(transaction, context);
      return { site, bypassed };
    });
  }

  private async readSettings(transaction: Transaction, context: ResolvedSiteContext) {
      const settingsRows = await transaction.select({ name: siteSettings.name, description: siteSettings.description, tagline: siteSettings.tagline, seoDefaultTitle: siteSettings.seoDefaultTitle, seoDefaultDescription: siteSettings.seoDefaultDescription, seoOpenGraphSiteName: siteSettings.seoOpenGraphSiteName, locale: siteSettings.locale, commentsEnabled: siteSettings.commentsEnabled, colors: siteSettings.colors, socialLinks: siteSettings.socialLinks, seo: siteSettings.seo, navigation: siteSettings.navigation, logoMediaId: siteSettings.logoMediaId, faviconMediaId: siteSettings.faviconMediaId, defaultMediaId: siteSettings.defaultMediaId, defaultMediaType: media.mediaType, defaultMediaWidth: media.widthPx, defaultMediaHeight: media.heightPx, regionName: regions.name, siteCreatedAt: sites.createdAt })
        .from(sites)
        .innerJoin(domains, and(eq(domains.organizationId, sites.organizationId), eq(domains.id, sites.domainId), eq(domains.status, 'active')))
        .leftJoin(regions, and(eq(regions.organizationId, sites.organizationId), eq(regions.id, sites.regionId)))
        .innerJoin(siteSettings, and(eq(siteSettings.organizationId, sites.organizationId), eq(siteSettings.siteId, sites.id)))
        .leftJoin(media, and(eq(media.organizationId, siteSettings.organizationId), eq(media.id, siteSettings.defaultMediaId)))
        .where(and(eq(sites.organizationId, context.organizationId), eq(sites.id, context.siteId), eq(sites.normalizedHostname, context.normalizedHostname), eq(sites.status, 'active'), eq(sites.activationState, 'active'), or(sql`${sites.regionId} IS NULL`, eq(regions.status, 'active')))).limit(1);
      const settings = settingsRows[0]; if (settings === undefined) return null;
      let logoMediaId = settings.logoMediaId;
      let faviconMediaId = settings.faviconMediaId;
      if (context.regionId !== null && (logoMediaId === null || faviconMediaId === null)) {
        const parentRows = await transaction.select({ logoMediaId: siteSettings.logoMediaId, faviconMediaId: siteSettings.faviconMediaId })
          .from(sites)
          .innerJoin(siteSettings, and(eq(siteSettings.organizationId, sites.organizationId), eq(siteSettings.siteId, sites.id)))
          .where(and(eq(sites.organizationId, context.organizationId), eq(sites.domainId, context.domainId), sql`${sites.siteLevel} = 'apex'`, eq(sites.status, 'active'), eq(sites.activationState, 'active'))).limit(1);
        const parent = parentRows[0];
        if (parent !== undefined) {
          if (logoMediaId === null) logoMediaId = parent.logoMediaId;
          if (faviconMediaId === null) faviconMediaId = parent.faviconMediaId;
        }
      }
      if (logoMediaId === null) return null;
      const templateId = safeTemplateId(settings.colors.templateId);
      const adSettingRows = await transaction.select({
        slotId: tenantAdSettings.slotId,
        enabled: tenantAdSettings.enabled,
        kind: adCreatives.kind,
        imageUrl: adCreatives.imageUrl,
        href: adCreatives.href,
        altText: adCreatives.altText,
        widthPx: adCreatives.widthPx,
        heightPx: adCreatives.heightPx,
        html: adCreatives.html,
        provider: adCreatives.provider,
        providerClientId: adCreatives.providerClientId,
        providerSlotId: adCreatives.providerSlotId,
      })
        .from(tenantAdSettings)
        .leftJoin(adCreatives, and(eq(adCreatives.organizationId, tenantAdSettings.organizationId), eq(adCreatives.id, tenantAdSettings.creativeId), eq(adCreatives.status, 'active')))
        .innerJoin(adSlots, and(eq(adSlots.id, tenantAdSettings.slotId), eq(adSlots.active, true)))
        .where(and(eq(tenantAdSettings.organizationId, context.organizationId), eq(tenantAdSettings.siteId, context.siteId)))
        .limit(32);
      const placementRows = await transaction.select({
        slotId: adPlacements.slotId,
        templateId: adPlacements.templateId,
        device: adPlacements.device,
        kind: adCreatives.kind,
        imageUrl: adCreatives.imageUrl,
        href: adCreatives.href,
        altText: adCreatives.altText,
        widthPx: adCreatives.widthPx,
        heightPx: adCreatives.heightPx,
        html: adCreatives.html,
        provider: adCreatives.provider,
        providerClientId: adCreatives.providerClientId,
        providerSlotId: adCreatives.providerSlotId,
      })
        .from(adPlacements)
        .innerJoin(campaigns, and(eq(campaigns.organizationId, adPlacements.organizationId), eq(campaigns.id, adPlacements.campaignId), eq(campaigns.status, 'active'), or(sql`${campaigns.startsAt} IS NULL`, sql`${campaigns.startsAt} <= now()`), or(sql`${campaigns.endsAt} IS NULL`, sql`${campaigns.endsAt} > now()`)))
        .innerJoin(adCreatives, and(eq(adCreatives.organizationId, adPlacements.organizationId), eq(adCreatives.id, adPlacements.creativeId), eq(adCreatives.status, 'active')))
        .innerJoin(adSlots, and(eq(adSlots.id, adPlacements.slotId), eq(adSlots.active, true)))
        .where(and(
          eq(adPlacements.organizationId, context.organizationId),
          or(eq(adPlacements.siteId, context.siteId), sql`${adPlacements.siteId} IS NULL`),
          eq(adPlacements.active, true),
          or(sql`${adPlacements.startsAt} IS NULL`, sql`${adPlacements.startsAt} <= now()`),
          or(sql`${adPlacements.endsAt} IS NULL`, sql`${adPlacements.endsAt} > now()`),
        ))
        .orderBy(sql`${adPlacements.priority} DESC`, adPlacements.createdAt)
        .limit(64);
      const toCreativeFields = (row: { readonly kind: string | null; readonly imageUrl: string | null; readonly href: string | null; readonly altText: string | null; readonly widthPx: number | null; readonly heightPx: number | null; readonly html: string | null; readonly provider: string | null; readonly providerClientId: string | null; readonly providerSlotId: string | null }) => ({
        kind: row.kind,
        imageUrl: row.imageUrl,
        href: row.href,
        altText: row.altText,
        widthPx: row.widthPx,
        heightPx: row.heightPx,
        html: row.html,
        provider: row.provider,
        providerClientId: row.providerClientId,
        providerSlotId: row.providerSlotId,
      });
      return {
        context,
        regionName: settings.regionName,
        siteCreatedAt: iso(settings.siteCreatedAt),
        settings: {
          name: settings.name, description: settings.description, tagline: settings.tagline,
          seoDefaultTitle: settings.seoDefaultTitle, seoDefaultDescription: settings.seoDefaultDescription,
          seoSiteName: settings.seoOpenGraphSiteName, locale: settings.locale,
          colors: settings.colors, socialLinks: settings.socialLinks,
          navigation: settings.navigation.map((item) => ({ label: String(item.label ?? ''), path: String(item.path ?? '/') })),
          logoUrl: `https://${context.normalizedHostname}/logo.png`,
          faviconUrl: faviconMediaId === null ? null : absoluteMediaUrl(context, faviconMediaId),
          defaultImageUrl: settings.defaultMediaId === null ? absoluteDefaultAssetUrl(context, this.defaultImageUrl) : absoluteMediaUrl(context, settings.defaultMediaId),
          defaultImageMediaType: settings.defaultMediaId === null ? null : settings.defaultMediaType,
          defaultImageWidth: settings.defaultMediaId === null ? null : settings.defaultMediaWidth,
          defaultImageHeight: settings.defaultMediaId === null ? null : settings.defaultMediaHeight,
          robots: Array.isArray(settings.seo.robots) ? settings.seo.robots.map(String) : [],
          commentsEnabled: settings.commentsEnabled,
          ads: {
            ...parseTenantAdOverrides(settings.seo),
            ...mapTenantAdRows(adSettingRows.map((row) => ({ slotId: row.slotId, enabled: row.enabled, creative: toCreativeFields(row) }))),
          },
          adCampaigns: templateId === null
            ? {}
            : mapPlacementRows(placementRows.map((row) => ({ slotId: row.slotId, templateId: row.templateId, device: row.device, creative: toCreativeFields(row) })), { templateId }),
        },
      };
  }

  /**
   * Site shell for branded 404s: settings without article/gallery queries.
   *
   * @remarks Bot probes to random paths pay no content queries; the branded 404
   * still renders with the tenant logo + name.
   */
  async loadSiteShell(context: ResolvedSiteContext): Promise<NetworkSiteData | null> {
    return this.database.transaction(async (transaction) => {
      await this.publicTenant(transaction, context);
      const shell = await this.readSettings(transaction, context);
      if (shell === null) return null;
      return { ...shell, articles: [] };
    });
  }

  async resolveBrandMediaId(context: ResolvedSiteContext, kind: 'logo' | 'favicon'): Promise<string | null> {
    return this.database.transaction(async (transaction) => {
      await this.publicTenant(transaction, context);
      const column = kind === 'logo' ? siteSettings.logoMediaId : siteSettings.faviconMediaId;
      const rows = await transaction.select({ mediaId: column })
        .from(sites)
        .innerJoin(siteSettings, and(eq(siteSettings.organizationId, sites.organizationId), eq(siteSettings.siteId, sites.id)))
        .where(and(eq(sites.organizationId, context.organizationId), eq(sites.id, context.siteId))).limit(1);
      const own = rows[0]?.mediaId ?? null;
      if (own !== null || context.regionId === null) return own;
      const parent = await transaction.select({ mediaId: column })
        .from(sites)
        .innerJoin(siteSettings, and(eq(siteSettings.organizationId, sites.organizationId), eq(siteSettings.siteId, sites.id)))
        .where(and(eq(sites.organizationId, context.organizationId), eq(sites.domainId, context.domainId), sql`${sites.siteLevel} = 'apex'`)).limit(1);
      return parent[0]?.mediaId ?? null;
    });
  }

  /**
   * Read published bridge assignments visible on this portal with owner details.
   *
   * @param transaction - Public tenant transaction (serving org context).
   * @param context - Resolved tenant hostname context serving the page.
   * @param query - Listing/detail filters mirrored from the local query.
   * @returns Assignment/detail pairs, newest first, capped for listings.
   * @remarks Listings union ancestor and descendant assignments, so a city
   * bridge surfaces on its apex and region while an apex bridge still fans
   * down to its cities; duplicates collapse to one row per owner article
   * preferring the rendering portal. A detail resolves only on the site
   * holding the assignment, mirroring the local one-article-one-URL rule.
   * Owner content arrives exclusively through the `SECURITY DEFINER`
   * `fetch_assigned_article_details` reader, grouped by owner org so one
   * portal with many institutions still costs one call per institution.
   */
  private async readBridgePairs(transaction: Transaction, context: ResolvedSiteContext, query: NetworkContentQuery): Promise<readonly BridgePair[]> {
    const siteScope = query.articleSlug === undefined
      ? sql`(${portalAssignments.siteId} in ${ancestorSiteIds(context)} OR ${portalAssignments.siteId} in ${lineageSiteIds(context)})`
      : eq(portalAssignments.siteId, context.siteId);
    const assignments = await transaction.select({
      id: portalAssignments.id,
      siteId: portalAssignments.siteId,
      sourceOrganizationId: portalAssignments.sourceOrganizationId,
      sourceArticleId: portalAssignments.sourceArticleId,
      publishedAt: portalAssignments.publishedAt,
    })
      .from(portalAssignments)
      .where(and(eq(portalAssignments.organizationId, context.organizationId), siteScope, eq(portalAssignments.state, 'published'), isNotNull(portalAssignments.publishedAt)))
      .orderBy(sql`${portalAssignments.publishedAt} DESC`)
      .limit(100);
    const usable = assignments.filter((row): row is typeof row & { readonly publishedAt: Date } => row.publishedAt !== null);
    if (usable.length === 0) return [];
    const displayable = dedupeBridgeAssignmentRows(usable, context.siteId);
    if (displayable.length === 0) return [];
    const byOwner = new Map<string, { readonly rows: typeof displayable; ids: string[] }>();
    for (const row of displayable) {
      const group = byOwner.get(row.sourceOrganizationId) ?? { rows: [], ids: [] as string[] };
      (group.rows as unknown[]).push(row);
      group.ids.push(row.sourceArticleId);
      byOwner.set(row.sourceOrganizationId, group);
    }
    const pairs: BridgePair[] = [];
    for (const [ownerOrg, group] of byOwner) {
      const details = await transaction.execute<BridgeDetail>(sql`
        SELECT * FROM indicate_private.fetch_assigned_article_details(
          ${ownerOrg}::uuid, ${sqlStringArray(group.ids)}::uuid[]
        )
      `);
      const byId = new Map([...details].map((detail) => [detail.article_id, detail]));
      for (const row of group.rows) {
        const detail = byId.get(row.sourceArticleId);
        if (detail === undefined) continue;
        if (query.articleSlug !== undefined && detail.slug !== query.articleSlug) continue;
        if (query.categorySlug !== undefined) continue;
        if (query.tag !== undefined && !detail.tags.includes(query.tag)) continue;
        if (query.search !== undefined) {
          const needle = query.search.toLowerCase();
          if (!detail.title.toLowerCase().includes(needle) && !detail.body.toLowerCase().includes(needle)) continue;
        }
        pairs.push({ bridgeId: row.id, siteId: row.siteId, publishedAt: row.publishedAt, detail });
      }
    }
    return pairs.sort((left, right) => new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime());
  }

  private async readSite(transaction: Transaction, context: ResolvedSiteContext, query: NetworkContentQuery): Promise<NetworkSiteData | null> {
      const shell = await this.readSettings(transaction, context);
      if (shell === null) return null;

      // An article detail is served only by the site that owns the assignment. Listings,
      // feeds and sitemaps stay on the lineage, so a region or apex keeps showing its
      // cities' articles and links to them, but the article URL on an ancestor does not
      // resolve: one article, one live URL, and that URL is the owning site's. `href` and
      // the canonical already point there, so the ancestor copy is pure duplicate.
      const scope = query.articleSlug === undefined
        ? sql`${articleSites.siteId} in ${lineageSiteIds(context)}`
        : eq(articleSites.siteId, context.siteId);
      const conditions = [eq(articles.organizationId, context.organizationId), eq(articleSites.organizationId, context.organizationId), scope, eq(articleSites.state, 'published'), eq(articleSites.active, true), eq(articles.status, 'active'), isNotNull(articleSites.publishedAt)];
      if (query.articleSlug !== undefined) conditions.push(eq(articles.slug, query.articleSlug));
      if (query.categorySlug !== undefined) conditions.push(eq(categories.slug, query.categorySlug));
      if (query.tag !== undefined) conditions.push(sql`${articles.tags} @> ARRAY[${query.tag}]::text[]`);
      if (query.search !== undefined) conditions.push(or(sql`${articles.title} ILIKE ${`%${query.search}%`}`, sql`${articles.body} ILIKE ${`%${query.search}%`}`)!);
      const customMedia = aliasedTable(media, 'custom_media');
      const originSite = aliasedTable(sites, 'origin_site');
       const rows = await transaction.select({ id: articles.id, slug: articles.slug, title: articles.title, excerpt: articles.excerpt, canonicalUrl: articles.canonicalUrl, originHost: originSite.normalizedHostname, tags: articles.tags, regionId: articles.regionId, categoryId: articles.categoryId, categorySlug: categories.slug, categoryName: categories.name, authorName: authors.byline, authorDisplayName: authors.displayName, authorBio: authors.bio, authorAvatarUrl: authors.avatarUrl, publisherName: publishers.name, attribution: publishers.attributionLabel, publisherLogoUrl: sql<string | null>`(${publishers.contacts}->>'logoUrl')`, publisherCity: sql<string | null>`(${publishers.contacts}->>'city')`, publisherBio: sql<string | null>`(${publishers.contacts}->>'bio')`, publisherContacts: publishers.contacts, publisherType: publishers.type, publisherVerification: publishers.verificationStatus, publishedAt: articleSites.publishedAt, updatedAt: articles.updatedAt, leadMediaId: articles.leadMediaId, leadMediaType: media.mediaType, leadObjectKey: media.objectKey, leadMediaWidth: media.widthPx, leadMediaHeight: media.heightPx, leadMediaFocalX: media.focalX, leadMediaFocalY: media.focalY, coverImageUrl: articles.coverImageUrl, type: articles.type, isSponsored: articles.isSponsored, videoUrl: articles.videoUrl, audioUrl: articles.audioUrl, durationSeconds: articles.durationSeconds, mediaState: media.state, leadThumbKey: media.thumbObjectKey, customTitle: articleSites.customTitle, customDescription: articleSites.customDescription, robotsDirective: articleSites.seoRobotsDirective, bodyExcerpt: sql<string | null>`CASE WHEN ${articleSites.customDescription} IS NULL THEN substring(${articles.body} from 1 for 600) ELSE NULL END`, customImageMediaId: customMedia.id, customMediaType: customMedia.mediaType, customObjectKey: customMedia.objectKey, customMediaWidth: customMedia.widthPx, customMediaHeight: customMedia.heightPx, customMediaFocalX: customMedia.focalX, customMediaFocalY: customMedia.focalY, customThumbKey: customMedia.thumbObjectKey, affiliationInstitution: officialAffiliations.institutionName, articleSiteId: articleSites.id, viewCount: articleSites.viewCount })
        .from(articleSites).innerJoin(articles, and(eq(articles.organizationId, articleSites.organizationId), eq(articles.id, articleSites.articleId)))
        .innerJoin(originSite, and(eq(originSite.organizationId, articleSites.organizationId), eq(originSite.id, articleSites.siteId)))
        .leftJoin(categories, and(eq(categories.organizationId, articles.organizationId), eq(categories.id, articles.categoryId), eq(categories.status, 'active')))
        .leftJoin(authors, and(eq(authors.organizationId, articles.organizationId), eq(authors.id, articles.authorId), eq(authors.status, 'active')))
        .leftJoin(publishers, and(eq(publishers.organizationId, articles.organizationId), eq(publishers.id, articles.publisherId), eq(publishers.status, 'active')))
        .leftJoin(media, and(eq(media.organizationId, articles.organizationId), eq(media.id, articles.leadMediaId), eq(media.state, 'active')))
        .leftJoin(customMedia, and(eq(customMedia.organizationId, articles.organizationId), eq(customMedia.id, articleSites.customImageMediaId), eq(customMedia.state, 'active')))
        .leftJoin(officialAffiliations, and(eq(officialAffiliations.organizationId, articles.organizationId), eq(officialAffiliations.publisherId, articles.publisherId), eq(officialAffiliations.siteId, articleSites.siteId), eq(officialAffiliations.active, true), isNotNull(officialAffiliations.verifiedAt), sql`${officialAffiliations.claimScopes} @> ARRAY['site_name']::text[]`))
        .where(and(...conditions)).orderBy(sql`${articleSites.publishedAt} DESC`).limit(query.articleSlug !== undefined ? 2 : query.search !== undefined ? 20 : 100);
      const detailTarget = query.articleSlug === undefined ? undefined : rows[0];
      let detailBody: string | null = null;
      let detailBodyJson: unknown | null = null;
      let detailGallery: readonly { readonly id: string; readonly url: string; readonly thumbnailUrl: string | null; readonly alt: string | null; readonly caption: string | null; readonly width: number | null; readonly height: number | null; readonly mediaType: string }[] = [];
      let detailUpdates: readonly { readonly id: string; readonly body: string; readonly publishedAt: string }[] = [];
      if (detailTarget !== undefined) {
        const bodyRows = await transaction.select({ body: articles.body, bodyJson: articles.bodyJson })
          .from(articles)
          .where(and(eq(articles.organizationId, context.organizationId), eq(articles.id, detailTarget.id), eq(articles.status, 'active')))
          .limit(1);
        detailBody = bodyRows[0]?.body ?? null;
        detailBodyJson = (bodyRows[0]?.bodyJson ?? null) as unknown | null;
        const galleryRows = await transaction.select({ id: media.id, objectKey: media.objectKey, thumbObjectKey: media.thumbObjectKey, altText: media.altText, caption: media.caption, widthPx: media.widthPx, heightPx: media.heightPx, mediaType: media.mediaType, sortOrder: media.sortOrder })
          .from(media)
          .where(and(eq(media.organizationId, context.organizationId), eq(media.state, 'active'), sql`${media.mediaType} LIKE 'image/%'`, galleryScope(detailTarget.id, isTipTapDoc(detailBodyJson) ? extractTipTapImages(detailBodyJson).map((image) => image.mediaId) : [])))
          .orderBy(media.sortOrder, media.createdAt);
        detailGallery = galleryRows.map((galleryRow) => {
          const url = publicMediaUrl(this.publicHost, galleryRow.objectKey) ?? absoluteMediaUrl(context, galleryRow.id);
          const thumbUrl = galleryRow.thumbObjectKey === null
            ? null
            : (publicMediaUrl(this.publicHost, galleryRow.thumbObjectKey) ?? `${absoluteMediaUrl(context, galleryRow.id)}?variant=thumb`);
          return { id: galleryRow.id, url, thumbnailUrl: thumbUrl, alt: galleryRow.altText, caption: galleryRow.caption, width: galleryRow.widthPx, height: galleryRow.heightPx, mediaType: galleryRow.mediaType };
        });
        if (detailTarget.type === 'liveblog') {
          const updateRows = await transaction.select({ id: articleUpdates.id, body: articleUpdates.body, publishedAt: articleUpdates.publishedAt, updatedAt: articleUpdates.updatedAt })
            .from(articleUpdates)
            .where(and(eq(articleUpdates.organizationId, context.organizationId), eq(articleUpdates.articleId, detailTarget.id)))
            .orderBy(desc(articleUpdates.publishedAt), desc(articleUpdates.sortOrder))
            .limit(100);
          detailUpdates = updateRows.map((row) => ({ id: row.id, body: row.body, publishedAt: iso(row.publishedAt ?? row.updatedAt) }));
        }
      }
      const settings = shell.settings;
      const bridgePairs = await this.readBridgePairs(transaction, context, query);
      const bridgeDetail = query.articleSlug === undefined || detailBody !== null
        ? null
        : (bridgePairs.find((pair) => pair.detail.slug === query.articleSlug) ?? null);
      const bridgeItems: ArticleListItem[] = bridgePairs.map((pair) => {
        const detail = pair.detail;
        const isBridgeDetail = bridgeDetail !== null && pair.bridgeId === bridgeDetail.bridgeId;
        const richText = isBridgeDetail && isTipTapDoc(detail.body_json) ? tiptapToText(detail.body_json) : '';
        const description = detail.excerpt ?? (richText !== '' ? excerptForDescription(richText, 180) : excerptForDescription(detail.body, 180));
        return {
          id: detail.article_id,
          slug: detail.slug,
          title: detail.title,
          description,
          href: `/${detail.slug}`,
          canonicalUrl: detail.canonical_url ?? null,
          robotsDirective: null,
          ...(isBridgeDetail
            ? { body: detail.body, bodyJson: isTipTapDoc(detail.body_json) ? detail.body_json : null, gallery: [] as const, updates: [] as const }
            : {}),
          tags: [...detail.tags],
          regionId: detail.region_id,
          categoryId: null,
          categorySlug: null,
          categoryName: null,
          authorName: null,
          authorDisplayName: detail.author_display,
          authorBio: detail.author_bio,
          authorAvatarUrl: detail.author_avatar,
          authorWebsiteUrl: detail.author_url ?? null,
          publisherName: detail.publisher_name,
          attribution: detail.attribution ?? detail.publisher_name ?? settings.name,
          publisherLogoUrl: detail.publisher_logo,
          publisherCity: detail.publisher_city,
          publisherBio: detail.publisher_bio ?? DEFAULT_PUBLISHER_BIO,
          publisherSocials: {},
          publisherVerified: detail.publisher_verified,
          independent: detail.publisher_type === 'independent_publisher',
          officialInstitution: detail.publisher_verified ? detail.publisher_name : null,
          publishedAt: iso(pair.publishedAt),
          updatedAt: iso(detail.updated_at),
          articleSiteId: pair.bridgeId,
          viewCount: 0,
          type: bridgeArticleType(detail.article_type),
          isSponsored: detail.is_sponsored,
          videoUrl: detail.video_url,
          audioUrl: detail.audio_url,
          durationSeconds: detail.duration_seconds,
          imageMediaType: null,
          imageUrl: detail.cover_image_url ?? (detail.article_type === 'video' ? youtubeThumbnailUrl(detail.video_url) : null),
          thumbnailUrl: null,
          imageWidth: null,
          imageHeight: null,
          imageFocalX: null,
          imageFocalY: null,
        };
      });
      const ownItems = rows.filter((row) => row.publishedAt !== null).map((row) => {
          const isDetail = detailTarget !== undefined && detailBody !== null && row.id === detailTarget.id;
          const richText = isDetail && isTipTapDoc(detailBodyJson) ? tiptapToText(detailBodyJson) : '';
          const description = row.customDescription ?? row.excerpt ?? (richText !== '' ? excerptForDescription(richText, 180) : excerptForDescription(articleBodyText(row.bodyExcerpt ?? ''), 180));
          return { id: row.id, slug: row.slug, title: row.customTitle ?? row.title, href: originHref(row.originHost, context, row.slug), canonicalUrl: row.canonicalUrl, robotsDirective: robotsDirectiveFor(row.robotsDirective), description, ...(isDetail ? { body: detailBody, bodyJson: isTipTapDoc(detailBodyJson) ? detailBodyJson : null, gallery: detailGallery, updates: detailUpdates } : {}), tags: [...row.tags], regionId: row.regionId, categoryId: row.categoryId, categorySlug: row.categorySlug, categoryName: row.categoryName, authorName: row.authorName, authorDisplayName: row.authorDisplayName, authorBio: row.authorBio, authorAvatarUrl: row.authorAvatarUrl, publisherName: row.publisherName, attribution: resolvePublisherAttribution(row.attribution ?? row.publisherName ?? settings.name, settings.name), publisherLogoUrl: row.publisherLogoUrl, publisherCity: row.publisherCity, publisherBio: row.publisherBio ?? DEFAULT_PUBLISHER_BIO, publisherSocials: pickPublisherSocials((row.publisherContacts ?? {}) as Readonly<Record<string, unknown>>), publisherVerified: row.publisherVerification === 'verified', independent: row.publisherType === 'independent_publisher', officialInstitution: row.publisherVerification === 'verified' ? row.affiliationInstitution : null, publishedAt: iso(row.publishedAt!), updatedAt: iso(row.updatedAt), articleSiteId: row.articleSiteId, viewCount: row.viewCount, imageMediaType: row.customImageMediaId !== null ? row.customMediaType : row.leadMediaId !== null && row.mediaState === 'active' ? row.leadMediaType : null, imageUrl: row.customImageMediaId !== null ? (publicMediaUrl(this.publicHost, row.customObjectKey) ?? absoluteMediaUrl(context, row.customImageMediaId)) : row.leadMediaId !== null && row.mediaState === 'active' ? (publicMediaUrl(this.publicHost, row.leadObjectKey) ?? absoluteMediaUrl(context, row.leadMediaId)) : (row.coverImageUrl ?? (row.type === 'video' ? youtubeThumbnailUrl(row.videoUrl) : null) ?? (isDetail && row.type === 'gallery' && detailGallery.length > 0 ? detailGallery[0]?.url ?? null : null)), thumbnailUrl: row.customImageMediaId !== null ? (publicMediaUrl(this.publicHost, row.customThumbKey) ?? (row.customThumbKey === null ? null : `${absoluteMediaUrl(context, row.customImageMediaId)}?variant=thumb`)) : row.leadMediaId !== null && row.mediaState === 'active' ? (publicMediaUrl(this.publicHost, row.leadThumbKey) ?? (row.leadThumbKey === null ? null : `${absoluteMediaUrl(context, row.leadMediaId)}?variant=thumb`)) : null, imageWidth: row.customImageMediaId !== null ? row.customMediaWidth : row.leadMediaId !== null && row.mediaState === 'active' ? row.leadMediaWidth : null, imageHeight: row.customImageMediaId !== null ? row.customMediaHeight : row.leadMediaId !== null && row.mediaState === 'active' ? row.leadMediaHeight : null, imageFocalX: row.customImageMediaId !== null ? row.customMediaFocalX : row.leadMediaId !== null && row.mediaState === 'active' ? row.leadMediaFocalX : null, imageFocalY: row.customImageMediaId !== null ? row.customMediaFocalY : row.leadMediaId !== null && row.mediaState === 'active' ? row.leadMediaFocalY : null, type: row.type, isSponsored: row.isSponsored, videoUrl: row.videoUrl, audioUrl: row.audioUrl, durationSeconds: row.durationSeconds };
        });
      const merged = [...ownItems, ...bridgeItems].sort(
        (left, right) => new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime(),
      );
      return {
        ...shell,
        articles: merged,
      };
  }

  /**
   * Read the channels one navigation renders, with the published-article count
   * each channel already has in this portal's lineage.
   *
   * @param transaction - Tenant transaction.
   * @param context - Resolved tenant hostname context.
   * @param limit - Maximum channels the caller renders.
   * @returns At most `limit` active categories ordered by name.
   * @remarks Bounded in SQL rather than in the caller. The operator organization
   * holds 64 active channels and every navigation renders six, so the previous
   * unbounded read shipped 58 unused rows out of the pooler on each fill.
   * @remarks The join is the same lineage scope the listing query uses
   * (`lineageSiteIds`, `published`, `active`, `published_at IS NOT NULL`), so
   * `articleCount` equals the number of rows `/categories/<slug>` actually
   * serves. A count computed any other way would let the page and the sitemap
   * disagree about whether a channel is indexable. Navigation ignores the count;
   * reading it costs one integer on a query this cache already runs.
   */
  private async readCategories(transaction: Transaction, context: ResolvedSiteContext, limit: number): Promise<readonly SiteCategory[]> {
      const rows = await transaction.select({
        slug: categories.slug,
        name: categories.name,
        articleCount: sql<number>`count(${articleSites.id})::int`,
        lastUpdatedAt: sql<Date | null>`max(${articles.updatedAt})`,
      })
        .from(categories)
        .leftJoin(articles, and(eq(articles.organizationId, categories.organizationId), eq(articles.categoryId, categories.id), eq(articles.status, 'active')))
        .leftJoin(articleSites, and(eq(articleSites.organizationId, categories.organizationId), eq(articleSites.articleId, articles.id), eq(articleSites.state, 'published'), eq(articleSites.active, true), isNotNull(articleSites.publishedAt), sql`${articleSites.siteId} in ${lineageSiteIds(context)}`))
        .where(and(eq(categories.organizationId, context.organizationId), eq(categories.status, 'active')))
        .groupBy(categories.slug, categories.name)
        .orderBy(sql`${categories.name} ASC`)
        .limit(limit);
      return rows.map((row) => ({ slug: row.slug, name: row.name, articleCount: row.articleCount, lastUpdatedAt: row.lastUpdatedAt === null ? null : iso(row.lastUpdatedAt) }));
  }

  private async readBypassed(transaction: Transaction, context: ResolvedSiteContext): Promise<boolean> {
      const rows = await transaction.select({ bypass: cacheBypasses.bypass }).from(cacheBypasses).where(and(eq(cacheBypasses.organizationId, context.organizationId), eq(cacheBypasses.siteId, context.siteId))).limit(1);
      return rows[0]?.bypass === true;
  }

  async loadSiteRobots(context: ResolvedSiteContext): Promise<readonly string[] | null> {
    return this.database.transaction(async (transaction) => {
      await this.publicTenant(transaction, context);
      const rows = await transaction.select({ seo: siteSettings.seo })
        .from(sites)
        .innerJoin(domains, and(eq(domains.organizationId, sites.organizationId), eq(domains.id, sites.domainId), eq(domains.status, 'active')))
        .leftJoin(regions, and(eq(regions.organizationId, sites.organizationId), eq(regions.id, sites.regionId)))
        .innerJoin(siteSettings, and(eq(siteSettings.organizationId, sites.organizationId), eq(siteSettings.siteId, sites.id)))
        .where(and(eq(sites.organizationId, context.organizationId), eq(sites.id, context.siteId), eq(sites.normalizedHostname, context.normalizedHostname), eq(sites.status, 'active'), eq(sites.activationState, 'active'), or(sql`${sites.regionId} IS NULL`, eq(regions.status, 'active')))).limit(1);
      const row = rows[0];
      if (row === undefined) return null;
      const robots = (row.seo as Record<string, unknown>)['robots'];
      return Array.isArray(robots) ? robots.map(String) : [];
    });
  }

  async loadSiteCategories(context: ResolvedSiteContext, limit: number): Promise<readonly SiteCategory[]> {
    return this.database.transaction(async (transaction) => {
      await this.publicTenant(transaction, context);
      return this.readCategories(transaction, context, limit);
    });
  }

  /**
   * Baca id template tenant untuk fallback branded sebelum situs ter-resolve.
   *
   * @param context - Resolved tenant hostname context.
   * @returns Id template tenant, atau null saat belum ada baris `site_settings`.
   * @remarks Satu skalar generated, bukan `colors`. `template_id` sudah menyimpan
   * `colors->>'templateId'`, jadi shell yang mem-brand diri sendiri menarik satu
   * kolom bertipe text alih-alih seluruh blob warna per host.
   */
  async loadSiteTemplateId(context: ResolvedSiteContext): Promise<string | null> {
    return this.database.transaction(async (transaction) => {
      await this.publicTenant(transaction, context);
      const rows = await transaction.select({ templateId: siteSettings.templateId })
        .from(siteSettings)
        .where(and(eq(siteSettings.organizationId, context.organizationId), eq(siteSettings.siteId, context.siteId)))
        .limit(1);
      return rows[0]?.templateId ?? null;
    });
  }

  /**
   * Resolve a published article id by slug without body or gallery reads.
   *
   * @param context - Resolved tenant hostname context.
   * @param slug - Normalized article slug.
   * @returns Article id when published on the site, otherwise null.
   */
  /**
   * Turnstile site key authorizing this tenant's report form.
   *
   * @param context - Resolved tenant hostname context.
   * @returns The apex's widget site key, or null when the domain has no widget yet.
   * @remarks One indexed read on the domain primary key, taken on the report page
   * and report intake only. The site key is public by construction, so it rides
   * the public tenant transaction rather than a privileged read.
   */
  async loadReportChallengeSitekey(context: ResolvedSiteContext): Promise<string | null> {
    return this.database.transaction(async (transaction) => {
      await this.publicTenant(transaction, context);
      const rows = await transaction.select({ sitekey: domains.reportChallengeSitekey })
        .from(domains)
        .where(and(eq(domains.organizationId, context.organizationId), eq(domains.id, context.domainId), eq(domains.status, 'active')))
        .limit(1);
      return rows[0]?.sitekey ?? null;
    });
  }

  async resolveArticleId(context: ResolvedSiteContext, slug: string): Promise<string | null> {
    return this.database.transaction(async (transaction) => {
      await this.publicTenant(transaction, context);
      const rows = await transaction.select({ id: articles.id })
        .from(articleSites)
        .innerJoin(articles, and(eq(articles.organizationId, articleSites.organizationId), eq(articles.id, articleSites.articleId)))
        .where(and(eq(articleSites.organizationId, context.organizationId), sql`${articleSites.siteId} in ${lineageSiteIds(context)}`, eq(articleSites.state, 'published'), eq(articleSites.active, true), eq(articles.status, 'active'), isNotNull(articleSites.publishedAt), eq(articles.slug, slug)))
        .limit(1);
      if (rows[0] !== undefined) return rows[0].id;
      const bridge = await transaction.select({
        sourceOrganizationId: portalAssignments.sourceOrganizationId,
        sourceArticleId: portalAssignments.sourceArticleId,
      })
        .from(portalAssignments)
        .where(and(eq(portalAssignments.organizationId, context.organizationId), eq(portalAssignments.siteId, context.siteId), eq(portalAssignments.state, 'published'), isNotNull(portalAssignments.publishedAt)))
        .limit(100);
      for (const row of bridge) {
        const details = await transaction.execute<{ article_id: string; slug: string }>(sql`
          SELECT article_id, slug FROM indicate_private.fetch_assigned_articles(
            ${row.sourceOrganizationId}::uuid, ${sqlStringArray([row.sourceArticleId])}::uuid[]
          )
        `);
        const match = [...details].find((detail) => detail.slug === slug);
        if (match !== undefined) return match.article_id;
      }
      return null;
    });
  }

  /**
   * Per-host RSS feed: metadata + full body without heavy relations.
   *
   * @remarks The only bulk body reader besides the single-article detail page;
   * RSS traffic is low and edge-cached for 600 seconds.
   */
  async loadNetworkFeed(context: ResolvedSiteContext, limit = 50): Promise<readonly FeedArticle[]> {
    return this.database.transaction(async (transaction) => {
      await this.publicTenant(transaction, context);
      const customMedia = aliasedTable(media, 'custom_media');
      const feedOrigin = aliasedTable(sites, 'origin_site');
      const rows = await transaction.select({ id: articles.id, slug: articles.slug, title: articles.title, originHost: feedOrigin.normalizedHostname, description: articleSites.customDescription, body: articles.body, coverImageUrl: articles.coverImageUrl, customImageMediaId: customMedia.id, customMediaType: customMedia.mediaType, leadMediaId: articles.leadMediaId, leadMediaType: media.mediaType, mediaState: media.state, publishedAt: articleSites.publishedAt, categoryName: categories.name, type: articles.type, isSponsored: articles.isSponsored, videoUrl: articles.videoUrl, audioUrl: articles.audioUrl })
        .from(articleSites)
        .innerJoin(articles, and(eq(articles.organizationId, articleSites.organizationId), eq(articles.id, articleSites.articleId)))
        .innerJoin(feedOrigin, and(eq(feedOrigin.organizationId, articleSites.organizationId), eq(feedOrigin.id, articleSites.siteId)))
        .leftJoin(categories, and(eq(categories.organizationId, articles.organizationId), eq(categories.id, articles.categoryId), eq(categories.status, 'active')))
        .leftJoin(media, and(eq(media.organizationId, articles.organizationId), eq(media.id, articles.leadMediaId), eq(media.state, 'active')))
        .leftJoin(customMedia, and(eq(customMedia.organizationId, articles.organizationId), eq(customMedia.id, articleSites.customImageMediaId), eq(customMedia.state, 'active')))
        .where(and(eq(articles.organizationId, context.organizationId), eq(articleSites.organizationId, context.organizationId), sql`${articleSites.siteId} in ${lineageSiteIds(context)}`, eq(articleSites.state, 'published'), eq(articleSites.active, true), eq(articles.status, 'active'), isNotNull(articleSites.publishedAt)))
        .orderBy(sql`${articleSites.publishedAt} DESC`)
        .limit(limit);
      return rows.filter((row) => row.publishedAt !== null).map((row) => ({
        id: row.id,
        slug: row.slug,
        title: row.title,
        href: originHref(row.originHost, context, row.slug),
        description: row.description ?? excerptForDescription(articleBodyText(row.body), 180),
        body: row.body,
        imageUrl: row.customImageMediaId !== null ? absoluteMediaUrl(context, row.customImageMediaId) : row.leadMediaId !== null && row.mediaState === 'active' ? absoluteMediaUrl(context, row.leadMediaId) : (row.coverImageUrl ?? (row.type === 'video' ? youtubeThumbnailUrl(row.videoUrl) : null)),
        imageMediaType: row.customImageMediaId !== null ? row.customMediaType : row.leadMediaId !== null && row.mediaState === 'active' ? row.leadMediaType : null,
        publishedAt: iso(row.publishedAt!),
        categoryName: row.categoryName,
        type: row.type,
        isSponsored: row.isSponsored,
        videoUrl: row.videoUrl,
        audioUrl: row.audioUrl,
      }));
    });
  }

  async isCacheBypassed(context: ResolvedSiteContext): Promise<boolean> {
    return this.database.transaction(async (transaction) => {
      await this.publicTenant(transaction, context);
      return this.readBypassed(transaction, context);
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

  private mapTask(row: typeof invalidationTasks.$inferSelect): InvalidationTask { return { id: row.id, organizationId: row.organizationId, siteId: row.siteId, previousHostname: row.previousHostname, currentHostname: row.currentHostname, tags: row.tags, paths: row.paths, urls: row.urls, reason: row.reason, attempts: row.attempts, nextAttemptAt: iso(row.nextAttemptAt), status: row.status, claimToken: row.reconciliationClaimToken, claimExpiresAt: row.reconciliationClaimExpiresAt === null ? null : iso(row.reconciliationClaimExpiresAt), sanitizedFailure: row.sanitizedFailure ?? null }; }
  async claimInvalidations(now: string, limit: number, leaseSeconds: number): Promise<readonly InvalidationTask[]> {
    const token = crypto.randomUUID();
    const claimExpiresAt = new Date(Date.parse(now) + leaseSeconds * 1_000).toISOString();
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
