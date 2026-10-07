import { and, desc, eq, gt, gte, inArray, isNotNull, isNull, lt, lte, or, sql, type SQL } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import type { AuthorizedTenantActorContext } from '@/core/operation-context';
import { extractTipTapImages } from '@/modules/site/tiptap-document';
import { seedInitialViewCount } from '@/modules/publishing/publication-policy';
import { regionScopeCovers } from '@/modules/site/region-scope';
import type { ActivityHour, ArticleRecord, ArticleUpdateRecord, RecentActivity, AnalyticsProjection, ConfigurationScope, CrossOrgArticleFilter, CrossOrgEditorialScope, EditorialScope, NetworkArticlesScope, PublisherClaimScope, PublisherScope, PublisherFlow, AuditFilter, AuditRecord, ActivationAttemptRecord, DashboardProjection, DashboardTenantState, EditorialSummaries, EditorialSummaryArticle, InvitationSummary, DateWindow, OperationsProjection, RetentionRunRecord, TaskDay, TaxonomyScope } from '@/modules/dashboard/models';
import { DashboardAccessDeniedError, DashboardConflictError, DashboardRateLimitedError, DashboardSubscriptionInactiveError, type DashboardCollectionName, type MutableTenantState, type DashboardRepository, type DashboardTransaction } from '@/modules/dashboard/ports';
import { INTEGRATIONS_PERMISSIONS } from '@/modules/integrations/permissions';
import { redact } from '@/core/security/redaction';
import { DashboardValidationError } from '@/modules/dashboard/tenant-service-errors';
import {
  apiKeys, articleCategories, articleRevisions, articleSites, articleUpdates, articles, auditLogs, authors, cacheBypasses, categories, contentReports, domainActivationAttempts, domains, invalidationTasks, media, mediaKeyReservations, memberships, objectCleanupTasks, officialAffiliations, organizations,
  permissions, portalAssignments, publicationTransitionReceipts, publishers, publishingJobs, publishingJobTargets, regions, rolePermissions, roles, sites, siteSettings, users, webhookReplayClaims,
} from '@/data/schema';
import type * as schema from '@/data/schema';
import { completeInvalidationValues } from '@/data/repos/shared/delivery-invalidation-values';
import { clampLimit } from '@/data/repos/shared/list-page';
import { sqlStringArray } from '@/data/repos/shared/sql-array';
import { pruneAnalyticsLabels } from '@/data/repos/dashboard-analytics-labels';

/** Default audit page; the previous fixed 500-row window is now the ceiling, not the floor. */
const AUDIT_LOG_PAGE_MAX_ROWS = 500;

/** Default editorial page; keyset-paged, never a full tenant dump. */
const EDITORIAL_PAGE_MAX_ROWS = 500;

type Database = PostgresJsDatabase<typeof schema>;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
const iso = (value: Date) => value.toISOString();
const isoOf = (value: Date | string) => (value instanceof Date ? value.toISOString() : new Date(value).toISOString());
const optionalIso = (value: Date | null) => value?.toISOString() ?? null;
/** Null-safe ISO for raw-`execute` rows, whose driver values may be `string` instead of `Date`. */
const optionalIsoOf = (value: Date | string | null): string | null => (value === null || value === undefined ? null : isoOf(value));

function subtractDays(day: string, count: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - count);
  return date.toISOString().slice(0, 10);
}

function nextDay(day: string): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function listDays(start: string, end: string): string[] {
  const days: string[] = [];
  let day = start;
  while (day <= end) {
    days.push(day);
    const date = new Date(`${day}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + 1);
    day = date.toISOString().slice(0, 10);
  }
  return days;
}

function resolveWindow(filter: { readonly from?: string | undefined; readonly to?: string | undefined }): DateWindow {
  const today = new Date().toISOString().slice(0, 10);
  const end = filter.to === undefined ? today : filter.to.slice(0, 10);
  const defaultStart = filter.from === undefined ? subtractDays(end, 89) : filter.from.slice(0, 10);
  const clampedStart = subtractDays(end, 89) > defaultStart ? subtractDays(end, 89) : defaultStart;
  return clampedStart > end ? { awal: end, akhir: end } : { awal: clampedStart, akhir: end };
}
const MANUAL_PURGE_BULK_COOLDOWN_SECONDS = 120;

/** Row identity lookups for one tenant snapshot, so diffing never rescans a collection. */
interface TenantStateIndex {
  readonly priorDomains: ReadonlyMap<string, DashboardTenantState['domains'][number]>;
  readonly priorRegions: ReadonlyMap<string, DashboardTenantState['regions'][number]>;
  readonly priorSites: ReadonlyMap<string, DashboardTenantState['sites'][number]>;
  readonly priorSiteSettings: ReadonlyMap<string, DashboardTenantState['siteSettings'][number]>;
  readonly priorAffiliations: ReadonlyMap<string, DashboardTenantState['affiliations'][number]>;
  readonly priorCategories: ReadonlyMap<string, DashboardTenantState['categories'][number]>;
  readonly priorAuthors: ReadonlyMap<string, DashboardTenantState['authors'][number]>;
  readonly priorPublishers: ReadonlyMap<string, DashboardTenantState['publishers'][number]>;
  readonly priorArticles: ReadonlyMap<string, DashboardTenantState['articles'][number]>;
  readonly priorArticleSites: ReadonlyMap<string, DashboardTenantState['articleSites'][number]>;
  readonly currentArticles: ReadonlyMap<string, DashboardTenantState['articles'][number]>;
  readonly currentArticleSites: ReadonlyMap<string, DashboardTenantState['articleSites'][number]>;
  readonly currentSites: ReadonlyMap<string, DashboardTenantState['sites'][number]>;
  readonly currentCategories: ReadonlyMap<string, DashboardTenantState['categories'][number]>;
}

function indexBy<T extends { readonly id: string }>(rows: readonly T[]): Map<string, T> {
  return new Map(rows.map((row) => [row.id, row]));
}

function indexSiteSettingsBy(rows: readonly DashboardTenantState['siteSettings'][number][]): Map<string, DashboardTenantState['siteSettings'][number]> {
  return new Map(rows.map((row) => [row.siteId, row]));
}

/** Build every identity map the mutation diff needs, once per transaction. */
function buildTenantStateIndex(before: DashboardTenantState, state: MutableTenantState, loaded?: ReadonlySet<DashboardCollectionName>): TenantStateIndex {
  const emptyArticles = new Map<string, DashboardTenantState['articles'][number]>();
  const emptyArticleSites = new Map<string, DashboardTenantState['articleSites'][number]>();
  const emptySites = new Map<string, DashboardTenantState['sites'][number]>();
  const emptyCategories = new Map<string, DashboardTenantState['categories'][number]>();
  const want = (name: DashboardCollectionName): boolean => loaded === undefined || loaded.has(name);
  return {
    priorDomains: indexBy(before.domains),
    priorRegions: indexBy(before.regions),
    priorSites: indexBy(before.sites),
    priorSiteSettings: indexSiteSettingsBy(before.siteSettings),
    priorAffiliations: indexBy(before.affiliations),
    priorCategories: indexBy(before.categories),
    priorAuthors: indexBy(before.authors),
    priorPublishers: indexBy(before.publishers),
    priorArticles: indexBy(before.articles),
    priorArticleSites: indexBy(before.articleSites),
    currentArticles: want('articles') ? indexBy(state.articles) : emptyArticles,
    currentArticleSites: want('articleSites') ? indexBy(state.articleSites) : emptyArticleSites,
    currentSites: want('sites') ? indexBy(state.sites) : emptySites,
    currentCategories: want('categories') ? indexBy(state.categories) : emptyCategories,
  };
}

export function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

/**
 * Report whether an article row still matches its persisted counterpart.
 *
 * @remarks Every persisted column is compared, including `publishedAt`. Skipping it
 * would let a draft-to-published transition look unchanged, and the tenant-state
 * upsert would then never stamp the publication time.
 */
export function articleUnchanged(prior: ArticleRecord, row: ArticleRecord): boolean {
  return prior.regionId === row.regionId && prior.publisherId === row.publisherId
    && prior.categoryId === row.categoryId && prior.authorId === row.authorId && prior.leadMediaId === row.leadMediaId
    && prior.coverImageUrl === row.coverImageUrl && prior.slug === row.slug && prior.title === row.title
    && prior.excerpt === row.excerpt && prior.canonicalUrl === row.canonicalUrl && prior.body === row.body
    && prior.source === row.source && prior.status === row.status && prior.publishedAt === row.publishedAt
    && prior.scheduledAt === row.scheduledAt && prior.type === row.type && prior.isSponsored === row.isSponsored
    && prior.videoUrl === row.videoUrl && prior.audioUrl === row.audioUrl && prior.durationSeconds === row.durationSeconds
    && prior.archivedAt === row.archivedAt && prior.version === row.version && prior.updatedAt === row.updatedAt
    && sameJson(prior.bodyJson ?? null, row.bodyJson ?? null) && sameJson(prior.tags, row.tags);
}

/** Rows per multi-row insert, kept well under the 65,535 bind-parameter ceiling. */
const INSERT_CHUNK_ROWS = 200;

/**
 * Split a collection into multi-row-sized slices.
 *
 * @remarks One dashboard mutation can touch hundreds of rows at once, such as
 * assigning an article across a tenant's portal tree. Awaiting a statement per row
 * held the organization row lock for the whole fan-out; batching collapses it to a
 * handful of round trips.
 *
 * @param rows - Rows to write, in order.
 * @returns Non-empty slices of at most `INSERT_CHUNK_ROWS` rows.
 */
export function* insertChunks<T>(rows: readonly T[]): Generator<readonly T[]> {
  for (let offset = 0; offset < rows.length; offset += INSERT_CHUNK_ROWS) {
    yield rows.slice(offset, offset + INSERT_CHUNK_ROWS);
  }
}

/**
 * Hostnames of transitive ancestors for bridge invalidation fan-out.
 *
 * @param execute - Raw query runner from the ambient transaction.
 * @param organizationId - Organization owning the assigned sites.
 * @param siteIds - Assigned site ids whose listings changed.
 * @returns Distinct ancestor hostnames (region, apex); empty when none.
 * @remarks A city bridge also renders on its region and apex listings, so
 * those portals must purge together with the assigned sites — the same
 * related-hostnames contract `completeInvalidationValues` documents.
 * Depth is at most 3 (apex -> region -> city); failures yield no
 * ancestors rather than failing the publication.
 */
export async function findBridgeAncestorHostnames(
  execute: (query: SQL) => Promise<unknown>,
  organizationId: string,
  siteIds: readonly string[],
): Promise<string[]> {
  if (siteIds.length === 0) return [];
  try {
    const value = await execute(sql`WITH RECURSIVE ancestry AS (
      SELECT s.id, s.parent_site_id, s.normalized_hostname FROM sites s
      WHERE s.organization_id = ${organizationId} AND s.id = ANY(${sqlStringArray([...siteIds])}::uuid[])
      UNION ALL
      SELECT p.id, p.parent_site_id, p.normalized_hostname FROM sites p
      JOIN ancestry c ON p.id = c.parent_site_id
      WHERE p.organization_id = ${organizationId}
    ) SELECT DISTINCT normalized_hostname AS hostname FROM ancestry`);
    const rows = Array.isArray(value) ? value : [];
    const hostnames = new Set<string>();
    for (const row of rows) {
      if (typeof row === 'object' && row !== null) {
        const hostname = (row as Record<string, unknown>).hostname;
        if (typeof hostname === 'string' && hostname !== '') hostnames.add(hostname);
      }
    }
    return [...hostnames];
  } catch {
    return [];
  }
}

/**
 * Manage dashboard tenant-state persistence in Postgres.
 *
 * @remarks The subscription gate applies to user sessions only; non-user actors carry their own scope.
 */
export class DrizzleDashboardRepository implements DashboardRepository {
  constructor(private readonly database: Database) {}

  private async repeatableRead<T>(work: () => Promise<T>): Promise<T> {
    let last: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await work();
      } catch (error) {
        const code = typeof error === 'object' && error !== null && 'code' in error
          ? String((error as { code: unknown }).code)
          : '';
        const message = error instanceof Error ? error.message : '';
        const serializable = code === '40001' || /could not serialize/i.test(message);
        if (!serializable || attempt === 2) throw error;
        last = error;
      }
    }
    throw last;
  }

  private async establishContextFor(transaction: Transaction, organizationId: string, actor: AuthorizedTenantActorContext): Promise<void> {
    await transaction.execute(sql`SELECT indicate_private.set_tenant_context(${organizationId}::uuid, ${actor.actorId}, ${actor.requestId})`);
    await transaction.execute(sql`SELECT indicate_private.set_region_context(${actor.regionScopeId ?? null}::uuid)`);
    if (actor.actorType === 'user') {
      await transaction.execute(sql`SELECT indicate_private.set_verified_user_context(${actor.verifiedAuthUserId}::uuid)`);
    }
  }

  private async establishContext(transaction: Transaction, actor: AuthorizedTenantActorContext): Promise<void> {
    await this.establishContextFor(transaction, actor.organizationId, actor);
  }

  private async authorize(transaction: Transaction, actor: AuthorizedTenantActorContext, permission: string): Promise<void> {
    if (actor.actorType !== 'user') {
      if (!actor.permissionSet.has(permission)) throw new DashboardAccessDeniedError();
      return;
    }
    const grants = await transaction.select({ permission: permissions.name }).from(memberships)
      .innerJoin(roles, and(eq(roles.organizationId, memberships.organizationId), eq(roles.id, memberships.roleId)))
      .innerJoin(rolePermissions, and(eq(rolePermissions.organizationId, roles.organizationId), eq(rolePermissions.roleId, roles.id)))
      .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
      .where(and(eq(memberships.organizationId, actor.organizationId), eq(memberships.userId, actor.actorId), eq(memberships.status, 'active'), eq(roles.active, true), eq(permissions.organizationId, actor.organizationId), eq(permissions.scope, 'organization'), eq(permissions.name, permission)))
      .limit(1);
    if (grants.length !== 1) throw new DashboardAccessDeniedError();
  }

  private async resolveMembershipProfiles(
    transaction: Transaction,
    membershipRows: readonly { readonly userId: string }[],
  ): Promise<Map<string, { displayName: string; avatarUrl: string | null }>> {
    const membershipIds = membershipRows.map((membership) => membership.userId);
    const membershipProfiles = new Map<string, { displayName: string; avatarUrl: string | null }>();
    if (membershipIds.length === 0) return membershipProfiles;
    const profileRows = await transaction.execute<{ user_id: string; display_name: string | null; avatar_url: string | null }>(sql`
      SELECT u AS user_id, profile.display_name, profile.avatar_url
      FROM unnest(${sqlStringArray(membershipIds)}::uuid[]) AS u
      LEFT JOIN LATERAL indicate_private.lookup_user_profile(u) AS profile ON true
    `);
    const byId = new Map(profileRows.map((row) => [row.user_id, row]));
    for (const membership of membershipRows) {
      const profile = byId.get(membership.userId);
      // Lookup bound to verified-user: non-user actors (api_key) lack
      // that context so it is always empty — use userId as a neutral label
      // (already exposed in the same payload) instead of failing the read.
      membershipProfiles.set(membership.userId, { displayName: profile?.display_name ?? membership.userId, avatarUrl: profile?.avatar_url ?? null });
    }
    return membershipProfiles;
  }

  private async load(transaction: Transaction, organizationId: string, only?: ReadonlySet<DashboardCollectionName>): Promise<DashboardTenantState> {
    const organization = await transaction.select({ id: organizations.id, name: organizations.name }).from(organizations).where(and(eq(organizations.id, organizationId), eq(organizations.status, 'active'))).limit(1);
    if (organization[0] === undefined) throw new DashboardAccessDeniedError();
    const want = (name: DashboardCollectionName): boolean => only === undefined || only.has(name);
    const articleRows = want('articles')
      ? (await transaction.select({ id: articles.id, regionId: articles.regionId, publisherId: articles.publisherId, categoryId: articles.categoryId, authorId: articles.authorId, leadMediaId: articles.leadMediaId, coverImageUrl: articles.coverImageUrl, slug: articles.slug, title: articles.title, excerpt: articles.excerpt, canonicalUrl: articles.canonicalUrl, source: articles.source, tags: articles.tags, status: articles.status, type: articles.type, isSponsored: articles.isSponsored, videoUrl: articles.videoUrl, audioUrl: articles.audioUrl, durationSeconds: articles.durationSeconds, publishedAt: articles.publishedAt, scheduledAt: articles.scheduledAt, archivedAt: articles.archivedAt, version: articles.version, createdAt: articles.createdAt, updatedAt: articles.updatedAt }).from(articles).where(eq(articles.organizationId, organizationId))).map((row) => ({ ...row, body: '', bodyJson: null as unknown | null }))
      : [];
    const [domainRows, regionRows, siteRows, settingsRows, roleRows, grantRows, membershipRows, publisherRows, affiliationRows, categoryRows, authorRows, articleCategoryRows, assignmentRows, mediaRows, jobRows, targetRows] = await Promise.all([
      want('domains') ? transaction.select({ id: domains.id, normalizedHostname: domains.normalizedHostname, status: domains.status, cloudflareZoneId: domains.cloudflareZoneId, siteTopology: domains.siteTopology, routingVersion: domains.routingVersion, version: domains.version, createdAt: domains.createdAt, updatedAt: domains.updatedAt }).from(domains).where(eq(domains.organizationId, organizationId)) : [],
      want('regions') ? transaction.select({ id: regions.id, externalKey: regions.externalKey, name: regions.name, shortName: regions.shortName, slug: regions.slug, status: regions.status, kind: regions.kind, parentRegionId: regions.parentRegionId, version: regions.version, createdAt: regions.createdAt, updatedAt: regions.updatedAt }).from(regions).where(eq(regions.organizationId, organizationId)) : [],
      want('sites') ? transaction.select({ id: sites.id, domainId: sites.domainId, regionId: sites.regionId, siteLevel: sites.siteLevel, parentSiteId: sites.parentSiteId, normalizedHostname: sites.normalizedHostname, status: sites.status, activationState: sites.activationState, version: sites.version, createdAt: sites.createdAt, updatedAt: sites.updatedAt }).from(sites).where(eq(sites.organizationId, organizationId)) : [],
      want('siteSettings') ? transaction.select({ siteId: siteSettings.siteId, name: siteSettings.name, description: siteSettings.description, tagline: siteSettings.tagline, seoDefaultTitle: siteSettings.seoDefaultTitle, seoDefaultDescription: siteSettings.seoDefaultDescription, seoOpenGraphSiteName: siteSettings.seoOpenGraphSiteName, locale: siteSettings.locale, seoRobotsDirective: siteSettings.seoRobotsDirective, commentsEnabled: siteSettings.commentsEnabled, colors: siteSettings.colors, socialLinks: siteSettings.socialLinks, seo: siteSettings.seo, navigation: siteSettings.navigation, logoMediaId: siteSettings.logoMediaId, faviconMediaId: siteSettings.faviconMediaId, defaultMediaId: siteSettings.defaultMediaId, version: siteSettings.version, createdAt: siteSettings.createdAt, updatedAt: siteSettings.updatedAt }).from(siteSettings).where(eq(siteSettings.organizationId, organizationId)) : [],
      want('roles') ? transaction.select({ id: roles.id, name: roles.name, tier: roles.tier, active: roles.active, version: roles.version, createdAt: roles.createdAt, updatedAt: roles.updatedAt }).from(roles).where(eq(roles.organizationId, organizationId)) : [],
      want('roles') ? transaction.select({ roleId: rolePermissions.roleId, permission: permissions.name }).from(rolePermissions).innerJoin(permissions, and(eq(permissions.id, rolePermissions.permissionId), eq(permissions.organizationId, organizationId), eq(permissions.scope, 'organization'))).where(eq(rolePermissions.organizationId, organizationId)) : [],
      want('memberships') ? transaction.select({ userId: memberships.userId, roleId: memberships.roleId, status: memberships.status, regionId: memberships.regionId, version: memberships.version, createdAt: memberships.createdAt, updatedAt: memberships.updatedAt }).from(memberships).where(eq(memberships.organizationId, organizationId)) : [],
      want('publishers') ? transaction.select({ id: publishers.id, name: publishers.name, type: publishers.type, attributionLabel: publishers.attributionLabel, contacts: publishers.contacts, evidenceReference: publishers.evidenceReference, verificationStatus: publishers.verificationStatus, submittedBy: publishers.submittedBy, submittedAt: publishers.submittedAt, verifiedBy: publishers.verifiedBy, verifiedAt: publishers.verifiedAt, rejectionReason: publishers.rejectionReason, status: publishers.status, version: publishers.version, createdAt: publishers.createdAt, updatedAt: publishers.updatedAt }).from(publishers).where(eq(publishers.organizationId, organizationId)) : [],
      want('affiliations') ? transaction.select({ id: officialAffiliations.id, publisherId: officialAffiliations.publisherId, siteId: officialAffiliations.siteId, institutionName: officialAffiliations.institutionName, claimScopes: officialAffiliations.claimScopes, evidenceReference: officialAffiliations.evidenceReference, active: officialAffiliations.active, verifiedAt: officialAffiliations.verifiedAt, version: officialAffiliations.version, createdAt: officialAffiliations.createdAt, updatedAt: officialAffiliations.updatedAt }).from(officialAffiliations).where(eq(officialAffiliations.organizationId, organizationId)) : [],
      want('categories') ? transaction.select({ id: categories.id, name: categories.name, slug: categories.slug, status: categories.status, version: categories.version, createdAt: categories.createdAt, updatedAt: categories.updatedAt }).from(categories).where(eq(categories.organizationId, organizationId)) : [],
      want('authors') ? transaction.select({ id: authors.id, displayName: authors.displayName, byline: authors.byline, status: authors.status, version: authors.version, createdAt: authors.createdAt, updatedAt: authors.updatedAt }).from(authors).where(eq(authors.organizationId, organizationId)) : [],
      want('articleCategories') ? transaction.select({ articleId: articleCategories.articleId, categoryId: articleCategories.categoryId, position: articleCategories.position }).from(articleCategories).where(eq(articleCategories.organizationId, organizationId)) : [],
      want('articleSites') ? transaction.select({ id: articleSites.id, articleId: articleSites.articleId, siteId: articleSites.siteId, state: articleSites.state, stateOccurredAt: articleSites.stateOccurredAt, publishedUrl: articleSites.publishedUrl, publishedAt: articleSites.publishedAt, active: articleSites.active, viewCount: articleSites.viewCount, assignmentSource: articleSites.assignmentSource, expandedFromSiteId: articleSites.expandedFromSiteId, customCanonicalUrl: articleSites.customCanonicalUrl, version: articleSites.version, createdAt: articleSites.createdAt, updatedAt: articleSites.updatedAt }).from(articleSites).where(eq(articleSites.organizationId, organizationId)) : [],
      want('media') ? transaction.select({ id: media.id, state: media.state, purpose: media.purpose, mediaType: media.mediaType }).from(media).where(eq(media.organizationId, organizationId)) : [],
      want('publishingJobs') ? transaction.select({ id: publishingJobs.id, articleId: publishingJobs.articleId, state: publishingJobs.state, createdAt: publishingJobs.createdAt, finalizedAt: publishingJobs.finalizedAt, updatedAt: publishingJobs.updatedAt }).from(publishingJobs).where(eq(publishingJobs.organizationId, organizationId)) : [],
      want('publishingJobTargets') ? transaction.select({ id: publishingJobTargets.id, jobId: publishingJobTargets.jobId, articleSiteId: publishingJobTargets.articleSiteId, state: publishingJobTargets.state, finishedAt: publishingJobTargets.finishedAt, updatedAt: publishingJobTargets.updatedAt }).from(publishingJobTargets).where(eq(publishingJobTargets.organizationId, organizationId)) : [],
    ]);
    const membershipProfiles = await this.resolveMembershipProfiles(transaction, membershipRows);
    const permissionsByRole = new Map<string, Set<string>>();
    for (const grant of grantRows) {
      const set = permissionsByRole.get(grant.roleId) ?? new Set<string>(); set.add(grant.permission); permissionsByRole.set(grant.roleId, set);
    }
    return {
      organizationId, organizationName: organization[0].name,
      domains: domainRows.map((row) => ({ id: row.id, organizationId, normalizedHostname: row.normalizedHostname, status: row.status, cloudflareZoneId: row.cloudflareZoneId, siteTopology: row.siteTopology, routingVersion: row.routingVersion, version: row.version, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt) })),
      regions: regionRows.map((row) => ({ id: row.id, organizationId, externalKey: row.externalKey, name: row.name, shortName: row.shortName, slug: row.slug, status: row.status, kind: row.kind, parentRegionId: row.parentRegionId, version: row.version, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt) })),
      sites: siteRows.map((row) => ({ id: row.id, organizationId, domainId: row.domainId, regionId: row.regionId, siteLevel: row.siteLevel, parentSiteId: row.parentSiteId, normalizedHostname: row.normalizedHostname, status: row.status, activationState: row.activationState, version: row.version, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt) })),
      siteSettings: settingsRows.map((row) => ({ id: row.siteId, organizationId, siteId: row.siteId, name: row.name, description: row.description, tagline: row.tagline, seoDefaultTitle: row.seoDefaultTitle, seoDefaultDescription: row.seoDefaultDescription, seoOpenGraphSiteName: row.seoOpenGraphSiteName, locale: row.locale, seoRobotsDirective: row.seoRobotsDirective, commentsEnabled: row.commentsEnabled, colors: row.colors, socialLinks: row.socialLinks, seo: row.seo, navigation: row.navigation.map((item) => ({ label: String(item.label ?? ''), path: String(item.path ?? '/') })), logoMediaId: row.logoMediaId, faviconMediaId: row.faviconMediaId, defaultMediaId: row.defaultMediaId, version: row.version, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt) })),
      roles: roleRows.map((row) => ({ id: row.id, organizationId, name: row.name, tier: row.tier, active: row.active, permissions: permissionsByRole.get(row.id) ?? new Set(), version: row.version, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt) })),
      memberships: membershipRows.map((membership) => ({ id: membership.userId, organizationId, userId: membership.userId, displayName: membershipProfiles.get(membership.userId)!.displayName, avatarUrl: membershipProfiles.get(membership.userId)!.avatarUrl, roleId: membership.roleId, status: membership.status, regionId: membership.regionId, version: membership.version, createdAt: iso(membership.createdAt), updatedAt: iso(membership.updatedAt) })),
      publishers: publisherRows.map((row) => ({ id: row.id, organizationId, name: row.name, type: row.type, attributionLabel: row.attributionLabel, contacts: Object.fromEntries(Object.entries(row.contacts).map(([key, value]) => [key, String(value)])), evidenceReference: row.evidenceReference, verificationStatus: row.verificationStatus, submittedBy: row.submittedBy, submittedAt: optionalIso(row.submittedAt), verifiedBy: row.verifiedBy, verifiedAt: optionalIso(row.verifiedAt), rejectionReason: row.rejectionReason, status: row.status, version: row.version, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt) })),
      affiliations: affiliationRows.map((row) => ({ id: row.id, organizationId, publisherId: row.publisherId, siteId: row.siteId, institutionName: row.institutionName, claimScopes: row.claimScopes, evidenceReference: row.evidenceReference, active: row.active, verifiedAt: optionalIso(row.verifiedAt), version: row.version, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt) })),
      categories: categoryRows.map((row) => ({ id: row.id, organizationId, name: row.name, slug: row.slug, status: row.status, version: row.version, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt) })),
      authors: authorRows.map((row) => ({ id: row.id, organizationId, displayName: row.displayName, byline: row.byline, status: row.status, version: row.version, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt) })),
      articles: articleRows.map((row) => ({ id: row.id, organizationId, regionId: row.regionId, publisherId: row.publisherId, categoryId: row.categoryId, categoryIds: articleCategoryRows.filter((link) => link.articleId === row.id).sort((a, b) => a.position - b.position).map((link) => link.categoryId), authorId: row.authorId, leadMediaId: row.leadMediaId, coverImageUrl: row.coverImageUrl, slug: row.slug, title: row.title, excerpt: row.excerpt, canonicalUrl: row.canonicalUrl, body: row.body, bodyJson: (row.bodyJson ?? null) as unknown | null, source: row.source, tags: [...row.tags], status: row.status, type: row.type, isSponsored: row.isSponsored, videoUrl: row.videoUrl, audioUrl: row.audioUrl, durationSeconds: row.durationSeconds, publishedAt: optionalIso(row.publishedAt), scheduledAt: optionalIso(row.scheduledAt), archivedAt: optionalIso(row.archivedAt), version: row.version, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt) })),
      articleCategories: articleCategoryRows.map((row) => ({ articleId: row.articleId, categoryId: row.categoryId, position: row.position })),
      articleSites: assignmentRows.map((row) => ({ id: row.id, organizationId, articleId: row.articleId, siteId: row.siteId, state: row.state, stateOccurredAt: iso(row.stateOccurredAt), publishedUrl: row.publishedUrl, publishedAt: optionalIso(row.publishedAt), active: row.active, viewCount: row.viewCount, assignmentSource: row.assignmentSource as 'manual' | 'auto', expandedFromSiteId: row.expandedFromSiteId, customCanonicalUrl: row.customCanonicalUrl, version: row.version, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt) })),
      media: mediaRows.map((row) => ({ id: row.id, organizationId, state: row.state, purpose: row.purpose, mediaType: row.mediaType })),
      publishingJobs: jobRows.map((row) => ({ id: row.id, organizationId, articleId: row.articleId, state: row.state, createdAt: iso(row.createdAt), occurredAt: iso(row.finalizedAt ?? row.updatedAt) })),
      publishingJobTargets: targetRows.map((row) => ({ id: row.id, organizationId, jobId: row.jobId, articleSiteId: row.articleSiteId, state: row.state, occurredAt: iso(row.finishedAt ?? row.updatedAt) })),
    };
  }

  async analyticsSummary(
    actor: AuthorizedTenantActorContext,
    permission: string,
    filter: { readonly from?: string | undefined; readonly to?: string | undefined },
  ): Promise<AnalyticsProjection> {
    return this.repeatableRead(() => this.database.transaction(async (transaction) => {
      await transaction.execute(sql`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ`);
      await this.establishContext(transaction, actor);
      await this.authorize(transaction, actor, permission);
      const organization = await transaction.select({ id: organizations.id }).from(organizations).where(and(eq(organizations.id, actor.organizationId), eq(organizations.status, 'active'))).limit(1);
      if (organization.length !== 1) throw new DashboardAccessDeniedError();
      const orgId = actor.organizationId;
      const from: string | null = filter.from ?? null;
      const to: string | null = filter.to ?? null;
      const window = resolveWindow(filter);
      const windowStart = `${window.awal}T00:00:00Z`;
      const windowEnd = `${nextDay(window.akhir)}T00:00:00Z`;
      const inArticleRange = sql`(${from}::timestamptz IS NULL OR created_at >= ${from}::timestamptz) AND (${to}::timestamptz IS NULL OR created_at <= ${to}::timestamptz)`;
      const [byRegion, byCategory, byPublisher, byStatus, jobsByState, bySite, outcomesBySite, jobDimensions, outcomeDimensions, taskRows, hourRows, newTasks, newOutcomes, newArticles, flowRows, deliveryRows, viewRows, dailyViewRows, siteViewRows, articleViewRows, totalRow, siteLabelRows, categoryLabelRows, publisherLabelRows, regionLabelRows] = await Promise.all([
        transaction.execute<{ key: string | null; count: number }>(sql`
          SELECT region_id AS key, count(*)::int AS count FROM articles
          WHERE organization_id = ${orgId} AND ${inArticleRange} GROUP BY region_id`),
        transaction.execute<{ key: string; count: number }>(sql`
          SELECT category_id AS key, count(*)::int AS count FROM articles
          WHERE organization_id = ${orgId} AND category_id IS NOT NULL AND ${inArticleRange} GROUP BY category_id`),
        transaction.execute<{ key: string; count: number }>(sql`
          SELECT publisher_id AS key, count(*)::int AS count FROM articles
          WHERE organization_id = ${orgId} AND publisher_id IS NOT NULL AND ${inArticleRange} GROUP BY publisher_id`),
        transaction.execute<{ key: string; count: number }>(sql`
          SELECT status AS key, count(*)::int AS count FROM articles
          WHERE organization_id = ${orgId} AND ${inArticleRange} GROUP BY status`),
        transaction.execute<{ key: string; count: number }>(sql`
          SELECT state AS key, count(*)::int AS count FROM publishing_jobs
          WHERE organization_id = ${orgId}
            AND (${from}::timestamptz IS NULL OR COALESCE(finalized_at, updated_at) >= ${from}::timestamptz)
            AND (${to}::timestamptz IS NULL OR COALESCE(finalized_at, updated_at) <= ${to}::timestamptz)
          GROUP BY state`),
        transaction.execute<{ key: string; count: number }>(sql`
          SELECT s.site_id AS key, count(*)::int AS count FROM article_sites s
          JOIN articles a ON a.organization_id = ${orgId} AND a.id = s.article_id
          WHERE s.organization_id = ${orgId} AND s.active
            AND (${from}::timestamptz IS NULL OR a.created_at >= ${from}::timestamptz)
            AND (${to}::timestamptz IS NULL OR a.created_at <= ${to}::timestamptz)
          GROUP BY s.site_id`),
        transaction.execute<{ key: string; count: number }>(sql`
          SELECT s.site_id || ':' || s.state AS key, count(*)::int AS count FROM article_sites s
          WHERE s.organization_id = ${orgId}
            AND (${from}::timestamptz IS NULL OR s.state_occurred_at >= ${from}::timestamptz)
            AND (${to}::timestamptz IS NULL OR s.state_occurred_at <= ${to}::timestamptz)
          GROUP BY s.site_id, s.state`),
        transaction.execute<{ siteId: string; regionId: string | null; state: string; count: number }>(sql`
          SELECT s.site_id AS "siteId", COALESCE(st.region_id, ar.region_id) AS "regionId", j.state AS state,
            count(*)::int AS count
          FROM publishing_jobs j
          JOIN publishing_job_targets t ON t.organization_id = ${orgId} AND t.job_id = j.id
          JOIN article_sites s ON s.organization_id = ${orgId} AND s.id = t.article_site_id
          JOIN articles ar ON ar.organization_id = ${orgId} AND ar.id = j.article_id
          JOIN sites st ON st.organization_id = ${orgId} AND st.id = s.site_id
          WHERE j.organization_id = ${orgId}
            AND (${from}::timestamptz IS NULL OR COALESCE(j.finalized_at, j.updated_at) >= ${from}::timestamptz)
            AND (${to}::timestamptz IS NULL OR COALESCE(j.finalized_at, j.updated_at) <= ${to}::timestamptz)
          GROUP BY s.site_id, COALESCE(st.region_id, ar.region_id), j.state`),
        transaction.execute<{ siteId: string; regionId: string | null; state: string; count: number }>(sql`
          SELECT s.site_id AS "siteId", COALESCE(st.region_id, ar.region_id) AS "regionId", s.state AS state,
            count(*)::int AS count
          FROM article_sites s
          JOIN articles ar ON ar.organization_id = ${orgId} AND ar.id = s.article_id
          JOIN sites st ON st.organization_id = ${orgId} AND st.id = s.site_id
          WHERE s.organization_id = ${orgId}
            AND (${from}::timestamptz IS NULL OR s.state_occurred_at >= ${from}::timestamptz)
            AND (${to}::timestamptz IS NULL OR s.state_occurred_at <= ${to}::timestamptz)
          GROUP BY s.site_id, COALESCE(st.region_id, ar.region_id), s.state`),
        transaction.execute<{ day: string; state: string; count: number }>(sql`
          SELECT (COALESCE(j.finalized_at, j.updated_at) AT TIME ZONE 'UTC')::date::text AS day,
            j.state AS state, count(*)::int AS count
          FROM publishing_jobs j
          WHERE j.organization_id = ${orgId}
            AND COALESCE(j.finalized_at, j.updated_at) >= ${windowStart}::timestamptz
            AND COALESCE(j.finalized_at, j.updated_at) < ${windowEnd}::timestamptz
          GROUP BY 1, 2`),
        transaction.execute<{ day: number; jam: number; count: number }>(sql`
          SELECT ((EXTRACT(DOW FROM s.state_occurred_at AT TIME ZONE 'Asia/Jakarta')::int + 6) % 7) AS day,
            EXTRACT(HOUR FROM s.state_occurred_at AT TIME ZONE 'Asia/Jakarta')::int AS jam,
            count(*)::int AS count
          FROM article_sites s
          WHERE s.organization_id = ${orgId}
            AND s.state_occurred_at >= ${windowStart}::timestamptz
            AND s.state_occurred_at < ${windowEnd}::timestamptz
          GROUP BY 1, 2`),
        transaction.execute<{ id: string; label: string; status: string; at: Date | string }>(sql`
          SELECT j.id AS id, ar.title AS label, j.state AS status, COALESCE(j.finalized_at, j.updated_at) AS at
          FROM publishing_jobs j
          JOIN articles ar ON ar.organization_id = ${orgId} AND ar.id = j.article_id
          WHERE j.organization_id = ${orgId}
            AND (${from}::timestamptz IS NULL OR COALESCE(j.finalized_at, j.updated_at) >= ${from}::timestamptz)
            AND (${to}::timestamptz IS NULL OR COALESCE(j.finalized_at, j.updated_at) <= ${to}::timestamptz)
          ORDER BY at DESC LIMIT 8`),
        transaction.execute<{ id: string; label: string; status: string; at: Date | string }>(sql`
          SELECT id, label, status, at FROM (
            SELECT DISTINCT ON (s.article_id)
                   ar.id AS id, ar.title AS label, s.state AS status, s.state_occurred_at AS at
            FROM article_sites s
            JOIN articles ar ON ar.organization_id = ${orgId} AND ar.id = s.article_id
            WHERE s.organization_id = ${orgId}
              AND (${from}::timestamptz IS NULL OR s.state_occurred_at >= ${from}::timestamptz)
              AND (${to}::timestamptz IS NULL OR s.state_occurred_at <= ${to}::timestamptz)
            ORDER BY s.article_id, s.state_occurred_at DESC
          ) recent
          ORDER BY at DESC LIMIT 8`),
        transaction.execute<{ id: string; label: string; status: string; at: Date | string }>(sql`
          SELECT a.id AS id, a.title AS label, a.status AS status, a.created_at AS at
          FROM articles a
          WHERE a.organization_id = ${orgId} AND ${inArticleRange}
          ORDER BY at DESC LIMIT 8`),
        transaction.execute<{ publisher: string; site: string; outcome: string; count: number }>(sql`
          SELECT a.publisher_id AS publisher, s.site_id AS site, s.state AS outcome, count(*)::int AS count
          FROM article_sites s
          JOIN articles a ON a.organization_id = ${orgId} AND a.id = s.article_id
          WHERE s.organization_id = ${orgId} AND a.publisher_id IS NOT NULL
            AND (${from}::timestamptz IS NULL OR s.state_occurred_at >= ${from}::timestamptz)
            AND (${to}::timestamptz IS NULL OR s.state_occurred_at <= ${to}::timestamptz)
          GROUP BY 1, 2, 3`),
        transaction.execute<{ day: string; state: string; count: number }>(sql`
          SELECT (s.state_occurred_at AT TIME ZONE 'UTC')::date::text AS day,
            s.state AS state, count(*)::int AS count
          FROM article_sites s
          WHERE s.organization_id = ${orgId}
            AND s.state_occurred_at >= ${windowStart}::timestamptz
            AND s.state_occurred_at < ${windowEnd}::timestamptz
          GROUP BY 1, 2`),
        transaction.execute<{ day: string; penyaluran: number }>(sql`
          SELECT (s.state_occurred_at AT TIME ZONE 'UTC')::date::text AS day,
            count(*)::int AS penyaluran
          FROM article_sites s
          WHERE s.organization_id = ${orgId}
            AND s.state_occurred_at >= ${windowStart}::timestamptz
            AND s.state_occurred_at < ${windowEnd}::timestamptz
          GROUP BY 1`),
        transaction.execute<{ day: string; views: number }>(sql`
          SELECT d.day::text AS day, COALESCE(SUM(d.views), 0)::int AS views
          FROM article_site_view_days d
          WHERE d.organization_id = ${orgId}
            AND d.day >= ${windowStart}::date
            AND d.day < ${windowEnd}::date
          GROUP BY 1`),
        transaction.execute<{ id: string; name: string; count: number; views: number }>(sql`
          SELECT d.site_id AS id, st.normalized_hostname AS name,
            COUNT(DISTINCT d.article_site_id)::int AS count, COALESCE(SUM(d.views), 0)::int AS views
          FROM article_site_view_days d
          JOIN sites st ON st.organization_id = ${orgId} AND st.id = d.site_id
          WHERE d.organization_id = ${orgId}
            AND (${from}::timestamptz IS NULL OR d.day >= (${from}::timestamptz AT TIME ZONE 'UTC')::date)
            AND (${to}::timestamptz IS NULL OR d.day <= (${to}::timestamptz AT TIME ZONE 'UTC')::date)
          GROUP BY 1, 2`),
        transaction.execute<{ id: string; name: string; count: number; views: number }>(sql`
          SELECT s.article_id AS id, ar.title AS name,
            COUNT(DISTINCT d.site_id)::int AS count, COALESCE(SUM(d.views), 0)::int AS views
          FROM article_site_view_days d
          JOIN article_sites s ON s.organization_id = ${orgId} AND s.id = d.article_site_id
          JOIN articles ar ON ar.organization_id = ${orgId} AND ar.id = s.article_id
          WHERE d.organization_id = ${orgId}
            AND (${from}::timestamptz IS NULL OR d.day >= (${from}::timestamptz AT TIME ZONE 'UTC')::date)
            AND (${to}::timestamptz IS NULL OR d.day <= (${to}::timestamptz AT TIME ZONE 'UTC')::date)
          GROUP BY 1, 2`),
        transaction.execute<{ total: number; salur: number }>(sql`
          SELECT
            (SELECT COALESCE(SUM(d.views), 0)::int FROM article_site_view_days d
              WHERE d.organization_id = ${orgId}
                AND (${from}::timestamptz IS NULL OR d.day >= (${from}::timestamptz AT TIME ZONE 'UTC')::date)
                AND (${to}::timestamptz IS NULL OR d.day <= (${to}::timestamptz AT TIME ZONE 'UTC')::date)) AS total,
            (SELECT count(*)::int FROM article_sites s
              WHERE s.organization_id = ${orgId}
                AND (${from}::timestamptz IS NULL OR s.state_occurred_at >= ${from}::timestamptz)
                AND (${to}::timestamptz IS NULL OR s.state_occurred_at <= ${to}::timestamptz)) AS salur`),
        transaction.execute<{ id: string; name: string }>(sql`
          SELECT id, normalized_hostname AS name FROM sites WHERE organization_id = ${orgId}`),
        transaction.execute<{ id: string; name: string }>(sql`
          SELECT id, name AS name FROM categories WHERE organization_id = ${orgId}`),
        transaction.execute<{ id: string; name: string }>(sql`
          SELECT id, name AS name FROM publishers WHERE organization_id = ${orgId}`),
        transaction.execute<{ id: string; name: string }>(sql`
          SELECT id, name AS name FROM regions WHERE organization_id = ${orgId}`),
      ]);
      const points = (rows: readonly { key: string | null; count: number }[]) =>
        [...rows].filter((row): row is { key: string; count: number } => row.key !== null).map(({ key, count }) => ({ key, count })).sort((a, b) => a.key.localeCompare(b.key));
      const dimensionPoints = (rows: readonly { siteId: string; regionId: string | null; state: string; count: number }[]) => {
        const counts = new Map<string, number>();
        for (const row of rows) {
          if (row.regionId === null) continue;
          const key = `${row.siteId}:${row.regionId}:${row.state}`;
          counts.set(key, (counts.get(key) ?? 0) + row.count);
        }
        return [...counts].sort(([left], [right]) => left.localeCompare(right)).map(([key, count]) => ({ key, count }));
      };
      const perDay = new Map<string, { diterbitkan: number; gagal: number; antre: number }>();
      for (const row of taskRows) {
        const slot = perDay.get(row.day) ?? { diterbitkan: 0, gagal: 0, antre: 0 };
        if (row.state === 'published') slot.diterbitkan += row.count;
        else if (row.state === 'failed') slot.gagal += row.count;
        else if (row.state === 'queued' || row.state === 'processing' || row.state === 'retrying') slot.antre += row.count;
        perDay.set(row.day, slot);
      }
      const dailyTasks: TaskDay[] = listDays(window.awal, window.akhir).map((day) => ({
        hari: day,
        ...(perDay.get(day) ?? { diterbitkan: 0, gagal: 0, antre: 0 }),
      }));
      const hourlyActivity: ActivityHour[] = [...hourRows]
        .sort((left, right) => left.day - right.day || left.jam - right.jam)
        .map(({ day, jam, count }) => ({ hari: day, jam, jumlah: count }));
      const recentActivity: RecentActivity[] = [
        ...newTasks.map((row) => ({ id: `job:${row.id}`, label: row.label, status: row.status, at: isoOf(row.at) })),
        ...newOutcomes.map((row) => ({ id: `outcome:${row.id}`, label: row.label, status: row.status, at: isoOf(row.at) })),
        ...newArticles.map((row) => ({ id: `article:${row.id}`, label: row.label, status: row.status, at: isoOf(row.at) })),
      ]
        .sort((left, right) => (left.at < right.at ? 1 : left.at > right.at ? -1 : 0))
        .slice(0, 8);
      const publisherFlows: PublisherFlow[] = [...flowRows]
        .sort((left, right) => right.count - left.count)
        .map(({ publisher, site, outcome, count }) => ({ penerbit: publisher, situs: site, hasil: outcome, jumlah: count }));
      const deliveriesPerDay = new Map<string, { diterbitkan: number; gagal: number; antre: number }>();
      for (const row of deliveryRows) {
        const slot = deliveriesPerDay.get(row.day) ?? { diterbitkan: 0, gagal: 0, antre: 0 };
        if (row.state === 'published') slot.diterbitkan += row.count;
        else if (row.state === 'failed') slot.gagal += row.count;
        else if (row.state === 'queued' || row.state === 'processing' || row.state === 'retrying' || row.state === 'unpublished') slot.antre += row.count;
        deliveriesPerDay.set(row.day, slot);
      }
      const deliveryDays = listDays(window.awal, window.akhir).map((day) => ({
        hari: day,
        ...(deliveriesPerDay.get(day) ?? { diterbitkan: 0, gagal: 0, antre: 0 }),
      }));
      const deliveryCountsPerDay = new Map(viewRows.map((row) => [row.day, row.penyaluran] as const));
      const viewsSumPerDay = new Map(dailyViewRows.map((row) => [row.day, row.views] as const));
      const viewDays = listDays(window.awal, window.akhir).map((day) => ({
        hari: day,
        penyaluran: deliveryCountsPerDay.get(day) ?? 0,
        views: viewsSumPerDay.get(day) ?? 0,
      }));
      const { siteLabels, categoryLabels, publisherLabels, regionLabels, articleLabels } = pruneAnalyticsLabels({
        siteLabelRows,
        categoryLabelRows,
        publisherLabelRows,
        regionLabelRows,
        siteViewRows,
        articleViewRows,
        bySite,
        byCategory,
        byPublisher,
        byRegion,
        outcomesBySite,
        jobDimensions,
        outcomeDimensions,
        publisherFlows,
      });
      return Object.freeze({
        articlesByRegion: points(byRegion),
        articlesBySite: points(bySite),
        articlesByCategory: points(byCategory),
        articlesByPublisher: points(byPublisher),
        articlesByStatus: points(byStatus),
        jobsByState: points(jobsByState),
        jobsBySiteRegionAndState: dimensionPoints(jobDimensions),
        outcomesBySiteAndState: points(outcomesBySite),
        outcomesBySiteRegionAndState: dimensionPoints(outcomeDimensions),
        jendela: window,
        tugasHarian: dailyTasks,
        aktivitasPerJam: hourlyActivity,
        aktivitasTerbaru: recentActivity,
        arusPenerbit: publisherFlows,
        penyaluranHarian: deliveryDays,
        viewsHarian: viewDays,
        viewsBySite: [...siteViewRows]
          .sort((left, right) => right.views - left.views)
          .map((row) => ({ key: row.id, count: row.count, views: row.views })),
        viewsByArticle: [...articleViewRows]
          .sort((left, right) => right.views - left.views)
          .map((row) => ({ key: row.id, count: row.count, views: row.views })),
        totalViews: totalRow[0]?.total ?? 0,
        totalPenyaluran: totalRow[0]?.salur ?? 0,
        siteLabels,
        categoryLabels,
        publisherLabels,
        regionLabels,
        articleLabels,
      });
    }));
  }

  /**
   * Latest audit log (desc, keyset pages) matching the filter.
   *
   * `before`/`after` snapshots stay out of the list projection: the dashboard
   * table renders name/status/actions only, and the full payloads ride the
   * WORM export. Keyset is the append-only `seq` chain (never wall-clock
   * text: `occurred_at` carries microsecond fractions that ISO millisecond
   * cursors silently skip at page boundaries), so pages never gap or repeat
   * and follow hash-chain order.
   */
  async auditLogPage(actor: AuthorizedTenantActorContext, permission: string, filter: AuditFilter, page?: { readonly limit?: number; readonly cursor?: string }): Promise<{ readonly logs: readonly AuditRecord[]; readonly nextCursor: string | null }> {
    return this.database.transaction(async (transaction) => {
      await this.establishContext(transaction, actor);
      await this.authorize(transaction, actor, permission);
      const organization = await transaction.select({ id: organizations.id }).from(organizations).where(and(eq(organizations.id, actor.organizationId), eq(organizations.status, 'active'))).limit(1);
      if (organization.length !== 1) throw new DashboardAccessDeniedError();
      const orgId = actor.organizationId;
      const limit = clampLimit(page?.limit, 100, AUDIT_LOG_PAGE_MAX_ROWS);
      const cursorSeq = page?.cursor !== undefined && /^\d+$/.test(page.cursor) ? Number(page.cursor) : null;
      const rows = await transaction
        .select({
          id: auditLogs.id,
          actorType: auditLogs.actorType,
          actorId: auditLogs.actorId,
          entryPoint: auditLogs.entryPoint,
          action: auditLogs.action,
          targetType: auditLogs.targetType,
          targetId: auditLogs.targetId,
          outcome: auditLogs.outcome,
          changedFields: auditLogs.changedFields,
          requestId: auditLogs.requestId,
          occurredAt: auditLogs.occurredAt,
          seq: auditLogs.seq,
        })
        .from(auditLogs)
        .where(and(
          eq(auditLogs.organizationId, orgId),
          // Chain rows only: a missing seq can never advance a `<` cursor past
          // NULLS FIRST, so anomalous rows stay out of paging instead of
          // looping the first page forever.
          isNotNull(auditLogs.seq),
          ...(filter.actorId === undefined ? [] : [eq(auditLogs.actorId, filter.actorId)]),
          ...(filter.action === undefined ? [] : [eq(auditLogs.action, filter.action)]),
          ...(filter.targetType === undefined ? [] : [eq(auditLogs.targetType, filter.targetType)]),
          ...(filter.outcome === undefined ? [] : [eq(auditLogs.outcome, filter.outcome)]),
          ...(filter.from === undefined ? [] : [gte(auditLogs.occurredAt, new Date(filter.from))]),
          ...(filter.to === undefined ? [] : [lte(auditLogs.occurredAt, new Date(filter.to))]),
          ...(cursorSeq === null ? [] : [lt(auditLogs.seq, cursorSeq)]),
        ))
        .orderBy(desc(auditLogs.seq))
        .limit(limit + 1);
      // Telegram traffic is not part of the dashboard audit trail, and the schema enums are wider than `AuditRecord`.
      const dashboardRows = rows.filter((row): row is typeof row & {
        readonly actorType: AuditRecord['actorType'];
        readonly entryPoint: AuditRecord['entryPoint'];
      } => row.actorType !== 'telegram' && row.entryPoint !== 'telegram');
      const logs = dashboardRows.slice(0, limit).map((row) => ({
        id: row.id, organizationId: orgId, actorType: row.actorType, actorId: row.actorId, entryPoint: row.entryPoint,
        action: row.action, targetType: row.targetType, targetId: row.targetId, outcome: row.outcome,
        changedFields: [...row.changedFields], before: null, after: null,
        requestId: row.requestId, occurredAt: row.occurredAt.toISOString(),
      }));
      // Cursor trails the last RETURNED row, not the raw probe: telegram rows
      // filtered out of the window shift consumption past the raw limit index,
      // and a raw-index cursor would replay those rows on the next page.
      const consumed = dashboardRows.slice(0, limit);
      const lastConsumed = consumed.length > 0 ? consumed[consumed.length - 1]?.seq ?? null : rows[limit - 1]?.seq ?? null;
      return Object.freeze({
        logs: Object.freeze(logs),
        nextCursor: rows.length > limit && lastConsumed !== null && lastConsumed !== undefined ? String(lastConsumed) : null,
      });
    });
  }

  async retentionRuns(actor: AuthorizedTenantActorContext, permission: string): Promise<readonly RetentionRunRecord[]> {
    return this.database.transaction(async (transaction) => {
      await this.establishContext(transaction, actor);
      await this.authorize(transaction, actor, permission);
      const organization = await transaction.select({ id: organizations.id }).from(organizations).where(and(eq(organizations.id, actor.organizationId), eq(organizations.status, 'active'))).limit(1);
      if (organization.length !== 1) throw new DashboardAccessDeniedError();
      const rows = await transaction.execute<{
        readonly id: string; readonly organization_id: string | null; readonly category: string;
        readonly purged_count: number; readonly started_at: Date | string; readonly finished_at: Date | string;
      }>(sql`SELECT id, organization_id, category, purged_count, started_at, finished_at FROM indicate_private.retention_list(${actor.actorId}::uuid, ${actor.organizationId}::uuid)`);
      return Object.freeze(rows.map((row) => ({
        id: row.id,
        organizationId: row.organization_id,
        name: `${row.category} — ${row.purged_count} purged`,
        status: 'success' as const,
        category: row.category,
        purgedCount: Number(row.purged_count),
        startedAt: isoOf(row.started_at),
        finishedAt: isoOf(row.finished_at),
      })));
    });
  }

  async activationAttempts(actor: AuthorizedTenantActorContext, permission: string): Promise<readonly ActivationAttemptRecord[]> {
    return this.database.transaction(async (transaction) => {
      await this.establishContext(transaction, actor);
      await this.authorize(transaction, actor, permission);
      const organization = await transaction.select({ id: organizations.id }).from(organizations).where(and(eq(organizations.id, actor.organizationId), eq(organizations.status, 'active'))).limit(1);
      if (organization.length !== 1) throw new DashboardAccessDeniedError();
      const rows = await transaction
        .select({
          id: domainActivationAttempts.id,
          siteId: domainActivationAttempts.siteId,
          hostname: domainActivationAttempts.hostname,
          operation: domainActivationAttempts.operation,
          status: domainActivationAttempts.status,
          attempts: domainActivationAttempts.attempts,
          nextAttemptAt: domainActivationAttempts.nextAttemptAt,
        })
        .from(domainActivationAttempts)
        .where(eq(domainActivationAttempts.organizationId, actor.organizationId))
        .orderBy(sql`${domainActivationAttempts.updatedAt} DESC`)
        .limit(100);
      return Object.freeze(rows.map((row) => ({
        id: row.id,
        organizationId: actor.organizationId,
        name: `${row.operation} ${row.hostname}`,
        status: row.status,
        siteId: row.siteId,
        hostname: row.hostname,
        operation: row.operation,
        attempts: row.attempts,
        nextAttemptAt: row.nextAttemptAt.toISOString(),
      })));
    });
  }

  async createInvitation(
    actor: AuthorizedTenantActorContext,
    permission: string,
    input: { readonly email: string; readonly roleId: string; readonly tokenHash: string },
  ): Promise<{ readonly id: string }> {
    return this.database.transaction(async (transaction) => {
      await this.establishContext(transaction, actor);
      await this.authorize(transaction, actor, permission);
      await this.enforceWritableSubscription(transaction, actor);
      const organization = await transaction.select({ id: organizations.id }).from(organizations).where(and(eq(organizations.id, actor.organizationId), eq(organizations.status, 'active'))).limit(1);
      if (organization.length !== 1) throw new DashboardAccessDeniedError();
      const role = await transaction.select({ id: roles.id }).from(roles).where(and(eq(roles.organizationId, actor.organizationId), eq(roles.id, input.roleId), eq(roles.active, true))).limit(1);
      if (role.length !== 1) throw new DashboardAccessDeniedError();
      const now = new Date().toISOString();
      try {
        const rows = await transaction.execute<{ invite_create: string }>(sql`SELECT indicate_private.invite_create(${actor.actorId}::uuid, ${actor.requestId}, ${actor.organizationId}::uuid, ${input.roleId}::uuid, ${input.email}, ${input.tokenHash}, ${now}::timestamptz) AS invite_create`);
        const inviteId = rows[0]?.invite_create;
        if (inviteId === undefined) throw new DashboardConflictError();
        return Object.freeze({ id: inviteId });
      } catch (error) {
        if (error instanceof DashboardAccessDeniedError || error instanceof DashboardConflictError) throw error;
        const code = (error as { code?: unknown })?.code;
        if (code === '42501' || code === 'P0001') throw new DashboardAccessDeniedError();
        if (code === '23505') throw new DashboardConflictError();
        throw error;
      }
    });
  }

  async listInvitations(actor: AuthorizedTenantActorContext, permission: string): Promise<readonly InvitationSummary[]> {
    return this.database.transaction(async (transaction) => {
      await this.establishContext(transaction, actor);
      await this.authorize(transaction, actor, permission);
      const organization = await transaction.select({ id: organizations.id }).from(organizations).where(and(eq(organizations.id, actor.organizationId), eq(organizations.status, 'active'))).limit(1);
      if (organization.length !== 1) throw new DashboardAccessDeniedError();
      try {
        const rows = await transaction.execute<{
          id: string; email: string; role_id: string | null; role_name: string | null;
          expires_at: Date; accepted_at: Date | null; created_at: Date;
        }>(sql`SELECT id, email, role_id, role_name, expires_at, accepted_at, created_at FROM indicate_private.invite_list(${actor.actorId}::uuid, ${actor.organizationId}::uuid)`);
        const now = Date.now();
        return Object.freeze(rows.map((row) => {
          const status = row.accepted_at !== null ? 'accepted' as const : new Date(row.expires_at).getTime() <= now ? 'expired' as const : 'pending' as const;
          return {
            id: row.id, organizationId: actor.organizationId, name: row.email, status,
            email: row.email, roleId: row.role_id ?? '', roleName: row.role_name ?? '—',
            expiresAt: isoOf(row.expires_at), acceptedAt: row.accepted_at === null ? null : isoOf(row.accepted_at),
            createdAt: isoOf(row.created_at),
          };
        }));
      } catch (error) {
        if (error instanceof DashboardAccessDeniedError) throw error;
        const code = (error as { code?: unknown })?.code;
        if (code === '42501' || code === 'P0001') throw new DashboardAccessDeniedError();
        throw error;
      }
    });
  }

  async revokeInvitation(
    actor: AuthorizedTenantActorContext,
    permission: string,
    input: { readonly id: string },
  ): Promise<{ readonly id: string }> {
    return this.database.transaction(async (transaction) => {
      await this.establishContext(transaction, actor);
      await this.authorize(transaction, actor, permission);
      await this.enforceWritableSubscription(transaction, actor);
      const organization = await transaction.select({ id: organizations.id }).from(organizations).where(and(eq(organizations.id, actor.organizationId), eq(organizations.status, 'active'))).limit(1);
      if (organization.length !== 1) throw new DashboardAccessDeniedError();
      const now = new Date().toISOString();
      try {
        const rows = await transaction.execute<{ invite_revoke: boolean }>(sql`SELECT indicate_private.invite_revoke(${actor.actorId}::uuid, ${actor.requestId}, ${input.id}::uuid, ${now}::timestamptz) AS invite_revoke`);
        if (rows[0]?.invite_revoke !== true) throw new DashboardConflictError();
        return Object.freeze({ id: input.id });
      } catch (error) {
        if (error instanceof DashboardAccessDeniedError || error instanceof DashboardConflictError) throw error;
        const code = (error as { code?: unknown })?.code;
        if (code === '42501' || code === 'P0001') throw new DashboardAccessDeniedError();
        throw error;
      }
    });
  }

  async operationsSummary(actor: AuthorizedTenantActorContext, permission: string): Promise<OperationsProjection> {
    return this.database.transaction(async (transaction) => {
      await this.establishContext(transaction, actor);
      await this.authorize(transaction, actor, permission);
      const organization = await transaction.select({ id: organizations.id }).from(organizations).where(and(eq(organizations.id, actor.organizationId), eq(organizations.status, 'active'))).limit(1);
      if (organization.length !== 1) throw new DashboardAccessDeniedError();
      const organizationId = actor.organizationId;
      const [invalidationRows, cleanupRows, reservationRows, bypassRows, receiptRows, replayRows] = await Promise.all([
        transaction.select({ id: invalidationTasks.id, reason: invalidationTasks.reason, currentHostname: invalidationTasks.currentHostname, previousHostname: invalidationTasks.previousHostname, siteId: invalidationTasks.siteId, status: invalidationTasks.status, attempts: invalidationTasks.attempts, nextAttemptAt: invalidationTasks.nextAttemptAt, updatedAt: invalidationTasks.updatedAt }).from(invalidationTasks).where(eq(invalidationTasks.organizationId, organizationId)).orderBy(desc(invalidationTasks.updatedAt)).limit(100),
        transaction.select({ id: objectCleanupTasks.id, objectKey: objectCleanupTasks.objectKey, status: objectCleanupTasks.status, reason: objectCleanupTasks.reason, attempts: objectCleanupTasks.attempts, nextAttemptAt: objectCleanupTasks.nextAttemptAt, updatedAt: objectCleanupTasks.updatedAt }).from(objectCleanupTasks).where(eq(objectCleanupTasks.organizationId, organizationId)).orderBy(desc(objectCleanupTasks.updatedAt)).limit(100),
        transaction.select({ id: mediaKeyReservations.id, objectKey: mediaKeyReservations.objectKey, status: mediaKeyReservations.status, purpose: mediaKeyReservations.purpose, expiresAt: mediaKeyReservations.expiresAt, updatedAt: mediaKeyReservations.updatedAt }).from(mediaKeyReservations).where(eq(mediaKeyReservations.organizationId, organizationId)).orderBy(desc(mediaKeyReservations.updatedAt)).limit(100),
        transaction.select({ siteId: cacheBypasses.siteId, bypass: cacheBypasses.bypass, reason: cacheBypasses.reason, updatedAt: cacheBypasses.updatedAt }).from(cacheBypasses).where(eq(cacheBypasses.organizationId, organizationId)).orderBy(desc(cacheBypasses.updatedAt)).limit(100),
        transaction.select({ id: publicationTransitionReceipts.id, fromState: publicationTransitionReceipts.fromState, toState: publicationTransitionReceipts.toState, acknowledgedAt: publicationTransitionReceipts.acknowledgedAt, jobId: publicationTransitionReceipts.jobId, createdAt: publicationTransitionReceipts.createdAt }).from(publicationTransitionReceipts).where(eq(publicationTransitionReceipts.organizationId, organizationId)).orderBy(desc(publicationTransitionReceipts.createdAt)).limit(100),
        transaction.select({ source: webhookReplayClaims.source, replayId: webhookReplayClaims.replayId, status: webhookReplayClaims.status, attemptCount: webhookReplayClaims.attemptCount, receivedAt: webhookReplayClaims.receivedAt, expiresAt: webhookReplayClaims.expiresAt }).from(webhookReplayClaims).where(eq(webhookReplayClaims.organizationId, organizationId)).orderBy(desc(webhookReplayClaims.receivedAt)).limit(100),
      ]);
      return Object.freeze({
        invalidationTasks: invalidationRows.map((row) => ({ id: row.id, organizationId, name: `${row.reason} · ${row.currentHostname ?? row.previousHostname ?? row.siteId}`, status: row.status, siteId: row.siteId, reason: row.reason, attempts: row.attempts, nextAttemptAt: row.nextAttemptAt.toISOString(), updatedAt: row.updatedAt.toISOString() })),
        objectCleanupTasks: cleanupRows.map((row) => ({ id: row.id, organizationId, name: row.objectKey, status: row.status, reason: row.reason, attempts: row.attempts, nextAttemptAt: row.nextAttemptAt.toISOString(), updatedAt: row.updatedAt.toISOString() })),
        mediaKeyReservations: reservationRows.map((row) => ({ id: row.id, organizationId, name: row.objectKey, status: row.status, purpose: row.purpose, expiresAt: row.expiresAt.toISOString(), updatedAt: row.updatedAt.toISOString() })),
        cacheBypasses: bypassRows.map((row) => ({ id: row.siteId, organizationId, name: row.siteId, status: row.bypass ? 'bypass' : 'cache', siteId: row.siteId, reason: row.reason, updatedAt: row.updatedAt.toISOString() })),
        transitionReceipts: receiptRows.map((row) => ({ id: row.id, organizationId, name: `${row.fromState} → ${row.toState}`, status: row.acknowledgedAt === null ? 'pending' : 'acknowledged', jobId: row.jobId, occurredAt: row.createdAt.toISOString() })),
        webhookReplayClaims: replayRows.map((row) => ({ id: `${row.source}:${row.replayId}`, organizationId, name: `${row.source} · ${row.replayId}`, status: row.status, attemptCount: row.attemptCount, receivedAt: (row.receivedAt instanceof Date ? row.receivedAt : new Date(row.receivedAt)).toISOString(), expiresAt: (row.expiresAt instanceof Date ? row.expiresAt : new Date(row.expiresAt)).toISOString() })),
      });
    });
  }

  async enqueueCachePurge(actor: AuthorizedTenantActorContext, permission: string, siteId: string | null): Promise<readonly { siteId: string; hostname: string }[]> {
    return this.database.transaction(async (transaction) => {
      await this.establishContext(transaction, actor);
      await this.authorize(transaction, actor, permission);
      await this.enforceWritableSubscription(transaction, actor);
      if (siteId === null) {
        const windowStart = new Date(Date.now() - MANUAL_PURGE_BULK_COOLDOWN_SECONDS * 1000);
        const recent = await transaction.select({ id: invalidationTasks.id }).from(invalidationTasks)
          .where(and(eq(invalidationTasks.organizationId, actor.organizationId), eq(invalidationTasks.reason, 'manual-purge'), gt(invalidationTasks.createdAt, windowStart))).limit(1);
        if (recent.length > 0) throw new DashboardRateLimitedError(MANUAL_PURGE_BULK_COOLDOWN_SECONDS);
      }
      const rows = await transaction.select({ id: sites.id, hostname: sites.normalizedHostname, regionId: sites.regionId }).from(sites).where(eq(sites.organizationId, actor.organizationId));
      const scope = actor.regionScopeId ?? null;
      const geography = await transaction.select({ id: regions.id, kind: regions.kind, parentRegionId: regions.parentRegionId })
        .from(regions).where(eq(regions.organizationId, actor.organizationId));
      const inScope = (regionId: string | null) => regionScopeCovers(scope, regionId, geography);
      const targets = siteId === null ? rows.filter((row) => inScope(row.regionId)) : rows.filter((row) => row.id === siteId && inScope(row.regionId));
      if (siteId !== null && targets.length !== 1) throw new DashboardAccessDeniedError();
      const now = new Date();
      if (targets.length > 0) {
        await transaction.insert(invalidationTasks).values(targets.map((target) =>
          completeInvalidationValues({ organizationId: actor.organizationId, siteId: target.id, currentHostname: target.hostname, reason: 'manual-purge', now }),
        ));
        await transaction.insert(auditLogs).values(targets.map((target) => ({
          organizationId: actor.organizationId, id: crypto.randomUUID(), actorType: actor.actorType, actorId: actor.actorId,
          entryPoint: actor.entryPoint, action: 'site.cache.purge' as const, targetType: 'site' as const, targetId: target.id,
          outcome: 'succeeded' as const, changedFields: ['cache'], before: null, after: { hostname: target.hostname },
          requestId: actor.requestId, occurredAt: now,
        })));
      }
      return Object.freeze(targets.map((target) => ({ siteId: target.id, hostname: target.hostname })));
    });
  }

  /**
   * Enqueue publisher-change purges for portals rendering this publisher.
   *
   * @param actor - Calling actor; logo edits need the publisher-manage grant.
   * @param permission - Membership permission guarding the enqueue.
   * @param publisherId - Publisher whose logoUrl just changed.
   * @returns Count of portal tasks enqueued.
   * @remarks Only portals carrying published copies of this publisher's
   * articles purge — never the whole network. Bridge-served portals in
   * other orgs are out of tenant scope here and refresh on their next
   * publish event; reason `publisher.changed` already narrows paths to
   * the article corpus. Failures propagate so the service can downgrade
   * them to telemetry instead of failing the publisher save.
   */
  async enqueuePublisherInvalidation(actor: AuthorizedTenantActorContext, permission: string, publisherId: string): Promise<number> {
    return this.database.transaction(async (transaction) => {
      await this.establishContext(transaction, actor);
      await this.authorize(transaction, actor, permission);
      const scope = actor.regionScopeId ?? null;
      const geography = await transaction.select({ id: regions.id, kind: regions.kind, parentRegionId: regions.parentRegionId })
        .from(regions).where(eq(regions.organizationId, actor.organizationId)).limit(500);
      const rows = await transaction
        .select({ siteId: articleSites.siteId, hostname: sites.normalizedHostname, slug: articles.slug, regionId: sites.regionId })
        .from(articleSites)
        .innerJoin(articles, and(eq(articles.organizationId, articleSites.organizationId), eq(articles.id, articleSites.articleId)))
        .innerJoin(sites, and(eq(sites.organizationId, articleSites.organizationId), eq(sites.id, articleSites.siteId)))
        .where(and(
          eq(articleSites.organizationId, actor.organizationId),
          eq(articleSites.active, true),
          eq(articleSites.state, 'published'),
          eq(articles.status, 'active'),
          eq(articles.publisherId, publisherId),
        ))
        .limit(200);
      const bySite = new Map<string, { readonly hostname: string; readonly slugs: Set<string> }>();
      for (const row of rows) {
        if (!regionScopeCovers(scope, row.regionId, geography)) continue;
        const entry = bySite.get(row.siteId) ?? { hostname: row.hostname, slugs: new Set<string>() };
        entry.slugs.add(row.slug);
        bySite.set(row.siteId, entry);
      }
      const now = new Date();
      for (const [siteId, entry] of bySite) {
        await transaction.insert(invalidationTasks).values(completeInvalidationValues({
          organizationId: actor.organizationId, siteId, currentHostname: entry.hostname,
          reason: 'publisher.changed', articleSlugs: [...entry.slugs].slice(0, 50), now,
        }));
      }
      return bySite.size;
    });
  }

  /**
   * Scoped configuration read: identity, geography, and access collections only.
   *
   * Reads 7 narrow tables instead of the 17-table `load()` hydration; articles,
   * assignments, media, and jobs are never touched on this path.
   */
  async readConfigurationScope(actor: AuthorizedTenantActorContext, permission: string): Promise<ConfigurationScope> {
    return this.database.transaction(async (transaction) => {
      await this.establishContext(transaction, actor);
      await this.authorize(transaction, actor, permission);
      const organizationId = actor.organizationId;
      const organization = await transaction.select({ id: organizations.id, name: organizations.name }).from(organizations).where(and(eq(organizations.id, organizationId), eq(organizations.status, 'active'))).limit(1);
      if (organization[0] === undefined) throw new DashboardAccessDeniedError();
      const [domainRows, regionRows, siteRows, settingsRows, roleRows, grantRows, membershipRows] = await Promise.all([
        transaction.select({ id: domains.id, normalizedHostname: domains.normalizedHostname, status: domains.status, cloudflareZoneId: domains.cloudflareZoneId, siteTopology: domains.siteTopology, routingVersion: domains.routingVersion, version: domains.version, createdAt: domains.createdAt, updatedAt: domains.updatedAt }).from(domains).where(eq(domains.organizationId, organizationId)),
        transaction.select({ id: regions.id, externalKey: regions.externalKey, name: regions.name, shortName: regions.shortName, slug: regions.slug, status: regions.status, kind: regions.kind, parentRegionId: regions.parentRegionId, version: regions.version, createdAt: regions.createdAt, updatedAt: regions.updatedAt }).from(regions).where(eq(regions.organizationId, organizationId)),
        transaction.select({ id: sites.id, domainId: sites.domainId, regionId: sites.regionId, siteLevel: sites.siteLevel, parentSiteId: sites.parentSiteId, normalizedHostname: sites.normalizedHostname, status: sites.status, activationState: sites.activationState, version: sites.version, createdAt: sites.createdAt, updatedAt: sites.updatedAt }).from(sites).where(eq(sites.organizationId, organizationId)),
        transaction.select({ siteId: siteSettings.siteId, name: siteSettings.name, description: siteSettings.description, tagline: siteSettings.tagline, seoDefaultTitle: siteSettings.seoDefaultTitle, seoDefaultDescription: siteSettings.seoDefaultDescription, seoOpenGraphSiteName: siteSettings.seoOpenGraphSiteName, locale: siteSettings.locale, seoRobotsDirective: siteSettings.seoRobotsDirective, commentsEnabled: siteSettings.commentsEnabled, colors: siteSettings.colors, socialLinks: siteSettings.socialLinks, seo: siteSettings.seo, navigation: siteSettings.navigation, logoMediaId: siteSettings.logoMediaId, faviconMediaId: siteSettings.faviconMediaId, defaultMediaId: siteSettings.defaultMediaId, version: siteSettings.version, createdAt: siteSettings.createdAt, updatedAt: siteSettings.updatedAt }).from(siteSettings).where(eq(siteSettings.organizationId, organizationId)),
        transaction.select({ id: roles.id, name: roles.name, tier: roles.tier, active: roles.active, version: roles.version, createdAt: roles.createdAt, updatedAt: roles.updatedAt }).from(roles).where(eq(roles.organizationId, organizationId)),
        transaction.select({ roleId: rolePermissions.roleId, permission: permissions.name }).from(rolePermissions).innerJoin(permissions, and(eq(permissions.id, rolePermissions.permissionId), eq(permissions.organizationId, organizationId), eq(permissions.scope, 'organization'))).where(eq(rolePermissions.organizationId, organizationId)),
        transaction.select({ userId: memberships.userId, roleId: memberships.roleId, status: memberships.status, regionId: memberships.regionId, version: memberships.version, createdAt: memberships.createdAt, updatedAt: memberships.updatedAt }).from(memberships).where(eq(memberships.organizationId, organizationId)),
      ]);
      const membershipProfiles = await this.resolveMembershipProfiles(transaction, membershipRows);
      const permissionsByRole = new Map<string, Set<string>>();
      for (const grant of grantRows) {
        const set = permissionsByRole.get(grant.roleId) ?? new Set<string>(); set.add(grant.permission); permissionsByRole.set(grant.roleId, set);
      }
      return {
        organizationName: organization[0].name,
        domains: domainRows.map((row) => ({ id: row.id, organizationId, normalizedHostname: row.normalizedHostname, status: row.status, cloudflareZoneId: row.cloudflareZoneId, siteTopology: row.siteTopology, routingVersion: row.routingVersion, version: row.version, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt) })),
        regions: regionRows.map((row) => ({ id: row.id, organizationId, externalKey: row.externalKey, name: row.name, shortName: row.shortName, slug: row.slug, status: row.status, kind: row.kind, parentRegionId: row.parentRegionId, version: row.version, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt) })),
        sites: siteRows.map((row) => ({ id: row.id, organizationId, domainId: row.domainId, regionId: row.regionId, siteLevel: row.siteLevel, parentSiteId: row.parentSiteId, normalizedHostname: row.normalizedHostname, status: row.status, activationState: row.activationState, version: row.version, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt) })),
        siteSettings: settingsRows.map((row) => ({ id: row.siteId, organizationId, siteId: row.siteId, name: row.name, description: row.description, tagline: row.tagline, seoDefaultTitle: row.seoDefaultTitle, seoDefaultDescription: row.seoDefaultDescription, seoOpenGraphSiteName: row.seoOpenGraphSiteName, locale: row.locale, seoRobotsDirective: row.seoRobotsDirective, commentsEnabled: row.commentsEnabled, colors: row.colors, socialLinks: row.socialLinks, seo: row.seo, navigation: row.navigation.map((item) => ({ label: String(item.label ?? ''), path: String(item.path ?? '/') })), logoMediaId: row.logoMediaId, faviconMediaId: row.faviconMediaId, defaultMediaId: row.defaultMediaId, version: row.version, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt) })),
        roles: roleRows.map((row) => ({ id: row.id, organizationId, name: row.name, tier: row.tier, active: row.active, permissions: permissionsByRole.get(row.id) ?? new Set(), version: row.version, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt) })),
        memberships: membershipRows.map((membership) => ({ id: membership.userId, organizationId, userId: membership.userId, displayName: membershipProfiles.get(membership.userId)!.displayName, avatarUrl: membershipProfiles.get(membership.userId)!.avatarUrl, roleId: membership.roleId, status: membership.status, regionId: membership.regionId, version: membership.version, createdAt: iso(membership.createdAt), updatedAt: iso(membership.updatedAt) })),
      };
    });
  }

  /**
   * Scoped publisher read: publishers, claims, and mini geography.
   *
   * Skips articles, assignments, media, jobs, and settings entirely; the claim
   * rollup only needs publisher rows, affiliation rows, and site/region names.
   */
  async readPublisherScope(actor: AuthorizedTenantActorContext, permission: string): Promise<PublisherScope> {
    return this.database.transaction(async (transaction) => {
      await this.establishContext(transaction, actor);
      await this.authorize(transaction, actor, permission);
      const organizationId = actor.organizationId;
      const [publisherRows, affiliationRows, siteRows, regionRows] = await Promise.all([
        transaction.select({ id: publishers.id, name: publishers.name, type: publishers.type, attributionLabel: publishers.attributionLabel, contacts: publishers.contacts, evidenceReference: publishers.evidenceReference, verificationStatus: publishers.verificationStatus, submittedBy: publishers.submittedBy, submittedAt: publishers.submittedAt, verifiedBy: publishers.verifiedBy, verifiedAt: publishers.verifiedAt, rejectionReason: publishers.rejectionReason, status: publishers.status, version: publishers.version, createdAt: publishers.createdAt, updatedAt: publishers.updatedAt }).from(publishers).where(eq(publishers.organizationId, organizationId)),
        transaction.select({ id: officialAffiliations.id, publisherId: officialAffiliations.publisherId, siteId: officialAffiliations.siteId, institutionName: officialAffiliations.institutionName, claimScopes: officialAffiliations.claimScopes, evidenceReference: officialAffiliations.evidenceReference, active: officialAffiliations.active, verifiedAt: officialAffiliations.verifiedAt, version: officialAffiliations.version, createdAt: officialAffiliations.createdAt, updatedAt: officialAffiliations.updatedAt }).from(officialAffiliations).where(eq(officialAffiliations.organizationId, organizationId)),
        transaction.select({ id: sites.id, domainId: sites.domainId, regionId: sites.regionId, siteLevel: sites.siteLevel, parentSiteId: sites.parentSiteId, normalizedHostname: sites.normalizedHostname, status: sites.status, activationState: sites.activationState, version: sites.version, createdAt: sites.createdAt, updatedAt: sites.updatedAt }).from(sites).where(eq(sites.organizationId, organizationId)),
        transaction.select({ id: regions.id, externalKey: regions.externalKey, name: regions.name, shortName: regions.shortName, slug: regions.slug, status: regions.status, kind: regions.kind, parentRegionId: regions.parentRegionId, version: regions.version, createdAt: regions.createdAt, updatedAt: regions.updatedAt }).from(regions).where(eq(regions.organizationId, organizationId)),
      ]);
      return {
        publishers: publisherRows.map((row) => ({ id: row.id, organizationId, name: row.name, type: row.type, attributionLabel: row.attributionLabel, contacts: Object.fromEntries(Object.entries(row.contacts).map(([key, value]) => [key, String(value)])), evidenceReference: row.evidenceReference, verificationStatus: row.verificationStatus, submittedBy: row.submittedBy, submittedAt: optionalIso(row.submittedAt), verifiedBy: row.verifiedBy, verifiedAt: optionalIso(row.verifiedAt), rejectionReason: row.rejectionReason, status: row.status, version: row.version, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt) })),
        affiliations: affiliationRows.map((row) => ({ id: row.id, organizationId, publisherId: row.publisherId, siteId: row.siteId, institutionName: row.institutionName, claimScopes: row.claimScopes, evidenceReference: row.evidenceReference, active: row.active, verifiedAt: optionalIso(row.verifiedAt), version: row.version, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt) })),
        sites: siteRows.map((row) => ({ id: row.id, organizationId, domainId: row.domainId, regionId: row.regionId, siteLevel: row.siteLevel, parentSiteId: row.parentSiteId, normalizedHostname: row.normalizedHostname, status: row.status, activationState: row.activationState, version: row.version, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt) })),
        regions: regionRows.map((row) => ({ id: row.id, organizationId, externalKey: row.externalKey, name: row.name, shortName: row.shortName, slug: row.slug, status: row.status, kind: row.kind, parentRegionId: row.parentRegionId, version: row.version, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt) })),
      };
    });
  }

  /**
   * Scoped taxonomy read: narrow article facets for counting, never bodies.
   *
   * Category/tag counts need every article's facet columns, but never titles,
   * bodies, or content — three narrow selects replace the 17-table hydration.
   */
  async readTaxonomyScope(actor: AuthorizedTenantActorContext, permission: string): Promise<TaxonomyScope> {
    return this.database.transaction(async (transaction) => {
      await this.establishContext(transaction, actor);
      await this.authorize(transaction, actor, permission);
      const organizationId = actor.organizationId;
      const [articleRows, linkRows, categoryRows, regionRows] = await Promise.all([
        transaction.select({ id: articles.id, regionId: articles.regionId, categoryId: articles.categoryId, tags: articles.tags }).from(articles).where(eq(articles.organizationId, organizationId)),
        transaction.select({ articleId: articleCategories.articleId, categoryId: articleCategories.categoryId, position: articleCategories.position }).from(articleCategories).where(eq(articleCategories.organizationId, organizationId)),
        transaction.select({ id: categories.id, name: categories.name, slug: categories.slug, status: categories.status, version: categories.version, createdAt: categories.createdAt, updatedAt: categories.updatedAt }).from(categories).where(eq(categories.organizationId, organizationId)),
        transaction.select({ id: regions.id, kind: regions.kind, parentRegionId: regions.parentRegionId }).from(regions).where(eq(regions.organizationId, organizationId)),
      ]);
      const linksByArticle = new Map<string, string[]>();
      for (const link of [...linkRows].sort((a, b) => a.position - b.position)) {
        const list = linksByArticle.get(link.articleId) ?? [];
        list.push(link.categoryId);
        linksByArticle.set(link.articleId, list);
      }
      return {
        articles: articleRows.map((row) => ({ id: row.id, organizationId, regionId: row.regionId, categoryId: row.categoryId, categoryIds: linksByArticle.get(row.id) ?? [], tags: [...row.tags] })),
        categories: categoryRows.map((row) => ({ id: row.id, organizationId, name: row.name, slug: row.slug, status: row.status, version: row.version, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt) })),
        regions: regionRows.map((row) => ({ id: row.id, kind: row.kind, parentRegionId: row.parentRegionId })),
      };
    });
  }

  /**
   * Scoped publisher-claim read: one publisher plus its claim rows.
   *
   * A missing publisher denies exactly like `requireRecord` on full state.
   */
  async readPublisherClaimScope(actor: AuthorizedTenantActorContext, permission: string, publisherId: string, siteId: string): Promise<PublisherClaimScope> {
    return this.database.transaction(async (transaction) => {
      await this.establishContext(transaction, actor);
      await this.authorize(transaction, actor, permission);
      const organizationId = actor.organizationId;
      const [publisherRows, affiliationRows] = await Promise.all([
        transaction.select({ id: publishers.id, name: publishers.name, type: publishers.type, attributionLabel: publishers.attributionLabel, contacts: publishers.contacts, evidenceReference: publishers.evidenceReference, verificationStatus: publishers.verificationStatus, submittedBy: publishers.submittedBy, submittedAt: publishers.submittedAt, verifiedBy: publishers.verifiedBy, verifiedAt: publishers.verifiedAt, rejectionReason: publishers.rejectionReason, status: publishers.status, version: publishers.version, createdAt: publishers.createdAt, updatedAt: publishers.updatedAt }).from(publishers).where(and(eq(publishers.organizationId, organizationId), eq(publishers.id, publisherId))).limit(1),
        transaction.select({ id: officialAffiliations.id, publisherId: officialAffiliations.publisherId, siteId: officialAffiliations.siteId, institutionName: officialAffiliations.institutionName, claimScopes: officialAffiliations.claimScopes, evidenceReference: officialAffiliations.evidenceReference, active: officialAffiliations.active, verifiedAt: officialAffiliations.verifiedAt, version: officialAffiliations.version, createdAt: officialAffiliations.createdAt, updatedAt: officialAffiliations.updatedAt }).from(officialAffiliations).where(and(eq(officialAffiliations.organizationId, organizationId), eq(officialAffiliations.publisherId, publisherId), eq(officialAffiliations.siteId, siteId))),
      ]);
      const publisher = publisherRows[0];
      if (publisher === undefined) throw new DashboardAccessDeniedError();
      return {
        publisher: { id: publisher.id, organizationId, name: publisher.name, type: publisher.type, attributionLabel: publisher.attributionLabel, contacts: Object.fromEntries(Object.entries(publisher.contacts).map(([key, value]) => [key, String(value)])), evidenceReference: publisher.evidenceReference, verificationStatus: publisher.verificationStatus, submittedBy: publisher.submittedBy, submittedAt: optionalIso(publisher.submittedAt), verifiedBy: publisher.verifiedBy, verifiedAt: optionalIso(publisher.verifiedAt), rejectionReason: publisher.rejectionReason, status: publisher.status, version: publisher.version, createdAt: iso(publisher.createdAt), updatedAt: iso(publisher.updatedAt) },
        affiliations: affiliationRows.map((row) => ({ id: row.id, organizationId, publisherId: row.publisherId, siteId: row.siteId, institutionName: row.institutionName, claimScopes: row.claimScopes, evidenceReference: row.evidenceReference, active: row.active, verifiedAt: optionalIso(row.verifiedAt), version: row.version, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt) })),
      };
    });
  }

  /**
   * Scoped editorial read: SQL-filtered, server-ordered, keyset-paged articles.
   *
   * All manager/board filters (region, site, category, publisher, author,
   * publication state, status, tag, search) plus the sort key run in the
   * database; `body` is matched with `ILIKE` but never selected. The default
   * sort mirrors the board/manager newest-first view over
   * `COALESCE(updated, created, published, scheduled)` with an `id` tiebreak;
   * the keyset carries microsecond-exact sort keys because ISO millisecond
   * cursors demonstrably skip rows at page boundaries. `total` is an exact
   * `COUNT(*)` over the same predicates for pager totals, and `tagOptions`
   * aggregates the complete tag vocabulary under the region lock so filter
   * dropdowns never shrink to the loaded window. Assignments cover the page
   * articles and are limited to rows the UI can display (active, or published
   * for the board); dormant rows never reach the client.
   */
  async readEditorialScope(
    actor: AuthorizedTenantActorContext,
    permission: string,
    filter: { readonly regionId?: string; readonly siteId?: string; readonly siteHostname?: string; readonly categoryId?: string; readonly publisherId?: string; readonly authorId?: string; readonly publicationState?: string; readonly status?: string; readonly tag?: string; readonly search?: string; readonly sort?: 'updated' | 'published-desc' | 'published-asc' | 'title' | 'syndicated' },
    page?: { readonly limit?: number; readonly cursor?: string },
  ): Promise<EditorialScope> {
    return this.database.transaction(async (transaction) => {
      await this.establishContext(transaction, actor);
      await this.authorize(transaction, actor, permission);
      const organizationId = actor.organizationId;
      const lock = actor.regionScopeId ?? null;
      const needle = filter.search === undefined || filter.search.trim() === '' ? null : `%${filter.search.trim().replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
      const sort = filter.sort ?? 'updated';
      const limit = page?.limit === 0 ? 0 : clampLimit(page?.limit, 50, EDITORIAL_PAGE_MAX_ROWS);
      const predicates = [
        sql`a.organization_id = ${organizationId}`,
        sql`(${lock}::uuid IS NULL OR (a.region_id IS NOT NULL AND (a.region_id = ${lock}::uuid OR a.region_id IN (
          SELECT r.id FROM regions r WHERE r.organization_id = ${organizationId} AND r.parent_region_id = ${lock}::uuid))))`,
        ...(filter.regionId === undefined ? [] : [sql`a.region_id = ${filter.regionId}::uuid`]),
        ...(filter.categoryId === undefined ? [] : [sql`a.category_id = ${filter.categoryId}::uuid`]),
        ...(filter.publisherId === undefined ? [] : [sql`a.publisher_id = ${filter.publisherId}::uuid`]),
        ...(filter.authorId === undefined ? [] : [sql`a.author_id = ${filter.authorId}::uuid`]),
        ...(filter.status === undefined ? [] : [sql`a.status = ${filter.status}`]),
        ...(filter.tag === undefined ? [] : [sql`a.tags @> ARRAY[${filter.tag}]`]),
        ...((filter.siteId === undefined && filter.publicationState === undefined) ? [] : [sql`(EXISTS (
          SELECT 1 FROM article_sites s
          WHERE s.organization_id = ${organizationId} AND s.article_id = a.id AND s.active
            AND (${filter.siteId ?? null}::uuid IS NULL OR s.site_id = ${filter.siteId ?? null}::uuid)
            AND (${filter.publicationState ?? null}::text IS NULL OR s.state = ${filter.publicationState ?? null}))
          OR (${filter.siteId ?? null}::uuid IS NULL AND (${filter.publicationState ?? null}::text IS NULL
            OR a.id = ANY(indicate_private.bridge_article_ids(${organizationId}::uuid, ${filter.publicationState ?? null}::text)))))`]),
        ...(filter.siteHostname === undefined ? [] : [sql`EXISTS (
          SELECT 1 FROM article_sites s
          JOIN sites st ON st.organization_id = ${organizationId} AND st.id = s.site_id
          JOIN sites apex ON apex.organization_id = ${organizationId} AND apex.domain_id = st.domain_id
            AND apex.site_level = 'apex' AND apex.normalized_hostname = ${filter.siteHostname}
          WHERE s.organization_id = ${organizationId} AND s.article_id = a.id AND s.active)`]),
        ...(needle === null ? [] : [sql`(a.title ILIKE ${needle} ESCAPE '\\' OR a.slug ILIKE ${needle} ESCAPE '\\')`]),
      ];
      const whereAll = sql.join(predicates, sql` AND `);
      const updatedKey = sql`(EXTRACT(EPOCH FROM COALESCE(a.updated_at, a.created_at, a.published_at, a.scheduled_at)) * 1000000)::bigint`;
      const publishedKey = sql`(EXTRACT(EPOCH FROM COALESCE((SELECT max(s.published_at) FROM article_sites s WHERE s.organization_id = ${organizationId} AND s.article_id = a.id AND s.state = 'published' AND s.active), a.published_at, a.created_at)) * 1000000)::bigint`;
      const syndicatedKey = sql`((SELECT count(*)::bigint FROM article_sites s WHERE s.organization_id = ${organizationId} AND s.article_id = a.id AND s.state = 'published') + indicate_private.bridge_published_count(${organizationId}::uuid, a.id))`;
      const orderKey = sort === 'title' ? null : sort === 'syndicated' ? syndicatedKey : sort === 'published-desc' || sort === 'published-asc' ? publishedKey : updatedKey;
      const descending = sort !== 'published-asc';
      type CursorKey = { readonly key: string; readonly id: string };
      let cursor: CursorKey | null = null;
      if (page?.cursor !== undefined && /^[0-9a-fA-F-]{36}$/.test(page.cursor)) {
        const found = await transaction.execute<{ key: string; id: string }>(sql`
          SELECT ${orderKey ?? sql`a.title`} AS key, a.id FROM articles a
          WHERE a.organization_id = ${organizationId} AND a.id = ${page.cursor}::uuid LIMIT 1`);
        const row = found[0];
        if (row !== undefined) cursor = { key: String(row.key), id: row.id };
      }
      const keyPredicate = cursor === null ? sql`TRUE` : sort === 'title'
        ? sql`(a.title < ${cursor.key} OR (a.title = ${cursor.key} AND a.id < ${cursor.id}::uuid))`
        : descending
          ? sql`(${orderKey} < ${cursor.key}::bigint OR (${orderKey} = ${cursor.key}::bigint AND a.id < ${cursor.id}::uuid))`
          : sql`(${orderKey} > ${cursor.key}::bigint OR (${orderKey} = ${cursor.key}::bigint AND a.id > ${cursor.id}::uuid))`;
      const orderBy = sort === 'title'
        ? sql`a.title ASC, a.id ASC`
        : descending
          ? sql`${orderKey} DESC, a.id DESC`
          : sql`${orderKey} ASC, a.id ASC`;
      type ArticleRow = {
        id: string; region_id: string | null; publisher_id: string | null; category_id: string | null; author_id: string | null;
        lead_media_id: string | null; cover_image_url: string | null; slug: string; title: string; excerpt: string | null;
        canonical_url: string | null; source: string; tags: string[]; status: string; type: ArticleRecord['type']; is_sponsored: boolean;
        video_url: string | null; audio_url: string | null; duration_seconds: number | null;
        published_at: Date | null;
        scheduled_at: Date | null; archived_at: Date | null; version: number; created_at: Date; updated_at: Date;
      };
      const [articleRows, totalRows, tagRows, categoryRows, authorRows, publisherRows, regionRows, siteRows, domainRows] = await Promise.all([
        limit === 0 ? [] : transaction.execute<ArticleRow>(sql`
          SELECT a.id, a.region_id, a.publisher_id, a.category_id, a.author_id, a.lead_media_id, a.cover_image_url,
            a.slug, a.title, a.excerpt, a.canonical_url, a.source, a.tags, a.status, a.type, a.is_sponsored,
            a.video_url, a.audio_url, a.duration_seconds,
            a.published_at, a.scheduled_at,
            a.archived_at, a.version, a.created_at, a.updated_at
          FROM articles a
          WHERE ${whereAll} AND ${keyPredicate}
          ORDER BY ${orderBy}
          LIMIT ${limit + 1}`),
        transaction.execute<{ count: number }>(sql`SELECT count(*)::int AS count FROM articles a WHERE ${whereAll}`),
        transaction.execute<{ tag: string; count: number }>(sql`
          SELECT t.tag AS tag, count(*)::int AS count FROM articles a, unnest(a.tags) AS t(tag)
          WHERE a.organization_id = ${organizationId}
            AND (${lock}::uuid IS NULL OR (a.region_id IS NOT NULL AND (a.region_id = ${lock}::uuid OR a.region_id IN (
              SELECT r.id FROM regions r WHERE r.organization_id = ${organizationId} AND r.parent_region_id = ${lock}::uuid))))
          GROUP BY t.tag ORDER BY count DESC, t.tag`),
        transaction.select({ id: categories.id, name: categories.name, slug: categories.slug, status: categories.status, version: categories.version, createdAt: categories.createdAt, updatedAt: categories.updatedAt }).from(categories).where(eq(categories.organizationId, organizationId)),
        transaction.select({ id: authors.id, displayName: authors.displayName, byline: authors.byline, status: authors.status, version: authors.version, createdAt: authors.createdAt, updatedAt: authors.updatedAt }).from(authors).where(eq(authors.organizationId, organizationId)),
        transaction.select({ id: publishers.id, name: publishers.name, attributionLabel: publishers.attributionLabel, status: publishers.status }).from(publishers).where(eq(publishers.organizationId, organizationId)),
        transaction.select({ id: regions.id, externalKey: regions.externalKey, name: regions.name, shortName: regions.shortName, slug: regions.slug, status: regions.status, kind: regions.kind, parentRegionId: regions.parentRegionId, version: regions.version, createdAt: regions.createdAt, updatedAt: regions.updatedAt }).from(regions).where(eq(regions.organizationId, organizationId)),
        transaction.select({ id: sites.id, domainId: sites.domainId, regionId: sites.regionId, siteLevel: sites.siteLevel, parentSiteId: sites.parentSiteId, normalizedHostname: sites.normalizedHostname, status: sites.status, activationState: sites.activationState, version: sites.version, createdAt: sites.createdAt, updatedAt: sites.updatedAt }).from(sites).where(eq(sites.organizationId, organizationId)),
        transaction.select({ id: domains.id, normalizedHostname: domains.normalizedHostname }).from(domains).where(eq(domains.organizationId, organizationId)),
      ]);
      const pageRows = limit === 0 ? [] : articleRows.slice(0, limit);
      const articleIds = pageRows.map((row) => row.id);
      const [linkRows, assignmentRows] = articleIds.length === 0
        ? [[], []] as const
        : await Promise.all([
          transaction.select({ articleId: articleCategories.articleId, categoryId: articleCategories.categoryId, position: articleCategories.position }).from(articleCategories).where(and(eq(articleCategories.organizationId, organizationId), inArray(articleCategories.articleId, articleIds))).orderBy(articleCategories.position),
          transaction.select({ id: articleSites.id, articleId: articleSites.articleId, siteId: articleSites.siteId, state: articleSites.state, stateOccurredAt: articleSites.stateOccurredAt, publishedUrl: articleSites.publishedUrl, publishedAt: articleSites.publishedAt, active: articleSites.active, viewCount: articleSites.viewCount, assignmentSource: articleSites.assignmentSource, expandedFromSiteId: articleSites.expandedFromSiteId, customCanonicalUrl: articleSites.customCanonicalUrl, version: articleSites.version, createdAt: articleSites.createdAt, updatedAt: articleSites.updatedAt }).from(articleSites).where(and(eq(articleSites.organizationId, organizationId), inArray(articleSites.articleId, articleIds), or(eq(articleSites.active, true), eq(articleSites.state, 'published')))),
        ]);
      const categoryIdsByArticle = new Map<string, string[]>();
      for (const link of linkRows) {
        const list = categoryIdsByArticle.get(link.articleId) ?? [];
        list.push(link.categoryId);
        categoryIdsByArticle.set(link.articleId, list);
      }
      const bridgeRows = articleIds.length === 0 || filter.publicationState === undefined ? [] : await transaction.execute<{
        source_article_id: string; url: string; published_at: Date | string;
      }>(sql`SELECT * FROM indicate_private.list_own_bridge_urls(${organizationId}::uuid, ${sqlStringArray(articleIds)}::uuid[])`);
      const bridgeByArticle = new Map<string, { urls: string[]; publishedAtMax: string | null }>();
      for (const row of bridgeRows) {
        const entry = bridgeByArticle.get(row.source_article_id) ?? { urls: [], publishedAtMax: null };
        entry.urls.push(row.url);
        const at = optionalIsoOf(row.published_at);
        if (at !== null && (entry.publishedAtMax === null || at > entry.publishedAtMax)) entry.publishedAtMax = at;
        bridgeByArticle.set(row.source_article_id, entry);
      }
      const bridgePublished = [...bridgeByArticle].map(([articleId, entry]) => ({
        articleId, urls: [...new Set(entry.urls)].sort((left, right) => left.localeCompare(right)), publishedAtMax: entry.publishedAtMax,
      }));
      const articles = pageRows.map((row) => ({ id: row.id, organizationId, regionId: row.region_id, publisherId: row.publisher_id, categoryId: row.category_id, categoryIds: categoryIdsByArticle.get(row.id) ?? [], authorId: row.author_id, leadMediaId: row.lead_media_id, coverImageUrl: row.cover_image_url, slug: row.slug, title: row.title, excerpt: row.excerpt, canonicalUrl: row.canonical_url, body: '', bodyJson: null, source: row.source, tags: [...row.tags], status: row.status as ArticleRecord['status'], type: row.type, isSponsored: row.is_sponsored, videoUrl: row.video_url, audioUrl: row.audio_url, durationSeconds: row.duration_seconds, publishedAt: optionalIsoOf(row.published_at), scheduledAt: optionalIsoOf(row.scheduled_at), archivedAt: optionalIsoOf(row.archived_at), version: row.version, createdAt: isoOf(row.created_at), updatedAt: isoOf(row.updated_at) }));
      const lastConsumed = articles.length > 0 ? (articleIds[articleIds.length - 1] as string) : null;
      return {
        articles,
        articlesNextCursor: articleRows.length > limit && lastConsumed !== null ? lastConsumed : null,
        total: totalRows[0]?.count ?? 0,
        tagOptions: tagRows.map((row) => ({ tag: row.tag, count: row.count })),
        articleSites: assignmentRows.map((row) => ({ id: row.id, organizationId, articleId: row.articleId, siteId: row.siteId, state: row.state, stateOccurredAt: iso(row.stateOccurredAt), publishedUrl: row.publishedUrl, publishedAt: optionalIso(row.publishedAt), active: row.active, viewCount: row.viewCount, assignmentSource: row.assignmentSource as 'manual' | 'auto', expandedFromSiteId: row.expandedFromSiteId, customCanonicalUrl: row.customCanonicalUrl, version: row.version, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt) })),
        bridgePublished,
        categories: categoryRows.map((row) => ({ id: row.id, organizationId, name: row.name, slug: row.slug, status: row.status, version: row.version, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt) })),
        authors: authorRows.map((row) => ({ id: row.id, organizationId, displayName: row.displayName, byline: row.byline, status: row.status, version: row.version, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt) })),
        publishers: publisherRows.map((row) => ({ id: row.id, name: row.name, attributionLabel: row.attributionLabel, status: row.status, ownerOrganizationId: null as string | null })),
        regions: regionRows.map((row) => ({ id: row.id, organizationId, externalKey: row.externalKey, name: row.name, shortName: row.shortName, slug: row.slug, status: row.status, kind: row.kind, parentRegionId: row.parentRegionId, version: row.version, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt) })),
        sites: siteRows.map((row) => ({ id: row.id, organizationId, domainId: row.domainId, regionId: row.regionId, siteLevel: row.siteLevel, parentSiteId: row.parentSiteId, normalizedHostname: row.normalizedHostname, status: row.status, activationState: row.activationState, version: row.version, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt) })),
        domains: domainRows.map((row) => ({ id: row.id, normalizedHostname: row.normalizedHostname })),
      };
    });
  }

  /**
   * Cross-org steward editorial read: bodyless articles across active organizations.
   *
   * Only the platform super-admin grant may call; region-locked actors are
   * denied even with the grant. Both SECURITY DEFINER calls bypass tenant RLS
   * by design and filter explicitly (active organizations only, optional
   * status/tag/search/publication predicates). Bodies are selected nowhere.
   */
  async readCrossOrgEditorialScope(
    actor: AuthorizedTenantActorContext,
    filter: CrossOrgArticleFilter,
    page?: { readonly limit?: number; readonly cursor?: string },
  ): Promise<CrossOrgEditorialScope> {
    if (actor.platformPermissionSet?.has(INTEGRATIONS_PERMISSIONS.superAdmin) !== true) throw new DashboardAccessDeniedError();
    if (actor.regionScopeId !== null && actor.regionScopeId !== undefined) throw new DashboardAccessDeniedError();
    const limit = page?.limit === 0 ? 0 : clampLimit(page?.limit, 50, EDITORIAL_PAGE_MAX_ROWS);
    const cursor = page?.cursor !== undefined && /^[0-9a-fA-F-]{36}$/.test(page.cursor) ? page.cursor : null;
    type CrossOrgRow = {
      organization_id: string; org_slug: string; org_name: string; id: string;
      region_id: string | null; publisher_id: string | null; category_id: string | null; author_id: string | null;
      lead_media_id: string | null; cover_image_url: string | null; slug: string; title: string; excerpt: string | null;
      canonical_url: string | null; source: string; tags: string[]; status: ArticleRecord['status']; article_type: string;
      is_sponsored: boolean; video_url: string | null; audio_url: string | null; duration_seconds: number | null;
      published_at: Date | string | null; scheduled_at: Date | string | null; archived_at: Date | string | null;
      version: number; created_at: Date | string; updated_at: Date | string;
      category_ids: string[]; category_names: string[]; portal_hostnames: string[]; published_urls: string[];
      published_at_max: Date | string | null;
    };
    const status = filter.status ?? null;
    const search = filter.search?.trim() === '' || filter.search === undefined ? null : filter.search;
    const tag = filter.tag ?? null;
    const sort = filter.sort ?? 'published-desc';
    const publicationState = filter.publicationState ?? null;
    const [rows, counts] = await Promise.all([
      limit === 0 ? [] : this.database.execute<CrossOrgRow>(sql`SELECT * FROM indicate_private.list_cross_org_articles(${status}, ${search}, ${tag}, ${sort}, ${publicationState}, ${limit}, ${cursor})`),
      this.database.execute<{ count: number }>(sql`SELECT indicate_private.count_cross_org_articles(${status}, ${search}, ${tag}, ${publicationState}) AS count`),
    ]);
    const pageRows = limit === 0 ? [] : rows.slice(0, limit);
    const articles = pageRows.map((row) => ({
      id: row.id, organizationId: row.organization_id, regionId: row.region_id, publisherId: row.publisher_id,
      categoryId: row.category_id, categoryIds: [...(row.category_ids ?? [])], authorId: row.author_id,
      leadMediaId: row.lead_media_id, coverImageUrl: row.cover_image_url, slug: row.slug, title: row.title,
      excerpt: row.excerpt, canonicalUrl: row.canonical_url, body: '', bodyJson: null,
      source: row.source, tags: [...(row.tags ?? [])], status: row.status,
      type: row.article_type as ArticleRecord['type'], isSponsored: row.is_sponsored,
      videoUrl: row.video_url, audioUrl: row.audio_url, durationSeconds: row.duration_seconds,
      publishedAt: optionalIsoOf(row.published_at), scheduledAt: optionalIsoOf(row.scheduled_at),
      archivedAt: optionalIsoOf(row.archived_at), version: row.version,
      createdAt: isoOf(row.created_at), updatedAt: isoOf(row.updated_at),
      orgSlug: row.org_slug, orgName: row.org_name,
      categoryNames: [...(row.category_names ?? [])], portalHostnames: [...(row.portal_hostnames ?? [])],
      publishedUrls: [...(row.published_urls ?? [])], publishedAtMax: optionalIsoOf(row.published_at_max),
    }));
    const lastConsumed = articles.length > 0 ? (articles[articles.length - 1] as { readonly id: string }).id : null;
    return {
      articles,
      articlesNextCursor: rows.length > limit && lastConsumed !== null ? lastConsumed : null,
      total: counts[0]?.count ?? 0,
    };
  }

  /**
   * Scoped network-article read: one site plus its published articles.
   *
   * Mirrors `selectNetworkArticles` in SQL: the site must exist and be active,
   * articles must be active with an active region (or none) and an active
   * published assignment for the site. Bodies are matched but never selected.
   */
  async readNetworkArticlesScope(
    actor: AuthorizedTenantActorContext,
    permission: string,
    siteId: string,
    filter: { readonly regionId?: string; readonly categoryId?: string; readonly publisherId?: string; readonly authorId?: string; readonly search?: string },
  ): Promise<NetworkArticlesScope> {
    return this.database.transaction(async (transaction) => {
      await this.establishContext(transaction, actor);
      await this.authorize(transaction, actor, permission);
      const organizationId = actor.organizationId;
      const lock = actor.regionScopeId ?? null;
      const needle = filter.search === undefined || filter.search.trim() === '' ? null : `%${filter.search.trim().replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
      const [siteRows, regionRows, publisherRows, affiliationRows, categoryRows, authorRows] = await Promise.all([
        transaction.select({ id: sites.id, domainId: sites.domainId, regionId: sites.regionId, siteLevel: sites.siteLevel, parentSiteId: sites.parentSiteId, normalizedHostname: sites.normalizedHostname, status: sites.status, activationState: sites.activationState, version: sites.version, createdAt: sites.createdAt, updatedAt: sites.updatedAt }).from(sites).where(and(eq(sites.organizationId, organizationId), eq(sites.id, siteId))).limit(1),
        transaction.select({ id: regions.id, externalKey: regions.externalKey, name: regions.name, shortName: regions.shortName, slug: regions.slug, status: regions.status, kind: regions.kind, parentRegionId: regions.parentRegionId, version: regions.version, createdAt: regions.createdAt, updatedAt: regions.updatedAt }).from(regions).where(eq(regions.organizationId, organizationId)),
        transaction.select({ id: publishers.id, name: publishers.name, type: publishers.type, attributionLabel: publishers.attributionLabel, contacts: publishers.contacts, evidenceReference: publishers.evidenceReference, verificationStatus: publishers.verificationStatus, submittedBy: publishers.submittedBy, submittedAt: publishers.submittedAt, verifiedBy: publishers.verifiedBy, verifiedAt: publishers.verifiedAt, rejectionReason: publishers.rejectionReason, status: publishers.status, version: publishers.version, createdAt: publishers.createdAt, updatedAt: publishers.updatedAt }).from(publishers).where(eq(publishers.organizationId, organizationId)),
        transaction.select({ id: officialAffiliations.id, publisherId: officialAffiliations.publisherId, siteId: officialAffiliations.siteId, institutionName: officialAffiliations.institutionName, claimScopes: officialAffiliations.claimScopes, evidenceReference: officialAffiliations.evidenceReference, active: officialAffiliations.active, verifiedAt: officialAffiliations.verifiedAt, version: officialAffiliations.version, createdAt: officialAffiliations.createdAt, updatedAt: officialAffiliations.updatedAt }).from(officialAffiliations).where(and(eq(officialAffiliations.organizationId, organizationId), eq(officialAffiliations.siteId, siteId))),
        transaction.select({ id: categories.id }).from(categories).where(eq(categories.organizationId, organizationId)),
        transaction.select({ id: authors.id }).from(authors).where(eq(authors.organizationId, organizationId)),
      ]);
      const siteRow = siteRows[0];
      if (siteRow === undefined) throw new DashboardAccessDeniedError();
      const site = { id: siteRow.id, organizationId, domainId: siteRow.domainId, regionId: siteRow.regionId, siteLevel: siteRow.siteLevel, parentSiteId: siteRow.parentSiteId, normalizedHostname: siteRow.normalizedHostname, status: siteRow.status, activationState: siteRow.activationState, version: siteRow.version, createdAt: iso(siteRow.createdAt), updatedAt: iso(siteRow.updatedAt) };
      const geography = regionRows.map((row) => ({ id: row.id, kind: row.kind, parentRegionId: row.parentRegionId }));
      if (!regionScopeCovers(lock, site.regionId, geography)) throw new DashboardAccessDeniedError();
      const regionRecords = regionRows.map((row) => ({ id: row.id, organizationId, externalKey: row.externalKey, name: row.name, shortName: row.shortName, slug: row.slug, status: row.status, kind: row.kind, parentRegionId: row.parentRegionId, version: row.version, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt) }));
      const emptyScope: NetworkArticlesScope = {
        site, articles: [], articleSites: [],
        publishers: publisherRows.map((row) => ({ id: row.id, organizationId, name: row.name, type: row.type, attributionLabel: row.attributionLabel, contacts: Object.fromEntries(Object.entries(row.contacts).map(([key, value]) => [key, String(value)])), evidenceReference: row.evidenceReference, verificationStatus: row.verificationStatus, submittedBy: row.submittedBy, submittedAt: optionalIso(row.submittedAt), verifiedBy: row.verifiedBy, verifiedAt: optionalIso(row.verifiedAt), rejectionReason: row.rejectionReason, status: row.status, version: row.version, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt) })),
        affiliations: affiliationRows.map((row) => ({ id: row.id, organizationId, publisherId: row.publisherId, siteId: row.siteId, institutionName: row.institutionName, claimScopes: row.claimScopes, evidenceReference: row.evidenceReference, active: row.active, verifiedAt: optionalIso(row.verifiedAt), version: row.version, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt) })),
        regions: regionRecords,
        categoryIds: categoryRows.map((row) => row.id),
        authorIds: authorRows.map((row) => row.id),
      };
      if (site.status !== 'active' || site.activationState !== 'active') return emptyScope;
      if (site.regionId !== null && !regionRecords.some((region) => region.id === site.regionId && region.status === 'active')) return emptyScope;
      const articleRows = await transaction.execute<{
        id: string; region_id: string | null; publisher_id: string | null; category_id: string | null; author_id: string | null;
        lead_media_id: string | null; cover_image_url: string | null; slug: string; title: string; excerpt: string | null;
        canonical_url: string | null; source: string; tags: string[]; status: string; type: ArticleRecord['type']; is_sponsored: boolean;
        published_at: Date | null;
        scheduled_at: Date | null; archived_at: Date | null; version: number; created_at: Date; updated_at: Date;
      }>(sql`
        SELECT a.id, a.region_id, a.publisher_id, a.category_id, a.author_id, a.lead_media_id, a.cover_image_url,
          a.slug, a.title, a.excerpt, a.canonical_url, a.source, a.tags, a.status, a.type, a.is_sponsored,
          a.published_at, a.scheduled_at,
          a.archived_at, a.version, a.created_at, a.updated_at
        FROM articles a
        WHERE a.organization_id = ${organizationId}
          AND a.status = 'active'
          AND (${lock}::uuid IS NULL OR (a.region_id IS NOT NULL AND (a.region_id = ${lock}::uuid OR a.region_id IN (
            SELECT r.id FROM regions r WHERE r.organization_id = ${organizationId} AND r.parent_region_id = ${lock}::uuid))))
          AND (a.region_id IS NULL OR EXISTS (
            SELECT 1 FROM regions r WHERE r.organization_id = ${organizationId} AND r.id = a.region_id AND r.status = 'active'))
          AND (${filter.regionId ?? null}::uuid IS NULL OR a.region_id = ${filter.regionId ?? null}::uuid)
          AND (${filter.categoryId ?? null}::uuid IS NULL OR a.category_id = ${filter.categoryId ?? null}::uuid)
          AND (${filter.publisherId ?? null}::uuid IS NULL OR a.publisher_id = ${filter.publisherId ?? null}::uuid)
          AND (${filter.authorId ?? null}::uuid IS NULL OR a.author_id = ${filter.authorId ?? null}::uuid)
          AND (${needle} IS NULL OR (a.title ILIKE ${needle} ESCAPE '\\' OR a.source ILIKE ${needle} ESCAPE '\\' OR a.body ILIKE ${needle} ESCAPE '\\'))
          AND EXISTS (
            SELECT 1 FROM article_sites s
            WHERE s.organization_id = ${organizationId} AND s.article_id = a.id AND s.site_id = ${siteId}::uuid AND s.active AND s.state = 'published')`);
      const articleIds = articleRows.map((row) => row.id);
      const linkRows = articleIds.length === 0 ? [] : await transaction.select({ articleId: articleCategories.articleId, categoryId: articleCategories.categoryId, position: articleCategories.position }).from(articleCategories).where(and(eq(articleCategories.organizationId, organizationId), inArray(articleCategories.articleId, articleIds))).orderBy(articleCategories.position);
      const categoryIdsByArticle = new Map<string, string[]>();
      for (const link of linkRows) {
        const list = categoryIdsByArticle.get(link.articleId) ?? [];
        list.push(link.categoryId);
        categoryIdsByArticle.set(link.articleId, list);
      }
      return {
        ...emptyScope,
        articles: articleRows.map((row) => ({ id: row.id, organizationId, regionId: row.region_id, publisherId: row.publisher_id, categoryId: row.category_id, categoryIds: categoryIdsByArticle.get(row.id) ?? [], authorId: row.author_id, leadMediaId: row.lead_media_id, coverImageUrl: row.cover_image_url, slug: row.slug, title: row.title, excerpt: row.excerpt, canonicalUrl: row.canonical_url, body: '', bodyJson: null, source: row.source, tags: [...row.tags], status: row.status as ArticleRecord['status'], type: row.type, isSponsored: row.is_sponsored, videoUrl: null, audioUrl: null, durationSeconds: null, publishedAt: optionalIsoOf(row.published_at), scheduledAt: optionalIsoOf(row.scheduled_at), archivedAt: optionalIsoOf(row.archived_at), version: row.version, createdAt: isoOf(row.created_at), updatedAt: isoOf(row.updated_at) })),
      };
    });
  }

  async listEditorialSummaries(actor: AuthorizedTenantActorContext, permission: string): Promise<EditorialSummaries> {
    return this.database.transaction(async (transaction) => {
      await this.establishContext(transaction, actor);
      await this.authorize(transaction, actor, permission);
      const organizationId = actor.organizationId;
      const [articleRows, siteRows, regionRows] = await Promise.all([
        transaction.select({ id: articles.id, regionId: articles.regionId, slug: articles.slug, title: articles.title, status: articles.status, createdAt: articles.createdAt }).from(articles).where(eq(articles.organizationId, organizationId)).orderBy(desc(articles.createdAt)),
        transaction.select({ id: sites.id, regionId: sites.regionId, normalizedHostname: sites.normalizedHostname, status: sites.status }).from(sites).where(eq(sites.organizationId, organizationId)),
        transaction.select({ id: regions.id, name: regions.name, kind: regions.kind, parentRegionId: regions.parentRegionId, status: regions.status }).from(regions).where(eq(regions.organizationId, organizationId)),
      ]);
      const scope = actor.regionScopeId === null || actor.regionScopeId === undefined ? null : regionRows.find((row) => row.id === actor.regionScopeId);
      return Object.freeze({
        articles: Object.freeze(articleRows.map((row) => Object.freeze({ id: row.id, regionId: row.regionId, slug: row.slug, title: row.title, status: row.status, createdAt: iso(row.createdAt) }))),
        sites: Object.freeze(siteRows.map((row) => Object.freeze({ id: row.id, regionId: row.regionId, normalizedHostname: row.normalizedHostname, status: row.status }))),
        regions: Object.freeze(regionRows.map((row) => Object.freeze({ id: row.id, name: row.name, kind: row.kind, parentRegionId: row.parentRegionId, status: row.status }))),
        regionScope: scope === undefined || scope === null ? null : { id: scope.id, name: scope.name },
      });
    });
  }

  async searchArticleSummaries(actor: AuthorizedTenantActorContext, permission: string, keyword: string, limit: number): Promise<readonly EditorialSummaryArticle[]> {
    return this.database.transaction(async (transaction) => {
      await this.establishContext(transaction, actor);
      await this.authorize(transaction, actor, permission);
      const bounded = Math.max(1, Math.min(Math.floor(limit), 20));
      const like = `%${keyword.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
      const scope = actor.regionScopeId ?? null;
      const rows = await transaction.execute<{
        readonly id: string; readonly regionId: string | null; readonly slug: string; readonly title: string;
        readonly status: EditorialSummaryArticle['status']; readonly createdAt: Date;
      }>(sql`
        SELECT id, region_id AS "regionId", slug, title, status, created_at AS "createdAt"
        FROM articles
        WHERE organization_id = ${actor.organizationId}
          AND (${scope}::uuid IS NULL OR region_id = ${scope}::uuid)
          AND (title ILIKE ${like} ESCAPE '\' OR body ILIKE ${like} ESCAPE '\')
        ORDER BY created_at DESC
        LIMIT ${bounded}`);
      return Object.freeze(rows.map((row) => Object.freeze({ id: row.id, regionId: row.regionId, slug: row.slug, title: row.title, status: row.status, createdAt: isoOf(row.createdAt) })));
    });
  }

  async dashboardCounts(actor: AuthorizedTenantActorContext, permission: string): Promise<DashboardProjection> {
    return this.database.transaction(async (transaction) => {
      await this.establishContext(transaction, actor);
      await this.authorize(transaction, actor, permission);
      const organization = await transaction.select({ id: organizations.id }).from(organizations).where(and(eq(organizations.id, actor.organizationId), eq(organizations.status, 'active'))).limit(1);
      if (organization.length !== 1) throw new DashboardAccessDeniedError();
      const [row] = await transaction.execute<{
        readonly activeDomains: number; readonly activeSubdomains: number; readonly activeSites: number; readonly activeArticles: number; readonly archivedArticles: number;
        readonly jobsQueued: number; readonly jobsProcessing: number; readonly jobsPublished: number; readonly jobsFailed: number; readonly jobsRetrying: number;
        readonly successfulSiteOutcomes: number; readonly failedSiteOutcomes: number; readonly activeMedia: number;
      }>(sql`
        SELECT
          (SELECT count(*)::int FROM domains WHERE organization_id = ${actor.organizationId} AND status = 'active') AS "activeDomains",
          (SELECT count(*)::int FROM sites s JOIN domains d ON d.organization_id = ${actor.organizationId} AND d.id = s.domain_id WHERE s.organization_id = ${actor.organizationId} AND s.status = 'active' AND s.normalized_hostname <> d.normalized_hostname) AS "activeSubdomains",
          (SELECT count(*)::int FROM sites WHERE organization_id = ${actor.organizationId} AND status = 'active') AS "activeSites",
          (SELECT count(*)::int FROM articles WHERE organization_id = ${actor.organizationId} AND status = 'active') AS "activeArticles",
          (SELECT count(*)::int FROM articles WHERE organization_id = ${actor.organizationId} AND status = 'archived') AS "archivedArticles",
          (SELECT count(*)::int FROM publishing_jobs WHERE organization_id = ${actor.organizationId} AND state = 'queued') AS "jobsQueued",
          (SELECT count(*)::int FROM publishing_jobs WHERE organization_id = ${actor.organizationId} AND state = 'processing') AS "jobsProcessing",
          (SELECT count(*)::int FROM publishing_jobs WHERE organization_id = ${actor.organizationId} AND state = 'published') AS "jobsPublished",
          (SELECT count(*)::int FROM publishing_jobs WHERE organization_id = ${actor.organizationId} AND state = 'failed') AS "jobsFailed",
          (SELECT count(*)::int FROM publishing_jobs WHERE organization_id = ${actor.organizationId} AND state = 'retrying') AS "jobsRetrying",
          (SELECT count(*)::int FROM article_sites WHERE organization_id = ${actor.organizationId} AND state = 'published') AS "successfulSiteOutcomes",
          (SELECT count(*)::int FROM article_sites WHERE organization_id = ${actor.organizationId} AND state = 'failed') AS "failedSiteOutcomes",
          (SELECT count(*)::int FROM media WHERE organization_id = ${actor.organizationId} AND state = 'active') AS "activeMedia"
      `);
      if (row === undefined) throw new DashboardAccessDeniedError();
      const scope = actor.regionScopeId ?? null;
      const scopeRows = scope === null ? [] : await transaction.select({ id: regions.id, name: regions.name }).from(regions).where(and(eq(regions.organizationId, actor.organizationId), eq(regions.id, scope))).limit(1);
      const scopeRow = scopeRows[0];
      return Object.freeze({
        activeDomains: row.activeDomains,
        activeSubdomains: row.activeSubdomains,
        activeSites: row.activeSites,
        activeArticles: row.activeArticles,
        archivedArticles: row.archivedArticles,
        jobsByState: { queued: row.jobsQueued, processing: row.jobsProcessing, published: row.jobsPublished, failed: row.jobsFailed, retrying: row.jobsRetrying } as DashboardProjection['jobsByState'],
        successfulSiteOutcomes: row.successfulSiteOutcomes,
        failedSiteOutcomes: row.failedSiteOutcomes,
        activeMedia: row.activeMedia,
        regionScope: scopeRow === undefined ? null : { id: scopeRow.id, name: scopeRow.name },
      });
    });
  }

  async recordDenied(actor: AuthorizedTenantActorContext, action: string, targetType: string): Promise<void> {
    await this.database.transaction(async (transaction) => {
      await this.establishContext(transaction, actor);
      const organization = await transaction.select({ id: organizations.id }).from(organizations).where(eq(organizations.id, actor.organizationId)).limit(1);
      if (organization.length === 0) return;
      const attributable = actor.actorType === 'user'
        ? (await transaction.select({ id: users.id }).from(users).where(eq(users.id, actor.actorId)).limit(1)).length === 1
        : actor.actorType === 'api_key'
          ? (await transaction.select({ id: apiKeys.id }).from(apiKeys).where(and(eq(apiKeys.organizationId, actor.organizationId), eq(apiKeys.id, actor.actorId), eq(apiKeys.status, 'active'), or(isNull(apiKeys.expiresAt), gt(apiKeys.expiresAt, new Date())))).limit(1)).length === 1
          : (await transaction.select({ id: publishingJobs.id }).from(publishingJobs).where(and(eq(publishingJobs.organizationId, actor.organizationId), eq(publishingJobs.id, actor.actorId), eq(publishingJobs.dispatchStatus, 'leased'), isNotNull(publishingJobs.leaseOwner), gt(publishingJobs.leaseExpiresAt, new Date()))).limit(1)).length === 1;
      if (!attributable) return;
      await transaction.insert(auditLogs).values({ organizationId: actor.organizationId, id: crypto.randomUUID(), actorType: actor.actorType, actorId: actor.actorId, entryPoint: actor.entryPoint, action, targetType, outcome: 'denied', changedFields: [], requestId: actor.requestId });
    });
  }

  async execute<T>(actor: AuthorizedTenantActorContext, permission: string, operation: (transaction: DashboardTransaction) => T | Promise<T>, scope?: readonly DashboardCollectionName[]): Promise<T> {
    return this.runScoped(actor, actor.organizationId, { membershipPermission: permission }, operation, scope);
  }

  /**
   * Run a mutation in another organization's context for platform stewards.
   *
   * @param actor - Calling actor; must carry the platform super-admin grant.
   * @param targetOrganizationId - Organization owning the rows being written.
   * @param operation - Mutation against the target organization's state.
   * @param scope - Collections to hydrate, same contract as `execute()`.
   * @returns Whatever the operation returns.
   * @remarks Single-org `execute()` cannot serve "create on behalf of" flows:
   * context, authorization, subscription gate, and state all derive from the
   * actor org. This variant re-anchors all four to the target org while the
   * audit trail keeps the calling admin as actor. Membership authorization is
   * replaced by the platform grant check, so stewards need no membership in
   * every customer org they serve.
   */
  async executeForOrganization<T>(actor: AuthorizedTenantActorContext, targetOrganizationId: string, operation: (transaction: DashboardTransaction) => T | Promise<T>, scope?: readonly DashboardCollectionName[]): Promise<T> {
    return this.runScoped(actor, targetOrganizationId, { platformManaged: true }, operation, scope);
  }

  /**
   * Resolve an active organization id by slug across org boundaries.
   *
   * @param actor - Calling actor; must carry the platform super-admin grant.
   * @param slug - Organization slug to resolve.
   * @returns Organization id, or null when no active org carries the slug.
   */
  async findOrganizationBySlug(actor: AuthorizedTenantActorContext, slug: string): Promise<string | null> {
    if (actor.platformPermissionSet?.has(INTEGRATIONS_PERMISSIONS.superAdmin) !== true) throw new DashboardAccessDeniedError();
    const rows = await this.database.transaction(async (transaction) => {
      await this.establishContext(transaction, actor);
      return transaction.execute<{ id: string }>(sql`SELECT id FROM indicate_private.find_organization_by_slug(${slug})`);
    });
    return rows[0]?.id ?? null;
  }

  /**
   * Terbitkan artikel milik org lain ke portal org aktif (jembatan lintas-org).
   *
   * @param actor - Steward pemanggil; wajib membawa grant platform super_admin.
   * @param input - Org pemilik, artikel, dan situs penyaji tujuan.
   * @returns Id baris bridge dan slug untuk invalidasi.
   * @remarks Dua transaksi terpisah karena satu transaksi hanya boleh satu
   * konteks tenant: pertama membalik artikel pemilik menjadi aktif (audit di
   * org pemilik), kedua menulis baris `portal_assignments` berstatus published
   * di org penyaji (audit + invalidasi di org penyaji). Sinkron, tanpa antrean
   * pekerja: penayangan bridge murni flip status DB, tanpa handshake origin.
   */
  async requestBridgePublication(actor: AuthorizedTenantActorContext, input: { readonly ownerOrganizationId: string; readonly articleId: string; readonly siteIds: readonly string[]; readonly viewCount?: number | undefined }): Promise<{ readonly bridgeIds: readonly string[]; readonly slug: string }> {
    if (actor.platformPermissionSet?.has(INTEGRATIONS_PERMISSIONS.superAdmin) !== true) throw new DashboardAccessDeniedError();
    const siteIds = [...new Set(input.siteIds)].sort();
    if (siteIds.length === 0 || siteIds.length > 200) throw new DashboardAccessDeniedError();
    const now = new Date();
    const ownerActor: AuthorizedTenantActorContext = { ...actor, organizationId: input.ownerOrganizationId, regionScopeId: null };
    const flipped = await this.executeForOrganization(ownerActor, input.ownerOrganizationId, (transaction) => {
      const result = this.flipOwnerArticleForBridge(transaction, input.articleId, now);
      return { slug: result.slug, title: result.title };
    }, ['articles']);
    const bridgeIds = await this.database.transaction(async (transaction) => {
      await this.establishContext(transaction, actor);
      if (actor.platformPermissionSet?.has(INTEGRATIONS_PERMISSIONS.superAdmin) !== true) throw new DashboardAccessDeniedError();
      const siteRows = await transaction.select({ id: sites.id, normalizedHostname: sites.normalizedHostname }).from(sites).where(and(eq(sites.organizationId, actor.organizationId), inArray(sites.id, siteIds), eq(sites.status, 'active'))).limit(siteIds.length);
      if (siteRows.length !== siteIds.length) throw new DashboardAccessDeniedError();
      return this.insertPublishedBridge(transaction, actor, input.ownerOrganizationId, input.articleId, flipped.slug, siteRows, now, 'publication.bridge.request', input.viewCount);
    });
    return { bridgeIds, slug: flipped.slug };
  }

  /**
   * Tarik penayangan jembatan; artikel pemilik tidak diubah.
   *
   * @param actor - Steward pemanggil; wajib membawa grant platform super_admin.
   * @param input - Org pemilik, artikel, dan situs yang ditarik (kosong = semua).
   * @returns Jumlah baris bridge yang diturunkan.
   */
  async unpublishBridge(actor: AuthorizedTenantActorContext, input: { readonly ownerOrganizationId: string; readonly articleId: string; readonly siteIds: readonly string[] }): Promise<{ readonly unpublished: number }> {
    if (actor.platformPermissionSet?.has(INTEGRATIONS_PERMISSIONS.superAdmin) !== true) throw new DashboardAccessDeniedError();
    const now = new Date();
    return this.database.transaction(async (transaction) => {
      await this.establishContext(transaction, actor);
      const siteFilter = input.siteIds.length === 0 ? undefined : inArray(portalAssignments.siteId, [...input.siteIds]);
      const unpublished = await transaction.update(portalAssignments)
        .set({ state: 'unpublished', stateOccurredAt: now, updatedAt: now, version: sql`${portalAssignments.version} + 1` })
        .where(and(eq(portalAssignments.organizationId, actor.organizationId), eq(portalAssignments.sourceOrganizationId, input.ownerOrganizationId), eq(portalAssignments.sourceArticleId, input.articleId), eq(portalAssignments.state, 'published'), ...(siteFilter === undefined ? [] : [siteFilter])))
        .returning({ id: portalAssignments.id, siteId: portalAssignments.siteId });
      const slugs = await transaction.select({ slug: articles.slug }).from(articles).where(and(eq(articles.organizationId, input.ownerOrganizationId), eq(articles.id, input.articleId))).limit(1);
      const hostnames = unpublished.length === 0 ? [] : await transaction.select({ id: sites.id, normalizedHostname: sites.normalizedHostname }).from(sites).where(and(eq(sites.organizationId, actor.organizationId), inArray(sites.id, unpublished.map((row) => row.siteId)))).limit(unpublished.length);
      for (const site of hostnames) {
        await transaction.insert(invalidationTasks).values(completeInvalidationValues({ organizationId: actor.organizationId, siteId: site.id, currentHostname: site.normalizedHostname, reason: 'publication.bridge.unpublish', articleSlugs: slugs[0] === undefined ? [] : [slugs[0].slug] }) as never);
      }
      await transaction.insert(auditLogs).values({ organizationId: actor.organizationId, id: crypto.randomUUID(), actorType: actor.actorType, actorId: actor.actorId, entryPoint: actor.entryPoint, action: 'publication.bridge.unpublish', targetType: 'portal_assignment', targetId: input.articleId, outcome: 'succeeded', changedFields: ['state'], requestId: actor.requestId, before: null, after: { ownerOrganizationId: input.ownerOrganizationId, articleId: input.articleId } });
      return { unpublished: unpublished.length };
    });
  }

  /**
   * Resolve a parent article for liveblog entry operations within actor scope.
   *
   * @param transaction - Tenant transaction with context already established.
   * @param actor - Calling actor; region-locked actors see only covered regions.
   * @param articleId - Parent article id.
   * @returns Parent id and slug for invalidation.
   */
  /**
   * Whether an owner article still has published bridge assignments.
   *
   * @param ownerOrganizationId - Organization owning the canonical article.
   * @param articleId - Canonical article id.
   * @returns True when at least one serving portal still publishes it.
   * @remarks Read through the `SECURITY DEFINER` probe so owner-context
   * callers see serving-org rows their RLS would otherwise hide; used to
   * block deletes that would orphan live bridge assignments.
   */
  async hasPublishedBridges(ownerOrganizationId: string, articleId: string): Promise<boolean> {
    const rows = await this.database.execute<{ source_article_id: string }>(sql`
      SELECT source_article_id FROM indicate_private.list_bridge_serving_targets(
        ${ownerOrganizationId}::uuid, ${sqlStringArray([articleId])}::uuid[]) LIMIT 1`);
    return rows.length > 0;
  }

  /**
   * Purge serving portals holding published bridges of changed owner articles.
   *
   * @param actor - Calling actor for tenant-context attribution.
   * @param ownerOrganizationId - Organization owning the canonical articles.
   * @param changes - Changed article ids with the slugs to purge.
   * @remarks Owner edits (dashboard or steward) commit in owner context, whose
   * RLS cannot see serving-org rows; each serving org therefore gets its own
   * transaction with its own tenant context. One indexed probe short-circuits
   * orgs without bridges. Article bytes purge as `article.changed`, the same
   * corpus reason owner-portal edits use.
   */
  private async enqueueBridgeInvalidations(
    actor: AuthorizedTenantActorContext,
    ownerOrganizationId: string,
    changes: readonly { readonly articleId: string; readonly slugs: readonly string[] }[],
  ): Promise<void> {
    const ids = [...new Set(changes.map((change) => change.articleId))];
    if (ids.length === 0) return;
    const targets = await this.database.execute<{
      serving_organization_id: string; site_id: string; hostname: string; source_article_id: string;
    }>(sql`SELECT * FROM indicate_private.list_bridge_serving_targets(
      ${ownerOrganizationId}::uuid, ${sqlStringArray(ids)}::uuid[])`);
    if (targets.length === 0) return;
    const slugsByArticle = new Map<string, Set<string>>();
    for (const change of changes) {
      const slugs = slugsByArticle.get(change.articleId) ?? new Set<string>();
      for (const slug of change.slugs) slugs.add(slug);
      slugsByArticle.set(change.articleId, slugs);
    }
    const byServing = new Map<string, { siteIds: string[]; hostBySite: Map<string, string>; slugs: Set<string> }>();
    for (const target of targets) {
      const group = byServing.get(target.serving_organization_id) ?? { siteIds: [], hostBySite: new Map<string, string>(), slugs: new Set<string>() };
      if (!group.hostBySite.has(target.site_id)) {
        group.siteIds.push(target.site_id);
        group.hostBySite.set(target.site_id, target.hostname);
      }
      for (const slug of slugsByArticle.get(target.source_article_id) ?? []) group.slugs.add(slug);
      byServing.set(target.serving_organization_id, group);
    }
    for (const [servingOrg, group] of byServing) {
      await this.database.transaction(async (servingTransaction) => {
        const servingActor: AuthorizedTenantActorContext = { ...actor, organizationId: servingOrg, regionScopeId: null };
        await this.establishContextFor(servingTransaction, servingOrg, servingActor);
        const ancestors = await findBridgeAncestorHostnames(
          (query: unknown) => servingTransaction.execute(query as Parameters<Transaction['execute']>[0]),
          servingOrg,
          group.siteIds,
        );
        for (const siteId of group.siteIds) {
          await servingTransaction.insert(invalidationTasks).values(completeInvalidationValues({
            organizationId: servingOrg, siteId, currentHostname: group.hostBySite.get(siteId) ?? null,
            relatedHostnames: ancestors, reason: 'article.changed', articleSlugs: [...group.slugs],
          }) as never);
        }
      });
    }
  }

  private async requireUpdateParentArticle(transaction: Transaction, actor: AuthorizedTenantActorContext, articleId: string): Promise<{ readonly id: string; readonly slug: string }> {
    const articleRows = await transaction.select({ id: articles.id, regionId: articles.regionId, slug: articles.slug })
      .from(articles)
      .where(and(eq(articles.organizationId, actor.organizationId), eq(articles.id, articleId)))
      .limit(1);
    const article = articleRows[0];
    if (article === undefined) throw new DashboardAccessDeniedError();
    const lock = actor.regionScopeId ?? null;
    if (article.regionId === null) {
      if (lock !== null) throw new DashboardAccessDeniedError();
    } else {
      const geography = await transaction.select({ id: regions.id, kind: regions.kind, parentRegionId: regions.parentRegionId })
        .from(regions)
        .where(eq(regions.organizationId, actor.organizationId))
        .limit(2000);
      if (!regionScopeCovers(lock, article.regionId, geography)) throw new DashboardAccessDeniedError();
    }
    return { id: article.id, slug: article.slug };
  }

  private toArticleUpdateRecord(organizationId: string, row: { readonly id: string; readonly articleId: string; readonly body: string; readonly sortOrder: number; readonly publishedAt: Date | null; readonly createdBy: string; readonly version: number; readonly createdAt: Date; readonly updatedAt: Date }): ArticleUpdateRecord {
    return {
      id: row.id, organizationId, articleId: row.articleId, body: row.body, sortOrder: row.sortOrder,
      publishedAt: optionalIso(row.publishedAt), createdBy: row.createdBy, version: row.version,
      createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt),
    };
  }

  /**
   * Touch the parent article and fan out delivery invalidation after an entry write.
   *
   * @param transaction - Tenant transaction with context already established.
   * @param actor - Calling actor for audit attribution.
   * @param parent - Parent article id and slug.
   * @param now - Write timestamp shared by the touch and the audit row.
   * @param action - Audit action (`article.updates.create|update|delete`).
   * @param targetId - Entry id for audit targeting.
   * @param before - Previous entry body, or null on create/delete.
   * @param after - New entry body, or null on delete.
   */
  private async touchArticleForUpdates(transaction: Transaction, actor: AuthorizedTenantActorContext, parent: { readonly id: string; readonly slug: string }, now: Date, action: 'article.updates.create' | 'article.updates.update' | 'article.updates.delete', targetId: string, before: string | null, after: string | null): Promise<void> {
    await transaction.update(articles).set({ updatedAt: now })
      .where(and(eq(articles.organizationId, actor.organizationId), eq(articles.id, parent.id)));
    const assignmentRows = await transaction.select({ siteId: articleSites.siteId })
      .from(articleSites)
      .where(and(eq(articleSites.organizationId, actor.organizationId), eq(articleSites.articleId, parent.id), eq(articleSites.state, 'published'), eq(articleSites.active, true), isNotNull(articleSites.publishedAt)))
      .limit(1000);
    const siteIds = [...new Set(assignmentRows.map((row) => row.siteId))];
    if (siteIds.length > 0) {
      const hostRows = await transaction.select({ id: sites.id, normalizedHostname: sites.normalizedHostname })
        .from(sites)
        .where(and(eq(sites.organizationId, actor.organizationId), inArray(sites.id, siteIds)))
        .limit(siteIds.length);
      for (const site of hostRows) {
        await transaction.insert(invalidationTasks).values(completeInvalidationValues({ organizationId: actor.organizationId, siteId: site.id, currentHostname: site.normalizedHostname, reason: 'article.changed', articleSlugs: [parent.slug] }) as never);
      }
    }
    await this.enqueueBridgeInvalidations(actor, actor.organizationId, [{ articleId: parent.id, slugs: [parent.slug] }]);
    await transaction.insert(auditLogs).values({ organizationId: actor.organizationId, id: crypto.randomUUID(), actorType: actor.actorType, actorId: actor.actorId, entryPoint: actor.entryPoint, action, targetType: 'article', targetId, outcome: 'succeeded', changedFields: ['body'], requestId: actor.requestId, before: before === null ? null : { body: before }, after: after === null ? null : { body: after } });
  }

  /**
   * List liveblog entries of one article, oldest first, bounded.
   *
   * @param actor - Calling actor; parent article must be in region scope.
   * @param permission - Membership permission to enforce.
   * @param input - Parent article id.
   * @param owner - Optional platform override; when set, membership authorization is
   * skipped and the caller must hold the superadmin platform grant.
   * @returns At most 200 entries in display order.
   */
  async listArticleUpdates(actor: AuthorizedTenantActorContext, permission: string, input: { readonly articleId: string }, owner?: { readonly organizationId: string }): Promise<readonly ArticleUpdateRecord[]> {
    const scoped = owner === undefined ? actor : { ...actor, organizationId: owner.organizationId, regionScopeId: null };
    return this.database.transaction(async (transaction) => {
      await this.establishContextFor(transaction, scoped.organizationId, scoped);
      if (owner === undefined) await this.authorize(transaction, actor, permission);
      else if (scoped.platformPermissionSet?.has(INTEGRATIONS_PERMISSIONS.superAdmin) !== true) throw new DashboardAccessDeniedError();
      const parent = await this.requireUpdateParentArticle(transaction, scoped, input.articleId);
      const rows = await transaction.select({ id: articleUpdates.id, articleId: articleUpdates.articleId, body: articleUpdates.body, sortOrder: articleUpdates.sortOrder, publishedAt: articleUpdates.publishedAt, createdBy: articleUpdates.createdBy, version: articleUpdates.version, createdAt: articleUpdates.createdAt, updatedAt: articleUpdates.updatedAt })
        .from(articleUpdates)
        .where(and(eq(articleUpdates.organizationId, scoped.organizationId), eq(articleUpdates.articleId, parent.id)))
        .orderBy(articleUpdates.sortOrder, articleUpdates.createdAt)
        .limit(200);
      return rows.map((row) => this.toArticleUpdateRecord(scoped.organizationId, row));
    });
  }

  /**
   * Append one liveblog entry; sort order continues the article max.
   *
   * @param actor - Calling actor; parent article must be in region scope.
   * @param permission - Membership permission to enforce.
   * @param input - Parent article id and entry body.
   * @param owner - Optional platform override; when set, membership authorization is
   * skipped and the caller must hold the superadmin platform grant.
   * @returns The persisted entry.
   */
  async createArticleUpdate(actor: AuthorizedTenantActorContext, permission: string, input: { readonly articleId: string; readonly body: string }, owner?: { readonly organizationId: string }): Promise<ArticleUpdateRecord> {
    const scoped = owner === undefined ? actor : { ...actor, organizationId: owner.organizationId, regionScopeId: null };
    return this.database.transaction(async (transaction) => {
      await this.establishContextFor(transaction, scoped.organizationId, scoped);
      if (owner === undefined) await this.authorize(transaction, actor, permission);
      else if (scoped.platformPermissionSet?.has(INTEGRATIONS_PERMISSIONS.superAdmin) !== true) throw new DashboardAccessDeniedError();
      await this.enforceWritableSubscriptionFor(transaction, scoped.organizationId, scoped);
      const parent = await this.requireUpdateParentArticle(transaction, scoped, input.articleId);
      const tail = await transaction.select({ sortOrder: articleUpdates.sortOrder })
        .from(articleUpdates)
        .where(and(eq(articleUpdates.organizationId, scoped.organizationId), eq(articleUpdates.articleId, parent.id)))
        .orderBy(desc(articleUpdates.sortOrder))
        .limit(1);
      const now = new Date();
      const id = crypto.randomUUID();
      await transaction.insert(articleUpdates).values({ organizationId: scoped.organizationId, id, articleId: parent.id, body: input.body, sortOrder: (tail[0]?.sortOrder ?? 0) + 1, publishedAt: now, createdBy: scoped.actorId, version: 1, createdAt: now, updatedAt: now });
      await this.touchArticleForUpdates(transaction, scoped, parent, now, 'article.updates.create', id, null, input.body);
      return this.toArticleUpdateRecord(scoped.organizationId, { id, articleId: parent.id, body: input.body, sortOrder: (tail[0]?.sortOrder ?? 0) + 1, publishedAt: now, createdBy: scoped.actorId, version: 1, createdAt: now, updatedAt: now });
    });
  }

  /**
   * Rewrite one liveblog entry body under optimistic concurrency.
   *
   * @param actor - Calling actor; parent article must be in region scope.
   * @param permission - Membership permission to enforce.
   * @param input - Entry id, expected version, and new body.
   * @param owner - Optional platform override; when set, membership authorization is
   * skipped and the caller must hold the superadmin platform grant.
   * @returns The updated entry.
   */
  async updateArticleUpdate(actor: AuthorizedTenantActorContext, permission: string, input: { readonly id: string; readonly expectedVersion: number; readonly body: string }, owner?: { readonly organizationId: string }): Promise<ArticleUpdateRecord> {
    const scoped = owner === undefined ? actor : { ...actor, organizationId: owner.organizationId, regionScopeId: null };
    return this.database.transaction(async (transaction) => {
      await this.establishContextFor(transaction, scoped.organizationId, scoped);
      if (owner === undefined) await this.authorize(transaction, actor, permission);
      else if (scoped.platformPermissionSet?.has(INTEGRATIONS_PERMISSIONS.superAdmin) !== true) throw new DashboardAccessDeniedError();
      await this.enforceWritableSubscriptionFor(transaction, scoped.organizationId, scoped);
      const existing = await transaction.select({ id: articleUpdates.id, articleId: articleUpdates.articleId, body: articleUpdates.body, sortOrder: articleUpdates.sortOrder, publishedAt: articleUpdates.publishedAt, createdBy: articleUpdates.createdBy, version: articleUpdates.version, createdAt: articleUpdates.createdAt })
        .from(articleUpdates)
        .where(and(eq(articleUpdates.organizationId, scoped.organizationId), eq(articleUpdates.id, input.id)))
        .limit(1);
      const before = existing[0];
      if (before === undefined) throw new DashboardAccessDeniedError();
      if (before.version !== input.expectedVersion) throw new DashboardConflictError();
      const parent = await this.requireUpdateParentArticle(transaction, scoped, before.articleId);
      const now = new Date();
      await transaction.update(articleUpdates).set({ body: input.body, version: before.version + 1, updatedAt: now })
        .where(and(eq(articleUpdates.organizationId, scoped.organizationId), eq(articleUpdates.id, before.id)));
      await this.touchArticleForUpdates(transaction, scoped, parent, now, 'article.updates.update', before.id, before.body, input.body);
      return this.toArticleUpdateRecord(scoped.organizationId, { ...before, body: input.body, version: before.version + 1, updatedAt: now });
    });
  }

  /**
   * Remove one liveblog entry under optimistic concurrency.
   *
   * @param actor - Calling actor; parent article must be in region scope.
   * @param permission - Membership permission to enforce.
   * @param input - Entry id and expected version.
   * @param owner - Optional platform override; when set, membership authorization is
   * skipped and the caller must hold the superadmin platform grant.
   * @returns The removed entry id.
   */
  async deleteArticleUpdate(actor: AuthorizedTenantActorContext, permission: string, input: { readonly id: string; readonly expectedVersion: number }, owner?: { readonly organizationId: string }): Promise<{ readonly id: string }> {
    const scoped = owner === undefined ? actor : { ...actor, organizationId: owner.organizationId, regionScopeId: null };
    return this.database.transaction(async (transaction) => {
      await this.establishContextFor(transaction, scoped.organizationId, scoped);
      if (owner === undefined) await this.authorize(transaction, actor, permission);
      else if (scoped.platformPermissionSet?.has(INTEGRATIONS_PERMISSIONS.superAdmin) !== true) throw new DashboardAccessDeniedError();
      await this.enforceWritableSubscriptionFor(transaction, scoped.organizationId, scoped);
      const existing = await transaction.select({ id: articleUpdates.id, articleId: articleUpdates.articleId, body: articleUpdates.body, version: articleUpdates.version })
        .from(articleUpdates)
        .where(and(eq(articleUpdates.organizationId, scoped.organizationId), eq(articleUpdates.id, input.id)))
        .limit(1);
      const before = existing[0];
      if (before === undefined) throw new DashboardAccessDeniedError();
      if (before.version !== input.expectedVersion) throw new DashboardConflictError();
      const parent = await this.requireUpdateParentArticle(transaction, scoped, before.articleId);
      await transaction.delete(articleUpdates)
        .where(and(eq(articleUpdates.organizationId, scoped.organizationId), eq(articleUpdates.id, before.id)));
      const now = new Date();
      await this.touchArticleForUpdates(transaction, scoped, parent, now, 'article.updates.delete', before.id, before.body, null);
      return { id: before.id };
    });
  }

  /**
   * Resolve active organization ids for many slugs in one round trip.
   *
   * @param actor - Calling actor; must carry the platform super-admin grant.
   * @param slugs - Organization slugs to resolve.
   * @returns Id keyed by slug; unknown slugs are simply absent.
   */
  async findOrganizationsBySlugs(actor: AuthorizedTenantActorContext, slugs: readonly string[]): Promise<ReadonlyMap<string, string>> {
    if (actor.platformPermissionSet?.has(INTEGRATIONS_PERMISSIONS.superAdmin) !== true) throw new DashboardAccessDeniedError();
    if (slugs.length === 0) return new Map();
    const rows = await this.database.transaction(async (transaction) => {
      await this.establishContext(transaction, actor);
      return transaction.execute<{ id: string; slug: string }>(sql`SELECT id, slug FROM indicate_private.find_organizations_by_slugs(${sqlStringArray([...new Set(slugs)])}::text[])`);
    });
    return new Map([...rows].map((row) => [row.slug, row.id] as const));
  }

  /**
   * Daftar draf humas menunggu jembatan steward.
   *
   * @param actor - Steward pemanggil; wajib membawa grant platform super_admin.
   * @returns Draf/scheduled org customer, terbaru dulu, maksimal 200 baris.
   */
  async listForOrgInbox(actor: AuthorizedTenantActorContext): Promise<readonly { readonly organizationId: string; readonly orgSlug: string; readonly orgName: string; readonly articleId: string; readonly slug: string; readonly title: string; readonly status: string; readonly publisherLabel: string | null; readonly regionSlug: string | null; readonly updatedAt: string }[]> {
    if (actor.platformPermissionSet?.has(INTEGRATIONS_PERMISSIONS.superAdmin) !== true) throw new DashboardAccessDeniedError();
    const rows = await this.database.execute<{
      organization_id: string; org_slug: string; org_name: string; article_id: string;
      slug: string; title: string; status: string; publisher_label: string | null;
      region_slug: string | null; updated_at: Date | string;
    }>(sql`SELECT * FROM indicate_private.list_bridge_inbox()`);
    return [...rows].map((row) => ({
      organizationId: row.organization_id,
      orgSlug: row.org_slug,
      orgName: row.org_name,
      articleId: row.article_id,
      slug: row.slug,
      title: row.title,
      status: row.status,
      publisherLabel: row.publisher_label,
      regionSlug: row.region_slug,
      updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : new Date(row.updated_at).toISOString(),
    }));
  }

  /**
   * Terbitkan draf humas ke portal-portal kota asalnya secara otomatis.
   *
   * @param actor - Steward pemanggil; wajib membawa grant platform super_admin.
   * @param input - Org pemilik dan artikel; target dihitung dari wilayahnya.
   * @returns Id baris bridge, slug, dan jumlah portal.
   * @remarks Nasional (region null) → semua portal apex; kota → portal kota
   * ber-slug sama di semua domain. Batas 200 situs per panggilan mengikuti
   * plafon skema bridge.
   */
  async requestBridgePublicationAuto(actor: AuthorizedTenantActorContext, input: { readonly ownerOrganizationId: string; readonly articleId: string; readonly viewCount?: number | undefined }): Promise<{ readonly bridgeIds: readonly string[]; readonly slug: string; readonly siteCount: number }> {
    if (actor.platformPermissionSet?.has(INTEGRATIONS_PERMISSIONS.superAdmin) !== true) throw new DashboardAccessDeniedError();
    const now = new Date();
    const ownerActor: AuthorizedTenantActorContext = { ...actor, organizationId: input.ownerOrganizationId, regionScopeId: null };
    const flipped = await this.executeForOrganization(ownerActor, input.ownerOrganizationId, (transaction) => {
      const flippedArticle = this.flipOwnerArticleForBridge(transaction, input.articleId, now);
      const regionSlug = flippedArticle.regionId === null
        ? null
        : (transaction.state.regions.find((region) => region.id === flippedArticle.regionId)?.slug ?? null);
      return { slug: flippedArticle.slug, title: flippedArticle.title, regionSlug };
    }, ['articles', 'regions']);
    const bridgeIds = await this.database.transaction(async (transaction) => {
      await this.establishContext(transaction, actor);
      if (actor.platformPermissionSet?.has(INTEGRATIONS_PERMISSIONS.superAdmin) !== true) throw new DashboardAccessDeniedError();
      let siteRows: readonly { readonly id: string; readonly normalizedHostname: string }[];
      if (flipped.regionSlug === null) {
        siteRows = await this.readAllActiveSiteRows(transaction, actor.organizationId, 'apex', null);
      } else {
        const regionRows = await transaction.select({ id: regions.id }).from(regions).where(and(eq(regions.organizationId, actor.organizationId), eq(regions.slug, flipped.regionSlug), eq(regions.kind, 'city'), eq(regions.status, 'active'))).limit(1);
        const regionId = regionRows[0]?.id ?? null;
        if (regionId === null) throw new DashboardValidationError({ articleId: ['Wilayah artikel tidak punya portal kota di jaringan.'] });
        siteRows = await this.readAllActiveSiteRows(transaction, actor.organizationId, 'city', regionId);
      }
      if (siteRows.length === 0) throw new DashboardValidationError({ articleId: ['Tidak ada portal aktif untuk wilayah ini.'] });
      return this.insertPublishedBridge(transaction, actor, input.ownerOrganizationId, input.articleId, flipped.slug, siteRows, now, 'publication.bridge.requestAuto', input.viewCount);
    });
    return { bridgeIds, slug: flipped.slug, siteCount: bridgeIds.length };
  }

  private flipOwnerArticleForBridge(transaction: DashboardTransaction, articleId: string, now: Date): { readonly slug: string; readonly title: string; readonly regionId: string | null } {
    const article = transaction.state.articles.find((candidate) => candidate.id === articleId);
    if (article === undefined) throw new DashboardAccessDeniedError();
    if (article.status !== 'draft' && article.status !== 'scheduled' && article.status !== 'active') throw new DashboardValidationError({ articleId: ['Hanya draf, terjadwal, atau aktif yang bisa diterbitkan.'] });
    const after = { ...article, status: 'active' as const, publishedAt: article.publishedAt ?? now.toISOString(), updatedAt: now.toISOString(), version: article.version + 1 };
    const index = transaction.state.articles.findIndex((candidate) => candidate.id === articleId);
    transaction.state.articles[index] = after;
    transaction.appendAudit({ action: 'article.publish', targetType: 'article', targetId: article.id, outcome: 'succeeded', changedFields: ['status', 'publishedAt', 'version', 'updatedAt'], before: article as unknown as Record<string, unknown>, after: after as unknown as Record<string, unknown> });
    return { slug: after.slug, title: after.title, regionId: after.regionId };
  }

  /**
   * Every active portal of one level, read in keyset pages.
   *
   * @remarks A fixed row ceiling silently drops portals once a network outgrows
   * it, so the auto-publish fan-out pages by id until a short page, which keeps
   * each read bounded (the egress budget) without capping the total.
   */
  private async readAllActiveSiteRows(
    transaction: Transaction,
    organizationId: string,
    siteLevel: 'apex' | 'city',
    regionId: string | null,
  ): Promise<readonly { readonly id: string; readonly normalizedHostname: string }[]> {
    const PAGE = 500;
    const all: { readonly id: string; readonly normalizedHostname: string }[] = [];
    let after: string | null = null;
    for (;;) {
      const page: readonly { readonly id: string; readonly normalizedHostname: string }[] = await transaction
        .select({ id: sites.id, normalizedHostname: sites.normalizedHostname })
        .from(sites)
        .where(and(
          eq(sites.organizationId, organizationId),
          eq(sites.siteLevel, siteLevel),
          eq(sites.status, 'active'),
          ...(regionId === null ? [] : [eq(sites.regionId, regionId)]),
          ...(after === null ? [] : [gt(sites.id, after)]),
        ))
        .orderBy(sites.id)
        .limit(PAGE);
      all.push(...page);
      if (page.length < PAGE) return all;
      after = page[page.length - 1]!.id;
    }
  }

  private async insertPublishedBridge(transaction: Transaction, actor: AuthorizedTenantActorContext, ownerOrganizationId: string, articleId: string, slug: string, siteRows: readonly { readonly id: string; readonly normalizedHostname: string }[], now: Date, reason: string, viewCount?: number | undefined): Promise<readonly string[]> {
    const rows = siteRows.map((site) => ({ organizationId: actor.organizationId, id: crypto.randomUUID(), siteId: site.id, sourceOrganizationId: ownerOrganizationId, sourceArticleId: articleId, state: 'published' as const, stateOccurredAt: now, publishedAt: now, viewCount: viewCount ?? seedInitialViewCount(0, false) ?? 0, version: 1, createdAt: now, updatedAt: now }));
    for (const chunk of insertChunks(rows)) {
      await transaction.insert(portalAssignments).values([...chunk]).onConflictDoUpdate({
        target: [portalAssignments.organizationId, portalAssignments.sourceOrganizationId, portalAssignments.sourceArticleId, portalAssignments.siteId],
        set: viewCount === undefined
          ? { state: 'published', stateOccurredAt: now, publishedAt: now, updatedAt: now, version: sql`${portalAssignments.version} + 1` }
          : { state: 'published', stateOccurredAt: now, publishedAt: now, viewCount, updatedAt: now, version: sql`${portalAssignments.version} + 1` },
      });
    }
    if (viewCount === undefined) {
      await transaction.execute(sql`UPDATE public.portal_assignments SET view_count = CASE WHEN random() < 0.70 THEN 1000 + floor(random() * 3001)::int WHEN random() < 0.9473684210526315 THEN 4001 + floor(random() * 4000)::int ELSE 8001 + floor(random() * 4000)::int END WHERE organization_id = ${actor.organizationId}::uuid AND source_organization_id = ${ownerOrganizationId}::uuid AND source_article_id = ${articleId}::uuid AND state = 'published' AND view_count = 0`);
    }
    const ancestorHostnames = await findBridgeAncestorHostnames(
      (query: unknown) => transaction.execute(query as Parameters<Transaction['execute']>[0]),
      actor.organizationId,
      siteRows.map((site) => site.id),
    );
    for (const site of siteRows) {
      await transaction.insert(invalidationTasks).values(completeInvalidationValues({ organizationId: actor.organizationId, siteId: site.id, currentHostname: site.normalizedHostname, relatedHostnames: ancestorHostnames, reason, articleSlugs: [slug] }) as never);
    }
    await transaction.insert(auditLogs).values({ organizationId: actor.organizationId, id: crypto.randomUUID(), actorType: actor.actorType, actorId: actor.actorId, entryPoint: actor.entryPoint, action: 'publication.bridge.request', targetType: 'portal_assignment', targetId: articleId, outcome: 'succeeded', changedFields: ['state'], requestId: actor.requestId, before: null, after: { ownerOrganizationId, articleId, siteIds: siteRows.map((site) => site.id) } });
    return rows.map((row) => row.id);
  }

  private async runScoped<T>(actor: AuthorizedTenantActorContext, organizationId: string, auth: { readonly membershipPermission: string } | { readonly platformManaged: true }, operation: (transaction: DashboardTransaction) => T | Promise<T>, scope?: readonly DashboardCollectionName[]): Promise<T> {
    return this.database.transaction(async (transaction) => {
      const scopedActor = 'platformManaged' in auth ? { ...actor, organizationId, regionScopeId: null } : actor;
      if ('platformManaged' in auth) {
        if (actor.platformPermissionSet?.has(INTEGRATIONS_PERMISSIONS.superAdmin) !== true) throw new DashboardAccessDeniedError();
      }
      await this.establishContextFor(transaction, organizationId, scopedActor);
      if (!('platformManaged' in auth)) await this.authorize(transaction, scopedActor, auth.membershipPermission);
      await this.enforceWritableSubscriptionFor(transaction, organizationId, scopedActor);
      await transaction.select({ id: organizations.id }).from(organizations).where(eq(organizations.id, organizationId)).limit(1).for('update');
      const loaded = scope === undefined ? undefined : new Set<DashboardCollectionName>(scope);
      const before = await this.load(transaction, organizationId, loaded);
      const state = structuredClone(before) as MutableTenantState;
      if (loaded !== undefined) {
        for (const name of ['domains', 'regions', 'sites', 'siteSettings', 'roles', 'memberships', 'publishers', 'affiliations', 'categories', 'authors', 'articles', 'articleCategories', 'articleSites', 'media', 'publishingJobs', 'publishingJobTargets'] as const) {
          if (!loaded.has(name)) {
            Object.defineProperty(state, name, {
              configurable: true,
              get(): never {
                throw new DashboardAccessDeniedError();
              },
            });
          }
        }
      }
      const pendingAudits: AuditRecord[] = [];
      const displayNameCache = new Map<string, string | null>();
      const dashboardTransaction: DashboardTransaction = {
        state,
        articleContentTouched: new Set<string>(),
        refreshArticleContent: async (articleId) => {
          const rows = await transaction.select({ id: articles.id, body: articles.body, bodyJson: articles.bodyJson }).from(articles).where(and(eq(articles.organizationId, scopedActor.organizationId), eq(articles.id, articleId))).limit(1);
          const row = rows[0];
          if (row === undefined) return false;
          const index = state.articles.findIndex((candidate) => candidate.id === articleId);
          if (index !== -1) state.articles[index] = { ...state.articles[index]!, body: row.body, bodyJson: (row.bodyJson ?? null) as unknown | null };
          return true;
        },
        resolveUserDisplayName: async (userId) => {
          const cached = displayNameCache.get(userId);
          if (cached !== undefined) return cached;
          const rows = await transaction.execute<{ display_name: string | null }>(sql`
            SELECT display_name FROM indicate_private.lookup_user_profile(${userId}::uuid)
          `);
          const name = rows[0]?.display_name ?? null;
          displayNameCache.set(userId, name);
          return name;
        },
        appendAudit: (event) => pendingAudits.push({ ...event, id: crypto.randomUUID(), organizationId: scopedActor.organizationId, actorType: scopedActor.actorType, actorId: scopedActor.actorId, entryPoint: scopedActor.entryPoint, requestId: scopedActor.requestId, occurredAt: new Date().toISOString(), before: event.before === null ? null : redact(event.before) as Record<string, unknown>, after: event.after === null ? null : redact(event.after) as Record<string, unknown> }),
      };
      const result = await operation(dashboardTransaction);
      await this.persist(transaction, actor, before, state, pendingAudits, dashboardTransaction.articleContentTouched, loaded);
      return result;
    });
  }

  private async enforceWritableSubscription(transaction: Transaction, actor: AuthorizedTenantActorContext): Promise<void> {
    await this.enforceWritableSubscriptionFor(transaction, actor.organizationId, actor);
  }

  private async enforceWritableSubscriptionFor(transaction: Transaction, organizationId: string, actor: AuthorizedTenantActorContext): Promise<void> {
    if (actor.actorType !== 'user') return;
    const rows = await transaction.execute<{ state: string }>(sql`SELECT indicate_private.subscription_access_state(${organizationId}::uuid) AS state`);
    const state = rows[0]?.state;
    if (state === 'platform' || state === 'active') return;
    throw new DashboardSubscriptionInactiveError(state ?? 'none');
  }

  private async persist(transaction: Transaction, actor: AuthorizedTenantActorContext, before: DashboardTenantState, state: MutableTenantState, pendingAudits: readonly AuditRecord[], articleContentTouched: ReadonlySet<string>, loaded?: ReadonlySet<DashboardCollectionName>): Promise<void> {
    const want = (name: DashboardCollectionName): boolean => loaded === undefined || loaded.has(name);
    const index = buildTenantStateIndex(before, state, loaded);
    const domainRows = want('domains') ? state.domains : [];
    const regionRows = want('regions') ? state.regions : [];
    const siteRows = want('sites') ? state.sites : [];
    const settingsRows = want('siteSettings') ? state.siteSettings : [];
    const roleRows = want('roles') ? state.roles : [];
    const membershipRows = want('memberships') ? state.memberships : [];
    const publisherRows = want('publishers') ? state.publishers : [];
    const affiliationRows = want('affiliations') ? state.affiliations : [];
    const categoryRows = want('categories') ? state.categories : [];
    const authorRows = want('authors') ? state.authors : [];
    const articleRows = want('articles') ? state.articles : [];
    const articleSiteRows = want('articleSites') ? state.articleSites : [];
    for (const row of domainRows) {
      const prior = index.priorDomains.get(row.id);
      if (prior !== undefined && prior.normalizedHostname === row.normalizedHostname && prior.status === row.status
        && prior.cloudflareZoneId === row.cloudflareZoneId && prior.siteTopology === row.siteTopology
        && prior.routingVersion === row.routingVersion && prior.version === row.version && prior.updatedAt === row.updatedAt) continue;
      await transaction.insert(domains).values({ organizationId: state.organizationId, id: row.id, normalizedHostname: row.normalizedHostname, status: row.status, cloudflareZoneId: row.cloudflareZoneId, siteTopology: row.siteTopology, routingVersion: row.routingVersion, version: row.version, createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) }).onConflictDoUpdate({ target: [domains.organizationId, domains.id], set: { normalizedHostname: row.normalizedHostname, status: row.status, cloudflareZoneId: row.cloudflareZoneId, siteTopology: row.siteTopology, routingVersion: row.routingVersion, version: row.version, updatedAt: new Date(row.updatedAt) } });
    }
    for (const row of regionRows) {
      const prior = index.priorRegions.get(row.id);
      if (prior !== undefined && prior.externalKey === row.externalKey && prior.name === row.name && prior.shortName === row.shortName
        && prior.slug === row.slug && prior.status === row.status && prior.kind === row.kind && prior.parentRegionId === row.parentRegionId
        && prior.version === row.version && prior.updatedAt === row.updatedAt) continue;
      await transaction.insert(regions).values({ organizationId: state.organizationId, id: row.id, externalKey: row.externalKey, name: row.name, shortName: row.shortName, slug: row.slug, status: row.status, kind: row.kind, parentRegionId: row.parentRegionId, version: row.version, createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) }).onConflictDoUpdate({ target: [regions.organizationId, regions.id], set: { externalKey: row.externalKey, name: row.name, shortName: row.shortName, slug: row.slug, status: row.status, kind: row.kind, parentRegionId: row.parentRegionId, version: row.version, updatedAt: new Date(row.updatedAt) } });
    }
    for (const row of siteRows) {
      const prior = index.priorSites.get(row.id);
      if (prior !== undefined && prior.domainId === row.domainId && prior.regionId === row.regionId && prior.siteLevel === row.siteLevel
        && prior.parentSiteId === row.parentSiteId && prior.normalizedHostname === row.normalizedHostname && prior.status === row.status
        && prior.activationState === row.activationState && prior.version === row.version && prior.updatedAt === row.updatedAt) continue;
      await transaction.insert(sites).values({ organizationId: state.organizationId, id: row.id, domainId: row.domainId, regionId: row.regionId, siteLevel: row.siteLevel, parentSiteId: row.parentSiteId, normalizedHostname: row.normalizedHostname, status: row.status, activationState: row.activationState, version: row.version, createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) }).onConflictDoUpdate({ target: [sites.organizationId, sites.id], set: { domainId: row.domainId, regionId: row.regionId, siteLevel: row.siteLevel, parentSiteId: row.parentSiteId, normalizedHostname: row.normalizedHostname, status: row.status, activationState: row.activationState, version: row.version, updatedAt: new Date(row.updatedAt) } });
    }
    for (const row of settingsRows) {
      const prior = index.priorSiteSettings.get(row.siteId);
      if (prior !== undefined && prior.name === row.name && prior.description === row.description && prior.tagline === row.tagline
        && prior.seoDefaultTitle === row.seoDefaultTitle && prior.seoDefaultDescription === row.seoDefaultDescription
        && prior.seoOpenGraphSiteName === row.seoOpenGraphSiteName && prior.locale === row.locale
        && prior.commentsEnabled === row.commentsEnabled
        && prior.seoRobotsDirective === row.seoRobotsDirective && prior.logoMediaId === row.logoMediaId
        && prior.faviconMediaId === row.faviconMediaId && prior.defaultMediaId === row.defaultMediaId
        && prior.version === row.version && prior.updatedAt === row.updatedAt
        && sameJson(prior.colors, row.colors) && sameJson(prior.socialLinks, row.socialLinks)
        && sameJson(prior.seo, row.seo) && sameJson(prior.navigation, row.navigation)) continue;
      await transaction.insert(siteSettings).values({ organizationId: state.organizationId, siteId: row.siteId, name: row.name, description: row.description, tagline: row.tagline, seoDefaultTitle: row.seoDefaultTitle, seoDefaultDescription: row.seoDefaultDescription, seoOpenGraphSiteName: row.seoOpenGraphSiteName, locale: row.locale, seoRobotsDirective: row.seoRobotsDirective, commentsEnabled: row.commentsEnabled, colors: row.colors, socialLinks: row.socialLinks, seo: row.seo, navigation: row.navigation.map(({ label, path }) => ({ label, path })), logoMediaId: row.logoMediaId, faviconMediaId: row.faviconMediaId, defaultMediaId: row.defaultMediaId, version: row.version, createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) }).onConflictDoUpdate({ target: [siteSettings.organizationId, siteSettings.siteId], set: { name: row.name, description: row.description, tagline: row.tagline, seoDefaultTitle: row.seoDefaultTitle, seoDefaultDescription: row.seoDefaultDescription, seoOpenGraphSiteName: row.seoOpenGraphSiteName, locale: row.locale, seoRobotsDirective: row.seoRobotsDirective, commentsEnabled: row.commentsEnabled, colors: row.colors, socialLinks: row.socialLinks, seo: row.seo, navigation: row.navigation.map(({ label, path }) => ({ label, path })), logoMediaId: row.logoMediaId, faviconMediaId: row.faviconMediaId, defaultMediaId: row.defaultMediaId, version: row.version, updatedAt: new Date(row.updatedAt) } });
    }
    for (const row of roleRows) {
      const prior = before.roles.find(({ id }) => id === row.id);
      const same = prior !== undefined && prior.name === row.name && prior.tier === row.tier && prior.active === row.active
        && JSON.stringify([...prior.permissions].sort()) === JSON.stringify([...row.permissions].sort());
      if (same) continue;
      if (prior === undefined) {
        await transaction.insert(roles).values({ organizationId: state.organizationId, id: row.id, name: row.name, tier: row.tier, active: row.active, version: row.version, createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) });
      } else {
        const changed = await transaction.update(roles).set({ name: row.name, tier: row.tier, active: row.active, version: row.version, updatedAt: new Date(row.updatedAt) }).where(and(eq(roles.organizationId, state.organizationId), eq(roles.id, row.id), eq(roles.version, prior.version))).returning({ id: roles.id });
        if (changed.length !== 1) throw new DashboardConflictError();
      }
      const permissionRows = await transaction.select({ id: permissions.id, name: permissions.name }).from(permissions).where(and(eq(permissions.organizationId, state.organizationId), eq(permissions.scope, 'organization')));
      const permissionByName = new Map(permissionRows.map((permission) => [permission.name, permission]));
      const selected = [...row.permissions].map((name) => permissionByName.get(name));
      if (selected.some((permission) => permission === undefined)) throw new DashboardAccessDeniedError();
      await transaction.delete(rolePermissions).where(and(eq(rolePermissions.organizationId, state.organizationId), eq(rolePermissions.roleId, row.id)));
      if (selected.length > 0) await transaction.insert(rolePermissions).values(selected.map((permission) => ({ organizationId: state.organizationId, roleId: row.id, permissionId: permission!.id })));
    }
    for (const row of membershipRows) {
      const prior = before.memberships.find(({ userId }) => userId === row.userId);
      if (prior !== undefined && prior.roleId === row.roleId && prior.status === row.status && prior.regionId === row.regionId) continue;
      if (prior === undefined) {
        await transaction.insert(memberships).values({ organizationId: state.organizationId, userId: row.userId, roleId: row.roleId, status: row.status, regionId: row.regionId, version: row.version, createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) });
      } else {
        const changed = await transaction.update(memberships).set({ roleId: row.roleId, status: row.status, regionId: row.regionId, version: row.version, updatedAt: new Date(row.updatedAt) }).where(and(eq(memberships.organizationId, state.organizationId), eq(memberships.userId, row.userId), eq(memberships.version, prior.version))).returning({ userId: memberships.userId });
        if (changed.length !== 1) throw new DashboardConflictError();
      }
    }
    for (const row of publisherRows) {
      const prior = before.publishers.find(({ id }) => id === row.id);
      const same = prior !== undefined && prior.name === row.name && prior.type === row.type && prior.attributionLabel === row.attributionLabel
        && JSON.stringify(prior.contacts) === JSON.stringify(row.contacts) && prior.evidenceReference === row.evidenceReference
        && prior.verificationStatus === row.verificationStatus && prior.submittedBy === row.submittedBy && prior.submittedAt === row.submittedAt
        && prior.verifiedBy === row.verifiedBy && prior.verifiedAt === row.verifiedAt && prior.rejectionReason === row.rejectionReason
        && prior.status === row.status && prior.version === row.version;
      if (same) continue;
      await transaction.insert(publishers).values({ organizationId: state.organizationId, id: row.id, name: row.name, type: row.type, attributionLabel: row.attributionLabel, contacts: row.contacts, evidenceReference: row.evidenceReference, verificationStatus: row.verificationStatus, submittedBy: row.submittedBy, submittedAt: row.submittedAt === null ? null : new Date(row.submittedAt), verifiedBy: row.verifiedBy, verifiedAt: row.verifiedAt === null ? null : new Date(row.verifiedAt), rejectionReason: row.rejectionReason, status: row.status, version: row.version, createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) }).onConflictDoUpdate({ target: [publishers.organizationId, publishers.id], set: { name: row.name, type: row.type, attributionLabel: row.attributionLabel, contacts: row.contacts, evidenceReference: row.evidenceReference, verificationStatus: row.verificationStatus, submittedBy: row.submittedBy, submittedAt: row.submittedAt === null ? null : new Date(row.submittedAt), verifiedBy: row.verifiedBy, verifiedAt: row.verifiedAt === null ? null : new Date(row.verifiedAt), rejectionReason: row.rejectionReason, status: row.status, version: row.version, updatedAt: new Date(row.updatedAt) } });
    }
    for (const row of affiliationRows) {
      const prior = index.priorAffiliations.get(row.id);
      if (prior !== undefined && prior.publisherId === row.publisherId && prior.siteId === row.siteId
        && prior.institutionName === row.institutionName && prior.evidenceReference === row.evidenceReference
        && prior.active === row.active && prior.verifiedAt === row.verifiedAt && prior.version === row.version
        && prior.updatedAt === row.updatedAt && sameJson(prior.claimScopes, row.claimScopes)) continue;
      await transaction.insert(officialAffiliations).values({ organizationId: state.organizationId, id: row.id, publisherId: row.publisherId, siteId: row.siteId, institutionName: row.institutionName, claimScopes: [...row.claimScopes], evidenceReference: row.evidenceReference, active: row.active, verifiedAt: row.verifiedAt === null ? null : new Date(row.verifiedAt), version: row.version, createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) }).onConflictDoUpdate({ target: [officialAffiliations.organizationId, officialAffiliations.id], set: { institutionName: row.institutionName, claimScopes: [...row.claimScopes], evidenceReference: row.evidenceReference, active: row.active, verifiedAt: row.verifiedAt === null ? null : new Date(row.verifiedAt), version: row.version, updatedAt: new Date(row.updatedAt) } });
    }
    for (const row of categoryRows) {
      const prior = index.priorCategories.get(row.id);
      if (prior !== undefined && prior.name === row.name && prior.slug === row.slug && prior.status === row.status
        && prior.version === row.version && prior.updatedAt === row.updatedAt) continue;
      await transaction.insert(categories).values({ organizationId: state.organizationId, id: row.id, name: row.name, slug: row.slug, status: row.status, version: row.version, createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) }).onConflictDoUpdate({ target: [categories.organizationId, categories.id], set: { name: row.name, slug: row.slug, status: row.status, version: row.version, updatedAt: new Date(row.updatedAt) } });
    }
    for (const row of authorRows) {
      const prior = index.priorAuthors.get(row.id);
      if (prior !== undefined && prior.displayName === row.displayName && prior.byline === row.byline
        && prior.status === row.status && prior.version === row.version && prior.updatedAt === row.updatedAt) continue;
      await transaction.insert(authors).values({ organizationId: state.organizationId, id: row.id, displayName: row.displayName, byline: row.byline, status: row.status, version: row.version, createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) }).onConflictDoUpdate({ target: [authors.organizationId, authors.id], set: { displayName: row.displayName, byline: row.byline, status: row.status, version: row.version, updatedAt: new Date(row.updatedAt) } });
    }
    const changedArticles: DashboardTenantState['articles'][number][] = [];
    for (const row of articleRows) {
      const prior = index.priorArticles.get(row.id);
      if (prior !== undefined && articleUnchanged(prior, row)) continue;
      changedArticles.push(row);
      const contentTrusted = row.body !== '' || (row.bodyJson !== null && row.bodyJson !== undefined);
      const hydratedContent = contentTrusted ? { body: row.body, bodyJson: (row.bodyJson ?? null) as Record<string, unknown> | null } : {};
      await transaction.insert(articles).values({ organizationId: state.organizationId, id: row.id, regionId: row.regionId, publisherId: row.publisherId, categoryId: row.categoryId, authorId: row.authorId, leadMediaId: row.leadMediaId, coverImageUrl: row.coverImageUrl, slug: row.slug, title: row.title, excerpt: row.excerpt, canonicalUrl: row.canonicalUrl, body: row.body, bodyJson: (row.bodyJson ?? null) as Record<string, unknown> | null, source: row.source, tags: [...row.tags], status: row.status, type: row.type, isSponsored: row.isSponsored, videoUrl: row.videoUrl, audioUrl: row.audioUrl, durationSeconds: row.durationSeconds, publishedAt: row.publishedAt === null ? null : new Date(row.publishedAt), scheduledAt: row.scheduledAt === null ? null : new Date(row.scheduledAt), archivedAt: row.archivedAt === null ? null : new Date(row.archivedAt), version: row.version, createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) }).onConflictDoUpdate({ target: [articles.organizationId, articles.id], set: { regionId: row.regionId, publisherId: row.publisherId, categoryId: row.categoryId, authorId: row.authorId, leadMediaId: row.leadMediaId, coverImageUrl: row.coverImageUrl, slug: row.slug, title: row.title, excerpt: row.excerpt, canonicalUrl: row.canonicalUrl, ...hydratedContent, source: row.source, tags: [...row.tags], status: row.status, type: row.type, isSponsored: row.isSponsored, videoUrl: row.videoUrl, audioUrl: row.audioUrl, durationSeconds: row.durationSeconds, publishedAt: row.publishedAt === null ? null : new Date(row.publishedAt), scheduledAt: row.scheduledAt === null ? null : new Date(row.scheduledAt), archivedAt: row.archivedAt === null ? null : new Date(row.archivedAt), version: row.version, updatedAt: new Date(row.updatedAt) } });
    }
    if (want('articleCategories') && !sameJson(
      [...state.articleCategories].map((row) => [row.articleId, row.categoryId, row.position]),
      [...before.articleCategories].map((row) => [row.articleId, row.categoryId, row.position]),
    )) {
      await transaction.delete(articleCategories).where(eq(articleCategories.organizationId, state.organizationId));
      for (const chunk of insertChunks(state.articleCategories)) {
        await transaction.insert(articleCategories).values(chunk.map((row) => ({ organizationId: state.organizationId, articleId: row.articleId, categoryId: row.categoryId, position: row.position }))).onConflictDoNothing();
      }
    }
    const removedArticleIds = want('articles') ? [...index.priorArticles.keys()].filter((id) => !index.currentArticles.has(id)) : [];
    for (const articleId of removedArticleIds) {
      const [reportRows, mediaRows, reservationRows] = await Promise.all([
        transaction.select({ id: contentReports.id }).from(contentReports).where(and(eq(contentReports.organizationId, state.organizationId), eq(contentReports.articleId, articleId))).limit(1),
        transaction.select({ id: media.id }).from(media).where(and(eq(media.organizationId, state.organizationId), eq(media.articleId, articleId))).limit(1),
        transaction.select({ id: mediaKeyReservations.id }).from(mediaKeyReservations).where(and(eq(mediaKeyReservations.organizationId, state.organizationId), eq(mediaKeyReservations.articleId, articleId))).limit(1),
      ]);
      if (reportRows.length > 0) throw new DashboardValidationError({ contentReports: ['Artikel dengan laporan moderasi tidak bisa dihapus permanen; arsipkan saja.'] });
      if (mediaRows.length > 0) throw new DashboardValidationError({ media: ['Hapus dulu media milik artikel ini dari Media sebelum hapus permanen.'] });
      if (reservationRows.length > 0) throw new DashboardValidationError({ mediaKeyReservations: ['Reservasi unggahan artikel ini masih aktif; coba lagi setelah kedaluwarsa.'] });
      await transaction.delete(articleRevisions).where(and(eq(articleRevisions.organizationId, state.organizationId), eq(articleRevisions.articleId, articleId)));
      await transaction.delete(articles).where(and(eq(articles.organizationId, state.organizationId), eq(articles.id, articleId)));
    }
    if (want('articles')) await this.recordArticleRevisions(transaction, actor.actorId, before, index, articleContentTouched);
    if (want('articles') && changedArticles.length > 0) await this.syncArticleGalleryMetadata(transaction, changedArticles, state.organizationId);
    const changedArticleSites: DashboardTenantState['articleSites'][number][] = [];
    for (const row of articleSiteRows) {
      const prior = index.priorArticleSites.get(row.id);
      if (prior !== undefined && prior.state === row.state && prior.stateOccurredAt === row.stateOccurredAt
        && prior.publishedUrl === row.publishedUrl && prior.publishedAt === row.publishedAt && prior.active === row.active
        && prior.viewCount === row.viewCount && prior.assignmentSource === row.assignmentSource
        && prior.expandedFromSiteId === row.expandedFromSiteId && prior.customCanonicalUrl === row.customCanonicalUrl
        && prior.version === row.version && prior.updatedAt === row.updatedAt) continue;
      changedArticleSites.push(row);
    }
    for (const chunk of insertChunks(changedArticleSites)) {
      await transaction.insert(articleSites).values(chunk.map((row) => ({
        organizationId: state.organizationId, id: row.id, articleId: row.articleId, siteId: row.siteId, state: row.state,
        stateOccurredAt: new Date(row.stateOccurredAt), publishedUrl: row.publishedUrl,
        publishedAt: row.publishedAt === null ? null : new Date(row.publishedAt), active: row.active,
        viewCount: row.viewCount, assignmentSource: row.assignmentSource, expandedFromSiteId: row.expandedFromSiteId,
        customCanonicalUrl: row.customCanonicalUrl, version: row.version, createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
      }))).onConflictDoUpdate({
        target: [articleSites.organizationId, articleSites.id],
        set: {
          state: sql`excluded.state`, stateOccurredAt: sql`excluded.state_occurred_at`, publishedUrl: sql`excluded.published_url`,
          publishedAt: sql`excluded.published_at`, active: sql`excluded.active`, viewCount: sql`excluded.view_count`,
          assignmentSource: sql`excluded.assignment_source`, expandedFromSiteId: sql`excluded.expanded_from_site_id`,
          customCanonicalUrl: sql`excluded.custom_canonical_url`, version: sql`excluded.version`, updatedAt: sql`excluded.updated_at`,
        },
      });
    }
    await this.enqueueDeliveryInvalidations(transaction, before, state, index, loaded);
    if (want('articles') && changedArticles.length > 0) {
      await this.enqueueBridgeInvalidations(actor, state.organizationId, changedArticles.map((row) => ({
        articleId: row.id,
        slugs: [index.priorArticles.get(row.id)?.slug, row.slug].filter((slug): slug is string => slug !== undefined),
      })));
    }
    if (pendingAudits.length > 0) await transaction.insert(auditLogs).values(pendingAudits.map((row) => ({ organizationId: row.organizationId, id: row.id, actorType: row.actorType, actorId: row.actorId, entryPoint: row.entryPoint, action: row.action, targetType: row.targetType, targetId: row.targetId, outcome: row.outcome, changedFields: [...row.changedFields], before: row.before, after: row.after, requestId: row.requestId, occurredAt: new Date(row.occurredAt) })));
  }

  private async recordArticleRevisions(transaction: Transaction, actorId: string, before: DashboardTenantState, index: TenantStateIndex, articleContentTouched: ReadonlySet<string>): Promise<void> {
    for (const row of index.currentArticles.values()) {
      const prior = index.priorArticles.get(row.id);
      if (prior !== undefined && prior.title === row.title && !articleContentTouched.has(row.id)) continue;
      const latest = await transaction.select({ revisionNumber: articleRevisions.revisionNumber }).from(articleRevisions).where(and(eq(articleRevisions.organizationId, before.organizationId), eq(articleRevisions.articleId, row.id))).orderBy(desc(articleRevisions.revisionNumber)).limit(1);
      const revisionNumber = (latest[0]?.revisionNumber ?? 0) + 1;
      await transaction.insert(articleRevisions).values({ organizationId: before.organizationId, id: crypto.randomUUID(), articleId: row.id, revisionNumber, title: row.title, body: row.body, bodyJson: (row.bodyJson ?? null) as Record<string, unknown> | null, snapshot: { slug: row.slug, excerpt: row.excerpt, source: row.source, tags: [...row.tags], status: row.status, version: row.version }, createdBy: actorId, createdAt: new Date(row.updatedAt), updatedAt: new Date(row.updatedAt) });
    }
  }

  private async syncArticleGalleryMetadata(transaction: Transaction, articles: readonly DashboardTenantState['articles'][number][], organizationId: string): Promise<void> {
    for (const article of articles) {
      if (article.bodyJson === null || article.bodyJson === undefined) continue;
      const refs = extractTipTapImages(article.bodyJson);
      if (refs.length === 0) continue;
      const position = new Map<string, number>();
      const editorial = new Map<string, { readonly alt: string | null; readonly caption: string | null }>();
      refs.forEach((ref, index) => {
        if (position.has(ref.mediaId)) return;
        position.set(ref.mediaId, index);
        editorial.set(ref.mediaId, { alt: ref.alt, caption: ref.caption });
      });
      const rows = await transaction.select({ id: media.id, articleId: media.articleId, altText: media.altText, caption: media.caption, sortOrder: media.sortOrder })
        .from(media)
        .where(and(eq(media.organizationId, organizationId), inArray(media.id, [...position.keys()]), eq(media.state, 'active'), sql`${media.mediaType} LIKE 'image/%'`));
      for (const row of rows) {
        if (row.articleId !== article.id && row.articleId !== null) continue;
        const patch = editorial.get(row.id);
        if (patch === undefined) continue;
        const nextAlt = row.altText ?? patch.alt;
        const nextCaption = row.caption ?? patch.caption;
        const nextOrder = position.get(row.id) ?? row.sortOrder;
        if (nextAlt === row.altText && nextCaption === row.caption && nextOrder === row.sortOrder) continue;
        await transaction.update(media).set({ altText: nextAlt, caption: nextCaption, sortOrder: nextOrder, updatedAt: new Date() })
          .where(and(eq(media.organizationId, organizationId), eq(media.id, row.id)));
      }
    }
  }

  private async enqueueDeliveryInvalidations(transaction: Transaction, before: DashboardTenantState, state: MutableTenantState, index: TenantStateIndex, loaded?: ReadonlySet<DashboardCollectionName>): Promise<void> {
    type Aggregate = { siteId: string; previousHostname: string | null; currentHostname: string | null; reasons: Set<string>; articleSlugs: Set<string>; categorySlugs: Set<string>; mediaIds: Set<string> };
    const want = (name: DashboardCollectionName): boolean => loaded === undefined || loaded.has(name);
    const sites = want('sites') ? state.sites : [];
    const regions = want('regions') ? state.regions : [];
    const siteSettings = want('siteSettings') ? state.siteSettings : [];
    const articles = want('articles') ? state.articles : [];
    const articleSites = want('articleSites') ? state.articleSites : [];
    const publishers = want('publishers') ? state.publishers : [];
    const affiliations = want('affiliations') ? state.affiliations : [];
    const categories = want('categories') ? state.categories : [];
    const authors = want('authors') ? state.authors : [];
    const affected = new Map<string, Aggregate>();
    const priorSite = (siteId: string) => index.priorSites.get(siteId);
    const currentSite = (siteId: string) => index.currentSites.get(siteId);
    const priorArticle = (articleId: string) => index.priorArticles.get(articleId);
    const currentArticle = (articleId: string) => index.currentArticles.get(articleId);
    const priorCategorySlug = (categoryId: string) => index.priorCategories.get(categoryId)?.slug;
    const currentCategorySlug = (categoryId: string) => index.currentCategories.get(categoryId)?.slug;
    const add = (siteId: string, reason: string, articleSlugs: readonly string[] = [], categorySlugs: readonly string[] = [], mediaIds: readonly string[] = []) => {
      const prior = priorSite(siteId); const current = currentSite(siteId); if (prior === undefined && current === undefined) return;
      const aggregate = affected.get(siteId) ?? { siteId, previousHostname: prior?.normalizedHostname ?? null, currentHostname: current?.normalizedHostname ?? null, reasons: new Set<string>(), articleSlugs: new Set<string>(), categorySlugs: new Set<string>(), mediaIds: new Set<string>() };
      aggregate.reasons.add(reason); for (const slug of articleSlugs) aggregate.articleSlugs.add(slug); for (const slug of categorySlugs) aggregate.categorySlugs.add(slug); for (const id of mediaIds) aggregate.mediaIds.add(id); affected.set(siteId, aggregate);
    };
    const changed = (left: unknown, right: unknown) => !sameJson(left, right);
    const articleDetails = (articleId: string) => {
      const prior = priorArticle(articleId); const current = currentArticle(articleId);
      const categoryIds = [prior?.categoryId, current?.categoryId].filter((id): id is string => id !== null && id !== undefined);
      const categorySlugs = categoryIds.flatMap((id) => [priorCategorySlug(id), currentCategorySlug(id)]).filter((slug): slug is string => slug !== undefined);
      return { slugs: [prior?.slug, current?.slug].filter((slug): slug is string => slug !== undefined), categorySlugs };
    };
    for (const site of sites) { const prior = priorSite(site.id); if (prior !== undefined && changed({ host: prior.normalizedHostname, region: prior.regionId, level: prior.siteLevel, parent: prior.parentSiteId, status: prior.status, activation: prior.activationState }, { host: site.normalizedHostname, region: site.regionId, level: site.siteLevel, parent: site.parentSiteId, status: site.status, activation: site.activationState })) add(site.id, 'site.mapping'); }
    for (const region of regions) { const prior = index.priorRegions.get(region.id); if (prior !== undefined && changed(prior, region)) for (const site of sites.filter((item) => item.regionId === region.id)) add(site.id, 'region.changed'); }
    for (const settings of siteSettings) { const prior = index.priorSiteSettings.get(settings.siteId); if (prior !== undefined && changed(prior, settings)) { const mediaIds = [prior.logoMediaId, prior.faviconMediaId, prior.defaultMediaId, settings.logoMediaId, settings.faviconMediaId, settings.defaultMediaId].filter((id): id is string => id !== null); add(settings.siteId, 'site_settings.changed', [], mediaIds); } }
    for (const article of articles) {
      const prior = priorArticle(article.id); if (prior === undefined || !changed(prior, article)) continue;
      const details = articleDetails(article.id);
      const relations = [...before.articleSites, ...articleSites].filter((relation) => relation.articleId === article.id);
      for (const relation of relations) add(relation.siteId, 'article.changed', details.slugs, details.categorySlugs);
    }
    for (const relation of articleSites) { const prior = index.priorArticleSites.get(relation.id); if (prior === undefined || changed(prior, relation)) { const details = articleDetails(relation.articleId); add(relation.siteId, 'article_site.changed', details.slugs, details.categorySlugs); if (prior !== undefined && prior.siteId !== relation.siteId) add(prior.siteId, 'article_site.changed', details.slugs, details.categorySlugs); } }
    for (const publisher of publishers) { const prior = index.priorPublishers.get(publisher.id); if (prior === undefined || !changed(prior, publisher)) continue; for (const article of articles.filter((item) => item.publisherId === publisher.id)) { const details = articleDetails(article.id); for (const relation of articleSites.filter((item) => item.articleId === article.id)) add(relation.siteId, 'publisher.changed', details.slugs, details.categorySlugs); } }
    for (const affiliation of affiliations) { const prior = index.priorAffiliations.get(affiliation.id); if (prior !== undefined && !changed(prior, affiliation)) continue; const publisherIds = [prior?.publisherId, affiliation.publisherId].filter((id): id is string => id !== undefined); const siteIds = [prior?.siteId, affiliation.siteId].filter((id): id is string => id !== undefined); for (const article of articles.filter((item) => item.publisherId !== null && publisherIds.includes(item.publisherId))) { const details = articleDetails(article.id); for (const siteId of siteIds) if (articleSites.some((item) => item.articleId === article.id && item.siteId === siteId)) add(siteId, 'affiliation.changed', details.slugs, details.categorySlugs); } }
    for (const category of categories) { const prior = index.priorCategories.get(category.id); if (prior === undefined || !changed(prior, category)) continue; for (const article of articles.filter((item) => item.categoryId === category.id)) { const details = articleDetails(article.id); for (const relation of articleSites.filter((item) => item.articleId === article.id)) add(relation.siteId, 'category.changed', details.slugs, [...details.categorySlugs, category.slug]); } }
    for (const author of authors) { const prior = index.priorAuthors.get(author.id); if (prior === undefined || !changed(prior, author)) continue; for (const article of articles.filter((item) => item.authorId === author.id)) { const details = articleDetails(article.id); for (const relation of articleSites.filter((item) => item.articleId === article.id)) add(relation.siteId, 'author.changed', details.slugs, details.categorySlugs); } }
    const targets = [...affected.values()].map((aggregate) => completeInvalidationValues({ organizationId: state.organizationId, siteId: aggregate.siteId, previousHostname: aggregate.previousHostname, currentHostname: aggregate.currentHostname, reason: [...aggregate.reasons].sort().join(','), articleSlugs: [...aggregate.articleSlugs], categorySlugs: [...aggregate.categorySlugs], mediaIds: [...aggregate.mediaIds] }));
    for (const chunk of insertChunks(targets)) await transaction.insert(invalidationTasks).values(chunk as never);
  }
}
