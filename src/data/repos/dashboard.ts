import { and, desc, eq, gt, isNotNull, isNull, or, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import type { AuthorizedTenantActorContext } from '@/core/operation-context';
import type { AktivitasJam, AktivitasTerbaru, AnalyticsProjection, ArusPenerbit, AuditFilter, AuditRecord, ActivationAttemptRecord, DashboardProjection, DashboardTenantState, EditorialSummaries, EditorialSummaryArticle, InvitationSummary, JendelaDeret, OperationsProjection, RetentionRunRecord, TugasHarian } from '@/modules/dashboard/models';
import { DashboardAccessDeniedError, DashboardConflictError, DashboardRateLimitedError, DashboardSubscriptionInactiveError, type MutableTenantState, type DashboardRepository, type DashboardTransaction } from '@/modules/dashboard/ports';
import { redact } from '@/core/security/redaction';
import {
  apiKeys, articleSites, articles, auditLogs, authors, cacheBypasses, categories, domainActivationAttempts, domains, invalidationTasks, media, mediaKeyReservations, memberships, objectCleanupTasks, officialAffiliations, organizations,
  permissions, publicationTransitionReceipts, publishers, publishingJobs, publishingJobTargets, regions, rolePermissions, roles, sites, siteSettings, telegramConversations, telegramIdentityMappings, users, webhookReplayClaims,
} from '@/data/schema';
import type * as schema from '@/data/schema';
import { completeInvalidationValues } from '@/data/repos/shared/delivery-invalidation-values';

type Database = PostgresJsDatabase<typeof schema>;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
const iso = (value: Date) => value.toISOString();
const isoOf = (value: Date | string) => (value instanceof Date ? value.toISOString() : new Date(value).toISOString());
const optionalIso = (value: Date | null) => value?.toISOString() ?? null;

function kurangiHari(hari: string, jumlah: number): string {
  const tanggal = new Date(`${hari}T00:00:00Z`);
  tanggal.setUTCDate(tanggal.getUTCDate() - jumlah);
  return tanggal.toISOString().slice(0, 10);
}

function daftarHari(awal: string, akhir: string): string[] {
  const daftar: string[] = [];
  let hari = awal;
  while (hari <= akhir) {
    daftar.push(hari);
    const tanggal = new Date(`${hari}T00:00:00Z`);
    tanggal.setUTCDate(tanggal.getUTCDate() + 1);
    hari = tanggal.toISOString().slice(0, 10);
  }
  return daftar;
}

function tentukanJendela(filter: { readonly from?: string | undefined; readonly to?: string | undefined }): JendelaDeret {
  const hariIni = new Date().toISOString().slice(0, 10);
  const akhir = filter.to === undefined ? hariIni : filter.to.slice(0, 10);
  const awalBaku = filter.from === undefined ? kurangiHari(akhir, 89) : filter.from.slice(0, 10);
  const awalJepit = kurangiHari(akhir, 89) > awalBaku ? kurangiHari(akhir, 89) : awalBaku;
  return awalJepit > akhir ? { awal: akhir, akhir } : { awal: awalJepit, akhir };
}
const MANUAL_PURGE_BULK_COOLDOWN_SECONDS = 120;

/**
 * Kelola persistensi state tenan dashboard di Postgres.
 *
 * @remarks Gate langganan hanya berlaku untuk sesi user; aktor non-user membawa scope sendiri.
 */
export class DrizzleDashboardRepository implements DashboardRepository {
  constructor(private readonly database: Database) {}

  private async establishContext(transaction: Transaction, actor: AuthorizedTenantActorContext): Promise<void> {
    await transaction.execute(sql`SELECT indicate_private.set_tenant_context(${actor.organizationId}::uuid, ${actor.actorId}, ${actor.requestId})`);
    await transaction.execute(sql`SELECT indicate_private.set_region_context(${actor.regionScopeId ?? null}::uuid)`);
    if (actor.actorType === 'user') {
      await transaction.execute(sql`SELECT indicate_private.set_verified_user_context(${actor.verifiedAuthUserId}::uuid)`);
    }
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
      .limit(1).for('update', { of: memberships });
    if (grants.length !== 1) throw new DashboardAccessDeniedError();
  }

  private async load(transaction: Transaction, organizationId: string): Promise<DashboardTenantState> {
    const organization = await transaction.select().from(organizations).where(and(eq(organizations.id, organizationId), eq(organizations.status, 'active'))).limit(1);
    if (organization[0] === undefined) throw new DashboardAccessDeniedError();
    const [domainRows, regionRows, siteRows, settingsRows, roleRows, grantRows, membershipRows, telegramMappingRows, publisherRows, affiliationRows, categoryRows, authorRows, articleRows, assignmentRows, mediaRows, jobRows, targetRows] = await Promise.all([
      transaction.select().from(domains).where(eq(domains.organizationId, organizationId)), transaction.select().from(regions).where(eq(regions.organizationId, organizationId)),
      transaction.select().from(sites).where(eq(sites.organizationId, organizationId)), transaction.select().from(siteSettings).where(eq(siteSettings.organizationId, organizationId)),
      transaction.select().from(roles).where(eq(roles.organizationId, organizationId)),
      transaction.select({ roleId: rolePermissions.roleId, permission: permissions.name }).from(rolePermissions).innerJoin(permissions, and(eq(permissions.id, rolePermissions.permissionId), eq(permissions.organizationId, organizationId), eq(permissions.scope, 'organization'))).where(eq(rolePermissions.organizationId, organizationId)),
      transaction.select().from(memberships).where(eq(memberships.organizationId, organizationId)),
      transaction.select().from(telegramIdentityMappings).where(eq(telegramIdentityMappings.organizationId, organizationId)),
      transaction.select().from(publishers).where(eq(publishers.organizationId, organizationId)), transaction.select().from(officialAffiliations).where(eq(officialAffiliations.organizationId, organizationId)),
      transaction.select().from(categories).where(eq(categories.organizationId, organizationId)), transaction.select().from(authors).where(eq(authors.organizationId, organizationId)),
      transaction.select().from(articles).where(eq(articles.organizationId, organizationId)), transaction.select().from(articleSites).where(eq(articleSites.organizationId, organizationId)),
      transaction.select().from(media).where(eq(media.organizationId, organizationId)), transaction.select().from(publishingJobs).where(eq(publishingJobs.organizationId, organizationId)),
      transaction.select().from(publishingJobTargets).where(eq(publishingJobTargets.organizationId, organizationId)),
    ]);
    const profileRows = await Promise.all(
      membershipRows.map((membership) =>
        transaction.execute<{ display_name: string | null; avatar_url: string | null }>(sql`
        SELECT display_name, avatar_url FROM indicate_private.lookup_user_profile(${membership.userId}::uuid)
      `),
      ),
    );
    const membershipProfiles = new Map<string, { displayName: string; avatarUrl: string | null }>();
    membershipRows.forEach((membership, index) => {
      const profile = profileRows[index]?.[0];
      // Lookup terikat verified-user: aktor non-user (telegram/api_key) tidak
      // punya konteks itu sehingga selalu kosong — pakai userId sebagai label
      // netral (sudah terekspos di payload yang sama), bukan menggagalkan baca.
      membershipProfiles.set(membership.userId, { displayName: profile?.display_name ?? membership.userId, avatarUrl: profile?.avatar_url ?? null });
    });
    const permissionsByRole = new Map<string, Set<string>>();
    for (const grant of grantRows) {
      const set = permissionsByRole.get(grant.roleId) ?? new Set<string>(); set.add(grant.permission); permissionsByRole.set(grant.roleId, set);
    }
    return {
      organizationId, organizationName: organization[0].name,
      domains: domainRows.map((row) => ({ id: row.id, organizationId, normalizedHostname: row.normalizedHostname, status: row.status, version: row.version, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt) })),
      regions: regionRows.map((row) => ({ id: row.id, organizationId, externalKey: row.externalKey, name: row.name, slug: row.slug, status: row.status, version: row.version, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt) })),
      sites: siteRows.map((row) => ({ id: row.id, organizationId, domainId: row.domainId, regionId: row.regionId, normalizedHostname: row.normalizedHostname, status: row.status, activationState: row.activationState, version: row.version, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt) })),
      siteSettings: settingsRows.map((row) => ({ id: row.siteId, organizationId, siteId: row.siteId, name: row.name, description: row.description, tagline: row.tagline, seoDefaultTitle: row.seoDefaultTitle, seoDefaultDescription: row.seoDefaultDescription, seoOpenGraphSiteName: row.seoOpenGraphSiteName, locale: row.locale, seoRobotsDirective: row.seoRobotsDirective, colors: row.colors, socialLinks: row.socialLinks, seo: row.seo, navigation: row.navigation.map((item) => ({ label: String(item.label ?? ''), path: String(item.path ?? '/') })), logoMediaId: row.logoMediaId, faviconMediaId: row.faviconMediaId, defaultMediaId: row.defaultMediaId, version: row.version, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt) })),
      roles: roleRows.map((row) => ({ id: row.id, organizationId, name: row.name, tier: row.tier, active: row.active, permissions: permissionsByRole.get(row.id) ?? new Set(), version: row.version, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt) })),
      memberships: membershipRows.map((membership) => ({ id: membership.userId, organizationId, userId: membership.userId, displayName: membershipProfiles.get(membership.userId)!.displayName, avatarUrl: membershipProfiles.get(membership.userId)!.avatarUrl, roleId: membership.roleId, status: membership.status, regionId: membership.regionId, version: membership.version, createdAt: iso(membership.createdAt), updatedAt: iso(membership.updatedAt) })),
      telegramMappings: telegramMappingRows.map((mapping) => ({ id: mapping.id, organizationId, userId: mapping.userId, roleId: mapping.roleId, status: mapping.status, createdAt: iso(mapping.createdAt), updatedAt: iso(mapping.updatedAt) })),
      publishers: publisherRows.map((row) => ({ id: row.id, organizationId, name: row.name, type: row.type, attributionLabel: row.attributionLabel, contacts: Object.fromEntries(Object.entries(row.contacts).map(([key, value]) => [key, String(value)])), evidenceReference: row.evidenceReference, verificationStatus: row.verificationStatus, submittedBy: row.submittedBy, submittedAt: optionalIso(row.submittedAt), verifiedBy: row.verifiedBy, verifiedAt: optionalIso(row.verifiedAt), rejectionReason: row.rejectionReason, status: row.status, version: row.version, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt) })),
      affiliations: affiliationRows.map((row) => ({ id: row.id, organizationId, publisherId: row.publisherId, siteId: row.siteId, institutionName: row.institutionName, claimScopes: row.claimScopes, evidenceReference: row.evidenceReference, active: row.active, verifiedAt: optionalIso(row.verifiedAt), version: row.version, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt) })),
      categories: categoryRows.map((row) => ({ id: row.id, organizationId, name: row.name, slug: row.slug, status: row.status, version: row.version, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt) })),
      authors: authorRows.map((row) => ({ id: row.id, organizationId, displayName: row.displayName, byline: row.byline, status: row.status, version: row.version, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt) })),
      articles: articleRows.map((row) => ({ id: row.id, organizationId, regionId: row.regionId, publisherId: row.publisherId, categoryId: row.categoryId, authorId: row.authorId, slug: row.slug, title: row.title, body: row.body, source: row.source, tags: [...row.tags], status: row.status, publishedAt: optionalIso(row.publishedAt), archivedAt: optionalIso(row.archivedAt), version: row.version, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt) })),
      articleSites: assignmentRows.map((row) => ({ id: row.id, organizationId, articleId: row.articleId, siteId: row.siteId, state: row.state, stateOccurredAt: iso(row.stateOccurredAt), publishedUrl: row.publishedUrl, publishedAt: optionalIso(row.publishedAt), active: row.active, viewCount: row.viewCount, version: row.version, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt) })),
      media: mediaRows.map((row) => ({ id: row.id, organizationId, state: row.state })),
      publishingJobs: jobRows.map((row) => ({ id: row.id, organizationId, articleId: row.articleId, state: row.state, createdAt: iso(row.createdAt), occurredAt: iso(row.finalizedAt ?? row.updatedAt) })),
      publishingJobTargets: targetRows.map((row) => ({ id: row.id, organizationId, jobId: row.jobId, articleSiteId: row.articleSiteId, state: row.state, occurredAt: iso(row.finishedAt ?? row.updatedAt) })),
    };
  }

  async analyticsSummary(
    actor: AuthorizedTenantActorContext,
    permission: string,
    filter: { readonly from?: string | undefined; readonly to?: string | undefined },
  ): Promise<AnalyticsProjection> {
    return this.database.transaction(async (transaction) => {
      await this.establishContext(transaction, actor);
      await this.authorize(transaction, actor, permission);
      const organization = await transaction.select({ id: organizations.id }).from(organizations).where(and(eq(organizations.id, actor.organizationId), eq(organizations.status, 'active'))).limit(1);
      if (organization.length !== 1) throw new DashboardAccessDeniedError();
      const orgId = actor.organizationId;
      const from: string | null = filter.from ?? null;
      const to: string | null = filter.to ?? null;
      const jendela = tentukanJendela(filter);
      const inArticleRange = sql`(${from}::timestamptz IS NULL OR created_at >= ${from}::timestamptz) AND (${to}::timestamptz IS NULL OR created_at <= ${to}::timestamptz)`;
      const [byRegion, byCategory, byPublisher, byStatus, jobsByState, bySite, outcomesBySite, jobDimensions, outcomeDimensions, tugasBaris, jamBaris, tugasBaru, hasilBaru, artikelBaru, arusBaris, penyaluranBaris, viewsBaris, viewsSiteBaris, viewsArticleBaris, totalBaris, siteLabelBaris, categoryLabelBaris, publisherLabelBaris, regionLabelBaris, articleLabelBaris] = await Promise.all([
        transaction.execute<{ key: string; count: number }>(sql`
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
        transaction.execute<{ siteId: string; regionId: string; state: string }>(sql`
          SELECT s.site_id AS "siteId", COALESCE(st.region_id, ar.region_id) AS "regionId", j.state AS state
          FROM publishing_jobs j
          JOIN publishing_job_targets t ON t.organization_id = ${orgId} AND t.job_id = j.id
          JOIN article_sites s ON s.organization_id = ${orgId} AND s.id = t.article_site_id
          JOIN articles ar ON ar.organization_id = ${orgId} AND ar.id = j.article_id
          JOIN sites st ON st.organization_id = ${orgId} AND st.id = s.site_id
          WHERE j.organization_id = ${orgId}
            AND (${from}::timestamptz IS NULL OR COALESCE(j.finalized_at, j.updated_at) >= ${from}::timestamptz)
            AND (${to}::timestamptz IS NULL OR COALESCE(j.finalized_at, j.updated_at) <= ${to}::timestamptz)`),
        transaction.execute<{ siteId: string; regionId: string; state: string }>(sql`
          SELECT s.site_id AS "siteId", COALESCE(st.region_id, ar.region_id) AS "regionId", s.state AS state
          FROM article_sites s
          JOIN articles ar ON ar.organization_id = ${orgId} AND ar.id = s.article_id
          JOIN sites st ON st.organization_id = ${orgId} AND st.id = s.site_id
          WHERE s.organization_id = ${orgId}
            AND (${from}::timestamptz IS NULL OR s.state_occurred_at >= ${from}::timestamptz)
            AND (${to}::timestamptz IS NULL OR s.state_occurred_at <= ${to}::timestamptz)`),
        transaction.execute<{ hari: string; state: string; count: number }>(sql`
          SELECT (COALESCE(j.finalized_at, j.updated_at) AT TIME ZONE 'UTC')::date::text AS hari,
            j.state AS state, count(*)::int AS count
          FROM publishing_jobs j
          WHERE j.organization_id = ${orgId}
            AND (COALESCE(j.finalized_at, j.updated_at) AT TIME ZONE 'UTC')::date >= ${jendela.awal}::date
            AND (COALESCE(j.finalized_at, j.updated_at) AT TIME ZONE 'UTC')::date <= ${jendela.akhir}::date
          GROUP BY 1, 2`),
        transaction.execute<{ hari: number; jam: number; jumlah: number }>(sql`
          SELECT ((EXTRACT(DOW FROM s.state_occurred_at AT TIME ZONE 'Asia/Jakarta')::int + 6) % 7) AS hari,
            EXTRACT(HOUR FROM s.state_occurred_at AT TIME ZONE 'Asia/Jakarta')::int AS jam,
            count(*)::int AS jumlah
          FROM article_sites s
          WHERE s.organization_id = ${orgId}
            AND (s.state_occurred_at AT TIME ZONE 'UTC')::date >= ${jendela.awal}::date
            AND (s.state_occurred_at AT TIME ZONE 'UTC')::date <= ${jendela.akhir}::date
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
          SELECT s.id AS id, ar.title AS label, s.state AS status, s.state_occurred_at AS at
          FROM article_sites s
          JOIN articles ar ON ar.organization_id = ${orgId} AND ar.id = s.article_id
          WHERE s.organization_id = ${orgId}
            AND (${from}::timestamptz IS NULL OR s.state_occurred_at >= ${from}::timestamptz)
            AND (${to}::timestamptz IS NULL OR s.state_occurred_at <= ${to}::timestamptz)
          ORDER BY at DESC LIMIT 8`),
        transaction.execute<{ id: string; label: string; status: string; at: Date | string }>(sql`
          SELECT a.id AS id, a.title AS label, a.status AS status, a.created_at AS at
          FROM articles a
          WHERE a.organization_id = ${orgId} AND ${inArticleRange}
          ORDER BY at DESC LIMIT 8`),
        transaction.execute<{ penerbit: string; situs: string; hasil: string; jumlah: number }>(sql`
          SELECT a.publisher_id AS penerbit, s.site_id AS situs, s.state AS hasil, count(*)::int AS jumlah
          FROM article_sites s
          JOIN articles a ON a.organization_id = ${orgId} AND a.id = s.article_id
          WHERE s.organization_id = ${orgId} AND a.publisher_id IS NOT NULL
            AND (${from}::timestamptz IS NULL OR s.state_occurred_at >= ${from}::timestamptz)
            AND (${to}::timestamptz IS NULL OR s.state_occurred_at <= ${to}::timestamptz)
          GROUP BY 1, 2, 3`),
        transaction.execute<{ hari: string; state: string; count: number }>(sql`
          SELECT (s.state_occurred_at AT TIME ZONE 'UTC')::date::text AS hari,
            s.state AS state, count(*)::int AS count
          FROM article_sites s
          WHERE s.organization_id = ${orgId}
            AND (s.state_occurred_at AT TIME ZONE 'UTC')::date >= ${jendela.awal}::date
            AND (s.state_occurred_at AT TIME ZONE 'UTC')::date <= ${jendela.akhir}::date
          GROUP BY 1, 2`),
        transaction.execute<{ hari: string; penyaluran: number; views: number }>(sql`
          SELECT (s.state_occurred_at AT TIME ZONE 'UTC')::date::text AS hari,
            count(*)::int AS penyaluran, COALESCE(SUM(s.view_count), 0)::int AS views
          FROM article_sites s
          WHERE s.organization_id = ${orgId}
            AND (s.state_occurred_at AT TIME ZONE 'UTC')::date >= ${jendela.awal}::date
            AND (s.state_occurred_at AT TIME ZONE 'UTC')::date <= ${jendela.akhir}::date
          GROUP BY 1`),
        transaction.execute<{ id: string; nama: string; jumlah: number; tayangan: number }>(sql`
          SELECT s.site_id AS id, st.normalized_hostname AS nama,
            count(*)::int AS jumlah, COALESCE(SUM(s.view_count), 0)::int AS tayangan
          FROM article_sites s
          JOIN sites st ON st.organization_id = ${orgId} AND st.id = s.site_id
          WHERE s.organization_id = ${orgId}
            AND (${from}::timestamptz IS NULL OR s.state_occurred_at >= ${from}::timestamptz)
            AND (${to}::timestamptz IS NULL OR s.state_occurred_at <= ${to}::timestamptz)
          GROUP BY 1, 2`),
        transaction.execute<{ id: string; nama: string; jumlah: number; tayangan: number }>(sql`
          SELECT s.article_id AS id, ar.title AS nama,
            count(*)::int AS jumlah, COALESCE(SUM(s.view_count), 0)::int AS tayangan
          FROM article_sites s
          JOIN articles ar ON ar.organization_id = ${orgId} AND ar.id = s.article_id
          WHERE s.organization_id = ${orgId}
            AND (${from}::timestamptz IS NULL OR s.state_occurred_at >= ${from}::timestamptz)
            AND (${to}::timestamptz IS NULL OR s.state_occurred_at <= ${to}::timestamptz)
          GROUP BY 1, 2`),
        transaction.execute<{ total: number; salur: number }>(sql`
          SELECT COALESCE(SUM(s.view_count), 0)::int AS total, count(*)::int AS salur
          FROM article_sites s
          WHERE s.organization_id = ${orgId}
            AND (${from}::timestamptz IS NULL OR s.state_occurred_at >= ${from}::timestamptz)
            AND (${to}::timestamptz IS NULL OR s.state_occurred_at <= ${to}::timestamptz)`),
        transaction.execute<{ id: string; nama: string }>(sql`
          SELECT id, normalized_hostname AS nama FROM sites WHERE organization_id = ${orgId}`),
        transaction.execute<{ id: string; nama: string }>(sql`
          SELECT id, name AS nama FROM categories WHERE organization_id = ${orgId}`),
        transaction.execute<{ id: string; nama: string }>(sql`
          SELECT id, name AS nama FROM publishers WHERE organization_id = ${orgId}`),
        transaction.execute<{ id: string; nama: string }>(sql`
          SELECT id, name AS nama FROM regions WHERE organization_id = ${orgId}`),
        transaction.execute<{ id: string; nama: string }>(sql`
          SELECT id, title AS nama FROM articles WHERE organization_id = ${orgId}`),
      ]);
      const points = (rows: readonly { key: string; count: number }[]) =>
        [...rows].map(({ key, count }) => ({ key, count })).sort((a, b) => a.key.localeCompare(b.key));
      const dimensionPoints = (rows: readonly { siteId: string; regionId: string | null; state: string }[]) => {
        const counts = new Map<string, number>();
        for (const row of rows) {
          if (row.regionId === null) continue;
          const key = `${row.siteId}:${row.regionId}:${row.state}`;
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
        return [...counts].sort(([left], [right]) => left.localeCompare(right)).map(([key, count]) => ({ key, count }));
      };
      const perHari = new Map<string, { diterbitkan: number; gagal: number; antre: number }>();
      for (const row of tugasBaris) {
        const slot = perHari.get(row.hari) ?? { diterbitkan: 0, gagal: 0, antre: 0 };
        if (row.state === 'published') slot.diterbitkan += row.count;
        else if (row.state === 'failed') slot.gagal += row.count;
        else if (row.state === 'queued' || row.state === 'processing' || row.state === 'retrying') slot.antre += row.count;
        perHari.set(row.hari, slot);
      }
      const tugasHarian: TugasHarian[] = daftarHari(jendela.awal, jendela.akhir).map((hari) => ({
        hari,
        ...(perHari.get(hari) ?? { diterbitkan: 0, gagal: 0, antre: 0 }),
      }));
      const aktivitasPerJam: AktivitasJam[] = [...jamBaris]
        .sort((kiri, kanan) => kiri.hari - kanan.hari || kiri.jam - kanan.jam)
        .map(({ hari, jam, jumlah }) => ({ hari, jam, jumlah }));
      const aktivitasTerbaru: AktivitasTerbaru[] = [
        ...tugasBaru.map((row) => ({ id: `job:${row.id}`, label: row.label, status: row.status, at: isoOf(row.at) })),
        ...hasilBaru.map((row) => ({ id: `hasil:${row.id}`, label: row.label, status: row.status, at: isoOf(row.at) })),
        ...artikelBaru.map((row) => ({ id: `artikel:${row.id}`, label: row.label, status: row.status, at: isoOf(row.at) })),
      ]
        .sort((kiri, kanan) => (kiri.at < kanan.at ? 1 : kiri.at > kanan.at ? -1 : 0))
        .slice(0, 8);
      const arusPenerbit: ArusPenerbit[] = [...arusBaris]
        .sort((kiri, kanan) => kanan.jumlah - kiri.jumlah)
        .map(({ penerbit, situs, hasil, jumlah }) => ({ penerbit, situs, hasil, jumlah }));
      const penyaluranPerHari = new Map<string, { diterbitkan: number; gagal: number; antre: number }>();
      for (const row of penyaluranBaris) {
        const slot = penyaluranPerHari.get(row.hari) ?? { diterbitkan: 0, gagal: 0, antre: 0 };
        if (row.state === 'published') slot.diterbitkan += row.count;
        else if (row.state === 'failed') slot.gagal += row.count;
        else if (row.state === 'queued' || row.state === 'processing' || row.state === 'retrying' || row.state === 'unpublished') slot.antre += row.count;
        penyaluranPerHari.set(row.hari, slot);
      }
      const penyaluranHarian = daftarHari(jendela.awal, jendela.akhir).map((hari) => ({
        hari,
        ...(penyaluranPerHari.get(hari) ?? { diterbitkan: 0, gagal: 0, antre: 0 }),
      }));
      const viewsPerHari = new Map(viewsBaris.map((row) => [row.hari, row] as const));
      const viewsHarian = daftarHari(jendela.awal, jendela.akhir).map((hari) => {
        const row = viewsPerHari.get(hari);
        return { hari, penyaluran: row?.penyaluran ?? 0, views: row?.views ?? 0 };
      });
      const siteLabels: Record<string, string> = {};
      for (const row of siteLabelBaris) siteLabels[row.id] = row.nama;
      const categoryLabels: Record<string, string> = {};
      for (const row of categoryLabelBaris) categoryLabels[row.id] = row.nama;
      const publisherLabels: Record<string, string> = {};
      for (const row of publisherLabelBaris) publisherLabels[row.id] = row.nama;
      const regionLabels: Record<string, string> = {};
      for (const row of regionLabelBaris) regionLabels[row.id] = row.nama;
      const articleLabels: Record<string, string> = {};
      for (const row of articleLabelBaris) articleLabels[row.id] = row.nama;
      for (const row of viewsSiteBaris) siteLabels[row.id] ??= row.nama;
      for (const row of viewsArticleBaris) articleLabels[row.id] ??= row.nama;
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
        jendela,
        tugasHarian,
        aktivitasPerJam,
        aktivitasTerbaru,
        arusPenerbit,
        penyaluranHarian,
        viewsHarian,
        viewsBySite: [...viewsSiteBaris]
          .sort((kiri, kanan) => kanan.tayangan - kiri.tayangan)
          .map((row) => ({ key: row.id, count: row.jumlah, views: row.tayangan })),
        viewsByArticle: [...viewsArticleBaris]
          .sort((kiri, kanan) => kanan.tayangan - kiri.tayangan)
          .map((row) => ({ key: row.id, count: row.jumlah, views: row.tayangan })),
        totalViews: totalBaris[0]?.total ?? 0,
        totalPenyaluran: totalBaris[0]?.salur ?? 0,
        siteLabels,
        categoryLabels,
        publisherLabels,
        regionLabels,
        articleLabels,
      });
    });
  }

  async auditLogPage(actor: AuthorizedTenantActorContext, permission: string, filter: AuditFilter): Promise<readonly AuditRecord[]> {
    return this.database.transaction(async (transaction) => {
      await this.establishContext(transaction, actor);
      await this.authorize(transaction, actor, permission);
      const organization = await transaction.select({ id: organizations.id }).from(organizations).where(and(eq(organizations.id, actor.organizationId), eq(organizations.status, 'active'))).limit(1);
      if (organization.length !== 1) throw new DashboardAccessDeniedError();
      const orgId = actor.organizationId;
      const rows = await transaction.execute<{
        readonly id: string; readonly actorType: AuditRecord['actorType']; readonly actorId: string;
        readonly entryPoint: AuditRecord['entryPoint']; readonly action: string; readonly targetType: string;
        readonly targetId: string | null; readonly outcome: AuditRecord['outcome'];
        readonly changedFields: readonly string[]; readonly before: Readonly<Record<string, unknown>> | null;
        readonly after: Readonly<Record<string, unknown>> | null; readonly requestId: string; readonly occurredAt: Date;
      }>(sql`
        SELECT id, actor_type AS "actorType", actor_id AS "actorId", entry_point AS "entryPoint",
          action, target_type AS "targetType", target_id AS "targetId", outcome,
          changed_fields AS "changedFields", before, after, request_id AS "requestId", occurred_at AS "occurredAt"
        FROM audit_logs
        WHERE organization_id = ${orgId}
          AND (${filter.actorId ?? null} IS NULL OR actor_id = ${filter.actorId ?? null})
          AND (${filter.action ?? null} IS NULL OR action = ${filter.action ?? null})
          AND (${filter.targetType ?? null} IS NULL OR target_type = ${filter.targetType ?? null})
          AND (${filter.outcome ?? null} IS NULL OR outcome = ${filter.outcome ?? null})
          AND (${filter.from ?? null}::timestamptz IS NULL OR occurred_at >= ${filter.from ?? null}::timestamptz)
          AND (${filter.to ?? null}::timestamptz IS NULL OR occurred_at <= ${filter.to ?? null}::timestamptz)
        ORDER BY occurred_at DESC
        LIMIT 500`);
      return Object.freeze(rows.map((row) => ({
        id: row.id, organizationId: orgId, actorType: row.actorType, actorId: row.actorId, entryPoint: row.entryPoint,
        action: row.action, targetType: row.targetType, targetId: row.targetId, outcome: row.outcome,
        changedFields: [...row.changedFields], before: row.before, after: row.after,
        requestId: row.requestId, occurredAt: row.occurredAt.toISOString(),
      })));
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
        readonly purged_count: number; readonly started_at: Date; readonly finished_at: Date;
      }>(sql`SELECT * FROM indicate_private.retention_list(${actor.actorId}::uuid, ${actor.organizationId}::uuid)`);
      return Object.freeze(rows.map((row) => ({
        id: row.id,
        organizationId: row.organization_id,
        name: `${row.category} — ${row.purged_count} purged`,
        status: 'success' as const,
        category: row.category,
        purgedCount: row.purged_count,
        startedAt: row.started_at.toISOString(),
        finishedAt: row.finished_at.toISOString(),
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
        }>(sql`SELECT * FROM indicate_private.invite_list(${actor.actorId}::uuid, ${actor.organizationId}::uuid)`);
        const now = Date.now();
        return Object.freeze(rows.map((row) => {
          const status = row.accepted_at !== null ? 'accepted' as const : row.expires_at.getTime() <= now ? 'expired' as const : 'pending' as const;
          return {
            id: row.id, organizationId: actor.organizationId, name: row.email, status,
            email: row.email, roleId: row.role_id ?? '', roleName: row.role_name ?? '—',
            expiresAt: row.expires_at.toISOString(), acceptedAt: row.accepted_at?.toISOString() ?? null,
            createdAt: row.created_at.toISOString(),
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
      const [invalidationRows, cleanupRows, reservationRows, bypassRows, conversationRows, outboxRows, receiptRows, replayRows] = await Promise.all([
        transaction.select().from(invalidationTasks).where(eq(invalidationTasks.organizationId, organizationId)).orderBy(desc(invalidationTasks.updatedAt)).limit(100),
        transaction.select().from(objectCleanupTasks).where(eq(objectCleanupTasks.organizationId, organizationId)).orderBy(desc(objectCleanupTasks.updatedAt)).limit(100),
        transaction.select().from(mediaKeyReservations).where(eq(mediaKeyReservations.organizationId, organizationId)).orderBy(desc(mediaKeyReservations.updatedAt)).limit(100),
        transaction.select().from(cacheBypasses).where(eq(cacheBypasses.organizationId, organizationId)).orderBy(desc(cacheBypasses.updatedAt)).limit(100),
        transaction.select().from(telegramConversations).where(eq(telegramConversations.organizationId, organizationId)).orderBy(desc(telegramConversations.updatedAt)).limit(100),
        transaction.execute<{
          id: string; chat_id: string; status: string; attempts: number; next_attempt_at: Date; created_at: Date;
        }>(sql`SELECT * FROM indicate_private.outbox_list(${actor.actorId}::uuid, ${organizationId}::uuid)`),
        transaction.select().from(publicationTransitionReceipts).where(eq(publicationTransitionReceipts.organizationId, organizationId)).orderBy(desc(publicationTransitionReceipts.createdAt)).limit(100),
        transaction.select().from(webhookReplayClaims).where(eq(webhookReplayClaims.organizationId, organizationId)).orderBy(desc(webhookReplayClaims.receivedAt)).limit(100),
      ]);
      return Object.freeze({
        invalidationTasks: invalidationRows.map((row) => ({ id: row.id, organizationId, name: `${row.reason} · ${row.currentHostname ?? row.previousHostname ?? row.siteId}`, status: row.status, siteId: row.siteId, reason: row.reason, attempts: row.attempts, nextAttemptAt: row.nextAttemptAt.toISOString(), updatedAt: row.updatedAt.toISOString() })),
        objectCleanupTasks: cleanupRows.map((row) => ({ id: row.id, organizationId, name: row.objectKey, status: row.status, reason: row.reason, attempts: row.attempts, nextAttemptAt: row.nextAttemptAt.toISOString(), updatedAt: row.updatedAt.toISOString() })),
        mediaKeyReservations: reservationRows.map((row) => ({ id: row.id, organizationId, name: row.objectKey, status: row.status, purpose: row.purpose, expiresAt: row.expiresAt.toISOString(), updatedAt: row.updatedAt.toISOString() })),
        cacheBypasses: bypassRows.map((row) => ({ id: row.siteId, organizationId, name: row.siteId, status: row.bypass ? 'bypass' : 'cache', siteId: row.siteId, reason: row.reason, updatedAt: row.updatedAt.toISOString() })),
        telegramConversations: conversationRows.map((row) => ({ id: `${row.telegramChatId}:${row.telegramUserId}`, organizationId, name: `chat ${row.telegramChatId}`, status: 'active', step: row.step, expiresAt: row.expiresAt.toISOString(), updatedAt: row.updatedAt.toISOString() })),
        telegramOutbox: outboxRows.map((row) => ({ id: row.id, organizationId, name: `chat ${row.chat_id}`, status: row.status, attempts: row.attempts, nextAttemptAt: row.next_attempt_at.toISOString(), createdAt: row.created_at.toISOString() })),
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
      const lock = actor.regionScopeId ?? null;
      const inScope = (regionId: string | null) => lock === null || regionId === null || regionId === lock;
      const targets = siteId === null ? rows.filter((row) => inScope(row.regionId)) : rows.filter((row) => row.id === siteId && inScope(row.regionId));
      if (siteId !== null && targets.length !== 1) throw new DashboardAccessDeniedError();
      const now = new Date();
      for (const target of targets) {
        await transaction.insert(invalidationTasks).values(completeInvalidationValues({ organizationId: actor.organizationId, siteId: target.id, currentHostname: target.hostname, reason: 'manual-purge', now }));
        await transaction.insert(auditLogs).values({ organizationId: actor.organizationId, id: crypto.randomUUID(), actorType: actor.actorType, actorId: actor.actorId, entryPoint: actor.entryPoint, action: 'site.cache.purge', targetType: 'site', targetId: target.id, outcome: 'succeeded', changedFields: ['cache'], before: null, after: { hostname: target.hostname }, requestId: actor.requestId, occurredAt: now });
      }
      return Object.freeze(targets.map((target) => ({ siteId: target.id, hostname: target.hostname })));
    });
  }

  async read(actor: AuthorizedTenantActorContext, permission: string): Promise<DashboardTenantState> {    return this.database.transaction(async (transaction) => {
      await this.establishContext(transaction, actor);
      await this.authorize(transaction, actor, permission); return this.load(transaction, actor.organizationId);
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
        transaction.select({ id: regions.id, name: regions.name, status: regions.status }).from(regions).where(eq(regions.organizationId, organizationId)),
      ]);
      const scope = actor.regionScopeId === null || actor.regionScopeId === undefined ? null : regionRows.find((row) => row.id === actor.regionScopeId);
      return Object.freeze({
        articles: Object.freeze(articleRows.map((row) => Object.freeze({ id: row.id, regionId: row.regionId, slug: row.slug, title: row.title, status: row.status, createdAt: iso(row.createdAt) }))),
        sites: Object.freeze(siteRows.map((row) => Object.freeze({ id: row.id, regionId: row.regionId, normalizedHostname: row.normalizedHostname, status: row.status }))),
        regions: Object.freeze(regionRows.map((row) => Object.freeze({ id: row.id, name: row.name, status: row.status }))),
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
        readonly id: string; readonly regionId: string; readonly slug: string; readonly title: string;
        readonly status: EditorialSummaryArticle['status']; readonly createdAt: Date;
      }>(sql`
        SELECT id, region_id AS "regionId", slug, title, status, created_at AS "createdAt"
        FROM articles
        WHERE organization_id = ${actor.organizationId}
          AND (${scope}::uuid IS NULL OR region_id = ${scope}::uuid)
          AND (title ILIKE ${like} ESCAPE '\' OR body ILIKE ${like} ESCAPE '\')
        ORDER BY created_at DESC
        LIMIT ${bounded}`);
      return Object.freeze(rows.map((row) => Object.freeze({ id: row.id, regionId: row.regionId, slug: row.slug, title: row.title, status: row.status, createdAt: row.createdAt.toISOString() })));
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
          : actor.actorType === 'telegram'
            ? (await transaction.select({ id: telegramIdentityMappings.id }).from(telegramIdentityMappings).where(and(eq(telegramIdentityMappings.organizationId, actor.organizationId), eq(telegramIdentityMappings.id, actor.actorId), eq(telegramIdentityMappings.status, 'active'))).limit(1)).length === 1
            : (await transaction.select({ id: publishingJobs.id }).from(publishingJobs).where(and(eq(publishingJobs.organizationId, actor.organizationId), eq(publishingJobs.id, actor.actorId), eq(publishingJobs.dispatchStatus, 'leased'), isNotNull(publishingJobs.leaseOwner), gt(publishingJobs.leaseExpiresAt, new Date()))).limit(1)).length === 1;
      if (!attributable) return;
      await transaction.insert(auditLogs).values({ organizationId: actor.organizationId, id: crypto.randomUUID(), actorType: actor.actorType, actorId: actor.actorId, entryPoint: actor.entryPoint, action, targetType, outcome: 'denied', changedFields: [], requestId: actor.requestId });
    });
  }

  async execute<T>(actor: AuthorizedTenantActorContext, permission: string, operation: (transaction: DashboardTransaction) => T | Promise<T>): Promise<T> {
    return this.database.transaction(async (transaction) => {
      await this.establishContext(transaction, actor);
      await this.authorize(transaction, actor, permission);
      await this.enforceWritableSubscription(transaction, actor);
      await transaction.select({ id: organizations.id }).from(organizations).where(eq(organizations.id, actor.organizationId)).limit(1).for('update');
      const before = await this.load(transaction, actor.organizationId);
      const state = structuredClone(before) as MutableTenantState;
      const pendingAudits: AuditRecord[] = [];
      const dashboardTransaction: DashboardTransaction = {
        state,
        resolveUserDisplayName: async (userId) => {
          const rows = await transaction.execute<{ display_name: string | null }>(sql`
            SELECT display_name FROM indicate_private.lookup_user_profile(${userId}::uuid)
          `);
          return rows[0]?.display_name ?? null;
        },
        appendAudit: (event) => pendingAudits.push({ ...event, id: crypto.randomUUID(), organizationId: actor.organizationId, actorType: actor.actorType, actorId: actor.actorId, entryPoint: actor.entryPoint, requestId: actor.requestId, occurredAt: new Date().toISOString(), before: event.before === null ? null : redact(event.before) as Record<string, unknown>, after: event.after === null ? null : redact(event.after) as Record<string, unknown> }),
      };
      const result = await operation(dashboardTransaction);
      await this.persist(transaction, before, state, pendingAudits);
      return result;
    });
  }

  private async enforceWritableSubscription(transaction: Transaction, actor: AuthorizedTenantActorContext): Promise<void> {
    if (actor.actorType !== 'user') return;
    const rows = await transaction.execute<{ state: string }>(sql`SELECT indicate_private.subscription_access_state(${actor.organizationId}::uuid) AS state`);
    const state = rows[0]?.state;
    if (state === 'platform' || state === 'active') return;
    throw new DashboardSubscriptionInactiveError(state ?? 'none');
  }

  private async persist(transaction: Transaction, before: DashboardTenantState, state: MutableTenantState, pendingAudits: readonly AuditRecord[]): Promise<void> {
    for (const row of state.domains) await transaction.insert(domains).values({ organizationId: state.organizationId, id: row.id, normalizedHostname: row.normalizedHostname, status: row.status, version: row.version, createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) }).onConflictDoUpdate({ target: [domains.organizationId, domains.id], set: { normalizedHostname: row.normalizedHostname, status: row.status, version: row.version, updatedAt: new Date(row.updatedAt) } });
    for (const row of state.regions) await transaction.insert(regions).values({ organizationId: state.organizationId, id: row.id, externalKey: row.externalKey, name: row.name, slug: row.slug, status: row.status, version: row.version, createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) }).onConflictDoUpdate({ target: [regions.organizationId, regions.id], set: { externalKey: row.externalKey, name: row.name, slug: row.slug, status: row.status, version: row.version, updatedAt: new Date(row.updatedAt) } });
    for (const row of state.sites) await transaction.insert(sites).values({ organizationId: state.organizationId, id: row.id, domainId: row.domainId, regionId: row.regionId, normalizedHostname: row.normalizedHostname, status: row.status, activationState: row.activationState, version: row.version, createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) }).onConflictDoUpdate({ target: [sites.organizationId, sites.id], set: { domainId: row.domainId, regionId: row.regionId, normalizedHostname: row.normalizedHostname, status: row.status, activationState: row.activationState, version: row.version, updatedAt: new Date(row.updatedAt) } });
    for (const row of state.siteSettings) await transaction.insert(siteSettings).values({ organizationId: state.organizationId, siteId: row.siteId, name: row.name, description: row.description, tagline: row.tagline, seoDefaultTitle: row.seoDefaultTitle, seoDefaultDescription: row.seoDefaultDescription, seoOpenGraphSiteName: row.seoOpenGraphSiteName, locale: row.locale, seoRobotsDirective: row.seoRobotsDirective, colors: row.colors, socialLinks: row.socialLinks, seo: row.seo, navigation: row.navigation.map(({ label, path }) => ({ label, path })), logoMediaId: row.logoMediaId, faviconMediaId: row.faviconMediaId, defaultMediaId: row.defaultMediaId, version: row.version, createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) }).onConflictDoUpdate({ target: [siteSettings.organizationId, siteSettings.siteId], set: { name: row.name, description: row.description, tagline: row.tagline, seoDefaultTitle: row.seoDefaultTitle, seoDefaultDescription: row.seoDefaultDescription, seoOpenGraphSiteName: row.seoOpenGraphSiteName, locale: row.locale, seoRobotsDirective: row.seoRobotsDirective, colors: row.colors, socialLinks: row.socialLinks, seo: row.seo, navigation: row.navigation.map(({ label, path }) => ({ label, path })), logoMediaId: row.logoMediaId, faviconMediaId: row.faviconMediaId, defaultMediaId: row.defaultMediaId, version: row.version, updatedAt: new Date(row.updatedAt) } });
    for (const row of state.roles) {
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
    for (const row of state.telegramMappings) {
      const prior = before.telegramMappings.find(({ id }) => id === row.id);
      if (prior === undefined) throw new DashboardAccessDeniedError();
      if (prior.status === row.status) continue;
      const changed = await transaction.update(telegramIdentityMappings).set({ status: row.status, updatedAt: new Date(row.updatedAt) }).where(and(
        eq(telegramIdentityMappings.organizationId, state.organizationId),
        eq(telegramIdentityMappings.id, row.id),
        eq(telegramIdentityMappings.userId, row.userId),
        eq(telegramIdentityMappings.roleId, row.roleId),
        eq(telegramIdentityMappings.status, prior.status),
      )).returning({ id: telegramIdentityMappings.id });
      if (changed.length !== 1) throw new DashboardConflictError();
    }
    for (const row of state.memberships) {
      const prior = before.memberships.find(({ userId }) => userId === row.userId);
      if (prior !== undefined && prior.roleId === row.roleId && prior.status === row.status && prior.regionId === row.regionId) continue;
      if (prior === undefined) {
        await transaction.insert(memberships).values({ organizationId: state.organizationId, userId: row.userId, roleId: row.roleId, status: row.status, regionId: row.regionId, version: row.version, createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) });
      } else {
        const changed = await transaction.update(memberships).set({ roleId: row.roleId, status: row.status, regionId: row.regionId, version: row.version, updatedAt: new Date(row.updatedAt) }).where(and(eq(memberships.organizationId, state.organizationId), eq(memberships.userId, row.userId), eq(memberships.version, prior.version))).returning({ userId: memberships.userId });
        if (changed.length !== 1) throw new DashboardConflictError();
      }
    }
    for (const row of state.publishers) await transaction.insert(publishers).values({ organizationId: state.organizationId, id: row.id, name: row.name, type: row.type, attributionLabel: row.attributionLabel, contacts: row.contacts, evidenceReference: row.evidenceReference, verificationStatus: row.verificationStatus, submittedBy: row.submittedBy, submittedAt: row.submittedAt === null ? null : new Date(row.submittedAt), verifiedBy: row.verifiedBy, verifiedAt: row.verifiedAt === null ? null : new Date(row.verifiedAt), rejectionReason: row.rejectionReason, status: row.status, version: row.version, createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) }).onConflictDoUpdate({ target: [publishers.organizationId, publishers.id], set: { name: row.name, type: row.type, attributionLabel: row.attributionLabel, contacts: row.contacts, evidenceReference: row.evidenceReference, verificationStatus: row.verificationStatus, submittedBy: row.submittedBy, submittedAt: row.submittedAt === null ? null : new Date(row.submittedAt), verifiedBy: row.verifiedBy, verifiedAt: row.verifiedAt === null ? null : new Date(row.verifiedAt), rejectionReason: row.rejectionReason, status: row.status, version: row.version, updatedAt: new Date(row.updatedAt) } });
    for (const row of state.affiliations) await transaction.insert(officialAffiliations).values({ organizationId: state.organizationId, id: row.id, publisherId: row.publisherId, siteId: row.siteId, institutionName: row.institutionName, claimScopes: [...row.claimScopes], evidenceReference: row.evidenceReference, active: row.active, verifiedAt: row.verifiedAt === null ? null : new Date(row.verifiedAt), version: row.version, createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) }).onConflictDoUpdate({ target: [officialAffiliations.organizationId, officialAffiliations.id], set: { institutionName: row.institutionName, claimScopes: [...row.claimScopes], evidenceReference: row.evidenceReference, active: row.active, verifiedAt: row.verifiedAt === null ? null : new Date(row.verifiedAt), version: row.version, updatedAt: new Date(row.updatedAt) } });
    for (const row of state.categories) await transaction.insert(categories).values({ organizationId: state.organizationId, id: row.id, name: row.name, slug: row.slug, status: row.status, version: row.version, createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) }).onConflictDoUpdate({ target: [categories.organizationId, categories.id], set: { name: row.name, slug: row.slug, status: row.status, version: row.version, updatedAt: new Date(row.updatedAt) } });
    for (const row of state.authors) await transaction.insert(authors).values({ organizationId: state.organizationId, id: row.id, displayName: row.displayName, byline: row.byline, status: row.status, version: row.version, createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) }).onConflictDoUpdate({ target: [authors.organizationId, authors.id], set: { displayName: row.displayName, byline: row.byline, status: row.status, version: row.version, updatedAt: new Date(row.updatedAt) } });
    for (const row of state.articles) await transaction.insert(articles).values({ organizationId: state.organizationId, id: row.id, regionId: row.regionId, publisherId: row.publisherId, categoryId: row.categoryId, authorId: row.authorId, slug: row.slug, title: row.title, body: row.body, source: row.source, tags: [...row.tags], status: row.status, publishedAt: row.publishedAt === null ? null : new Date(row.publishedAt), archivedAt: row.archivedAt === null ? null : new Date(row.archivedAt), version: row.version, createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) }).onConflictDoUpdate({ target: [articles.organizationId, articles.id], set: { regionId: row.regionId, publisherId: row.publisherId, categoryId: row.categoryId, authorId: row.authorId, slug: row.slug, title: row.title, body: row.body, source: row.source, tags: [...row.tags], status: row.status, archivedAt: row.archivedAt === null ? null : new Date(row.archivedAt), version: row.version, updatedAt: new Date(row.updatedAt) } });
    for (const row of state.articleSites) await transaction.insert(articleSites).values({ organizationId: state.organizationId, id: row.id, articleId: row.articleId, siteId: row.siteId, state: row.state, stateOccurredAt: new Date(row.stateOccurredAt), publishedUrl: row.publishedUrl, publishedAt: row.publishedAt === null ? null : new Date(row.publishedAt), active: row.active, viewCount: row.viewCount, version: row.version, createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) }).onConflictDoUpdate({ target: [articleSites.organizationId, articleSites.id], set: { state: row.state, stateOccurredAt: new Date(row.stateOccurredAt), publishedUrl: row.publishedUrl, publishedAt: row.publishedAt === null ? null : new Date(row.publishedAt), active: row.active, viewCount: row.viewCount, version: row.version, updatedAt: new Date(row.updatedAt) } });
    await this.enqueueDeliveryInvalidations(transaction, before, state);
    if (pendingAudits.length > 0) await transaction.insert(auditLogs).values(pendingAudits.map((row) => ({ organizationId: row.organizationId, id: row.id, actorType: row.actorType, actorId: row.actorId, entryPoint: row.entryPoint, action: row.action, targetType: row.targetType, targetId: row.targetId, outcome: row.outcome, changedFields: [...row.changedFields], before: row.before, after: row.after, requestId: row.requestId, occurredAt: new Date(row.occurredAt) })));
  }

  private async enqueueDeliveryInvalidations(transaction: Transaction, before: DashboardTenantState, state: MutableTenantState): Promise<void> {
    type Aggregate = { siteId: string; previousHostname: string | null; currentHostname: string | null; reasons: Set<string>; articleSlugs: Set<string>; categorySlugs: Set<string>; mediaIds: Set<string> };
    const affected = new Map<string, Aggregate>();
    const priorSite = (siteId: string) => before.sites.find((site) => site.id === siteId);
    const currentSite = (siteId: string) => state.sites.find((site) => site.id === siteId);
    const add = (siteId: string, reason: string, articleSlugs: readonly string[] = [], categorySlugs: readonly string[] = [], mediaIds: readonly string[] = []) => {
      const prior = priorSite(siteId); const current = currentSite(siteId); if (prior === undefined && current === undefined) return;
      const aggregate = affected.get(siteId) ?? { siteId, previousHostname: prior?.normalizedHostname ?? null, currentHostname: current?.normalizedHostname ?? null, reasons: new Set<string>(), articleSlugs: new Set<string>(), categorySlugs: new Set<string>(), mediaIds: new Set<string>() };
      aggregate.reasons.add(reason); for (const slug of articleSlugs) aggregate.articleSlugs.add(slug); for (const slug of categorySlugs) aggregate.categorySlugs.add(slug); for (const id of mediaIds) aggregate.mediaIds.add(id); affected.set(siteId, aggregate);
    };
    const changed = (left: unknown, right: unknown) => JSON.stringify(left) !== JSON.stringify(right);
    const articleDetails = (articleId: string) => {
      const prior = before.articles.find((article) => article.id === articleId); const current = state.articles.find((article) => article.id === articleId);
      const categoryIds = [prior?.categoryId, current?.categoryId].filter((id): id is string => id !== null && id !== undefined);
      const categorySlugs = categoryIds.flatMap((id) => [before.categories.find((category) => category.id === id)?.slug, state.categories.find((category) => category.id === id)?.slug]).filter((slug): slug is string => slug !== undefined);
      return { slugs: [prior?.slug, current?.slug].filter((slug): slug is string => slug !== undefined), categorySlugs };
    };
    for (const site of state.sites) { const prior = priorSite(site.id); if (prior !== undefined && changed({ host: prior.normalizedHostname, region: prior.regionId, status: prior.status, activation: prior.activationState }, { host: site.normalizedHostname, region: site.regionId, status: site.status, activation: site.activationState })) add(site.id, 'site.mapping'); }
    for (const region of state.regions) { const prior = before.regions.find((item) => item.id === region.id); if (prior !== undefined && changed(prior, region)) for (const site of state.sites.filter((item) => item.regionId === region.id)) add(site.id, 'region.changed'); }
    for (const settings of state.siteSettings) { const prior = before.siteSettings.find((item) => item.siteId === settings.siteId); if (prior !== undefined && changed(prior, settings)) { const mediaIds = [prior.logoMediaId, prior.faviconMediaId, prior.defaultMediaId, settings.logoMediaId, settings.faviconMediaId, settings.defaultMediaId].filter((id): id is string => id !== null); add(settings.siteId, 'site_settings.changed', [], mediaIds); } }
    for (const article of state.articles) {
      const prior = before.articles.find((item) => item.id === article.id); if (prior === undefined || !changed(prior, article)) continue;
      const details = articleDetails(article.id);
      const relations = [...before.articleSites, ...state.articleSites].filter((relation) => relation.articleId === article.id);
      for (const relation of relations) add(relation.siteId, 'article.changed', details.slugs, details.categorySlugs);
    }
    for (const relation of state.articleSites) { const prior = before.articleSites.find((item) => item.id === relation.id); if (prior === undefined || changed(prior, relation)) { const details = articleDetails(relation.articleId); add(relation.siteId, 'article_site.changed', details.slugs, details.categorySlugs); if (prior !== undefined && prior.siteId !== relation.siteId) add(prior.siteId, 'article_site.changed', details.slugs, details.categorySlugs); } }
    for (const publisher of state.publishers) { const prior = before.publishers.find((item) => item.id === publisher.id); if (prior === undefined || !changed(prior, publisher)) continue; for (const article of state.articles.filter((item) => item.publisherId === publisher.id)) { const details = articleDetails(article.id); for (const relation of state.articleSites.filter((item) => item.articleId === article.id)) add(relation.siteId, 'publisher.changed', details.slugs, details.categorySlugs); } }
    for (const affiliation of state.affiliations) { const prior = before.affiliations.find((item) => item.id === affiliation.id); if (prior !== undefined && !changed(prior, affiliation)) continue; const publisherIds = [prior?.publisherId, affiliation.publisherId].filter((id): id is string => id !== undefined); const siteIds = [prior?.siteId, affiliation.siteId].filter((id): id is string => id !== undefined); for (const article of state.articles.filter((item) => item.publisherId !== null && publisherIds.includes(item.publisherId))) { const details = articleDetails(article.id); for (const siteId of siteIds) if (state.articleSites.some((item) => item.articleId === article.id && item.siteId === siteId)) add(siteId, 'affiliation.changed', details.slugs, details.categorySlugs); } }
    for (const category of state.categories) { const prior = before.categories.find((item) => item.id === category.id); if (prior === undefined || !changed(prior, category)) continue; for (const article of state.articles.filter((item) => item.categoryId === category.id)) { const details = articleDetails(article.id); for (const relation of state.articleSites.filter((item) => item.articleId === article.id)) add(relation.siteId, 'category.changed', details.slugs, [...details.categorySlugs, category.slug]); } }
    for (const author of state.authors) { const prior = before.authors.find((item) => item.id === author.id); if (prior === undefined || !changed(prior, author)) continue; for (const article of state.articles.filter((item) => item.authorId === author.id)) { const details = articleDetails(article.id); for (const relation of state.articleSites.filter((item) => item.articleId === article.id)) add(relation.siteId, 'author.changed', details.slugs, details.categorySlugs); } }
    for (const aggregate of affected.values()) await transaction.insert(invalidationTasks).values(completeInvalidationValues({ organizationId: state.organizationId, siteId: aggregate.siteId, previousHostname: aggregate.previousHostname, currentHostname: aggregate.currentHostname, reason: [...aggregate.reasons].sort().join(','), articleSlugs: [...aggregate.articleSlugs], categorySlugs: [...aggregate.categorySlugs], mediaIds: [...aggregate.mediaIds] }));
  }
}
