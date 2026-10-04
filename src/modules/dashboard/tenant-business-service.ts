import type { z } from 'zod';

import type { AuthorizedTenantActorContext } from '@/core/operation-context';
import { orgTag } from '@/modules/dashboard/cache-tags';
import type {
  ActivationAttemptRecord, AnalyticsProjection, ArticleFilter, ArticleRecord, ArticleSiteRecord, AuditFilter, AuditRecord, AuthorRecord, CategoryRecord,
  DashboardProjection, DomainRecord, EditorialSummaries, EditorialSummaryArticle, InvitationSummary, MembershipRecord, OfficialAffiliationRecord, OperationsProjection, PublisherRecord, NetworkPublisherClaim,
  RegionRecord, RetentionRunRecord, RoleRecord, SiteLevel, SiteRecord, SiteSettingsRecord, ConfigurationScope, DashboardTenantState,
} from '@/modules/dashboard/models';
import { DEFAULT_CATEGORY_SLUG } from '@/modules/dashboard/models';
import { DASHBOARD_PERMISSIONS } from '@/modules/dashboard/permissions';
import { mapArticleForOrg, resolveOwnerOrgSlug } from '@/modules/dashboard/for-org-create';
import { INTEGRATIONS_PERMISSIONS } from '@/modules/integrations/permissions';
import {
  buildNetworkPublisherClaim,
} from '@/modules/dashboard/policies';
import type { IdentifierGenerator } from '@/core/system/ports';
import { allocateUniqueSlug } from '@/modules/site/slug-allocator';
import { unresolvedCascadeAncestors } from '@/modules/site/site-cascade';
import { regionScopeCovers, type ScopeGeography } from '@/modules/site/region-scope';
import {
  DashboardAccessDeniedError, DashboardConflictError, DashboardRateLimitedError, DashboardSubscriptionInactiveError, type DashboardCollectionName, type MutableTenantState, type DashboardRepository, type DashboardTransaction,
} from '@/modules/dashboard/ports';
import { createNonDisclosingDenial, createPublicError, type PublicErrorEnvelope } from '@/core/errors';
import { logEvent } from '@/core/observability/logger';
import type { Result } from '@/core/result';
import {
  DashboardValidationError, driverErrorContext, errorIdentity, fieldErrors, safeErrorMessage,
} from '@/modules/dashboard/tenant-service-errors';
import {
  assignmentDigest, changedFields, defined, publicRecord, replaceById, requirePublisherNameAvailable,
  requireRecord, requireValidBodyJson, requireVersion, roleJson,
} from '@/modules/dashboard/tenant-service-records';
import {
  articleInScope, regionLock, requireArticleInScope, requireLockedRegionValue, requireSiteInScope, requireUnrestrictedRegion, siteInScope,
} from '@/modules/dashboard/tenant-service-scope';
import {
  affiliationSchema, affiliationUpdateSchema, analyticsFilterSchema, articleCreateSchema, articleDeleteSchema, articleFilterSchema, articleTransitionSchema, articleUpdateSchema, assignmentSchema,
  auditFilterSchema, authorCreateSchema, authorUpdateSchema, categoryCreateSchema, categoryDeleteSchema, categoryUpdateSchema,
  domainCreateSchema, domainUpdateSchema, invitationCreateSchema, invitationRevokeSchema, isKnownTemplateId, membershipSchema, publisherCreateSchema, publisherDecisionSchema,
  publisherUpdateSchema, regionCreateSchema, regionUpdateSchema, roleCreateSchema, roleUpdateSchema,
  siteCreateSchema, siteSettingsSchema, siteUpdateSchema, siteViewsSchema, siteViewsBulkSchema, siteCachePurgeSchema, tagRemoveSchema, tagRenameSchema, bridgeRequestSchema, bridgeUnpublishSchema,
} from '@/modules/dashboard/schemas';
import type { ArticleCreateInput } from '@/modules/dashboard/schemas';

interface ClockLike { now(): Date }
interface VersionInput { readonly id: string; readonly expectedVersion: number }

/**
 * Group notification port invoked by the article service when a draft is created.
 *
 * @remarks The implementation never throws: queue failures are only
 * telemetry so article writes never fail because of notifications.
 */
export interface ArticleCreatedNotifier {
  notifyArticleCreated(input: { readonly organizationId: string; readonly articleId: string; readonly title: string }): Promise<void>;
}

/**
 * Bust Next cache tags after a committed dashboard mutation.
 *
 * @param tags - Cache tags to revalidate once the mutation commits.
 * @returns Nothing; implementations never throw so a purge failure cannot fail the mutation it follows.
 */
export interface DashboardCacheInvalidator {
  revalidateTags(tags: readonly string[]): Promise<void>;
}

const SITE_LEVEL_RANK: Readonly<Record<SiteLevel, number>> = Object.freeze({ apex: 0, region: 1, city: 2 });

const CONFIGURATION_SITE_LIMIT = 200;

const PUBLISHER_AFFILIATION_LIMIT = 500;

export class TenantBusinessService {
  constructor(
    private readonly repository: DashboardRepository,
    private readonly identifiers: IdentifierGenerator,
    private readonly clock: ClockLike = { now: () => new Date() },
    private readonly notifier: ArticleCreatedNotifier | null = null,
    private readonly cacheInvalidator: DashboardCacheInvalidator | null = null,
  ) {}

  private invalid(actor: AuthorizedTenantActorContext, error: z.ZodError): Result<never, PublicErrorEnvelope> {
    return { ok: false, error: createPublicError('INVALID_INPUT', 'Please correct the highlighted fields.', actor.requestId, fieldErrors(error)) };
  }

  private async denied(actor: AuthorizedTenantActorContext, action: string, targetType: string): Promise<Result<never, PublicErrorEnvelope>> {
    try {
      await this.repository.recordDenied(actor, action, targetType);
      return { ok: false, error: createNonDisclosingDenial(actor.requestId) };
    } catch {
      return { ok: false, error: createPublicError('DEPENDENCY_UNAVAILABLE', 'The operation could not be completed.', actor.requestId) };
    }
  }

  /**
   * Catat penyebab sebenarnya, lalu kembalikan error non-disclosing.
   *
   * @param actor - Aktor yang meminta operasi.
   * @param error - Error yang ditangkap dari lapisan repositori.
   * @param event - Nama event log; `dashboard.query.failed` untuk bacaan dan
   * `dashboard.mutation.failed` untuk penulisan.
   * @param action - Operasi yang gagal, mis. `audit.list`.
   * @param targetType - Jenis target yang gagal, mis. `audit_log`.
   * @param permission - Izin yang dibutuhkan; tidak wajib pada operasi yang
   * tidak membacanya.
   * @returns Envelope `INTERNAL_ERROR` yang tidak membocorkan detail.
   * @remarks Setiap catch yang mengembalikan `INTERNAL_ERROR` wajib lewat
   * sini. Envelope itu sengaja seragam untuk menghindari kebocoran, jadi tanpa
   * log titik ini kegagalan menjadi tidak bisa ditindaklanjuti.
   */
  private internal(actor: AuthorizedTenantActorContext, error: unknown, event: 'dashboard.query.failed' | 'dashboard.mutation.failed', action: string, targetType: string, permission?: string): Result<never, PublicErrorEnvelope> {
    const message = safeErrorMessage(error);
    logEvent('error', {
      event,
      requestId: actor.requestId,
      context: {
        action,
        targetType,
        ...(permission === undefined ? {} : { permission }),
        name: errorIdentity(error),
        ...(error instanceof Error ? driverErrorContext(error) : {}),
        ...(message === undefined ? {} : { message }),
      },
    });
    return { ok: false, error: createPublicError('INTERNAL_ERROR', 'The operation could not be completed.', actor.requestId) };
  }

  private async mutate<Input, Output>(input: {
    actor: AuthorizedTenantActorContext; permission: string; action: string; targetType: string; schema: z.ZodType<Input>; raw: unknown;
    execute: (transaction: DashboardTransaction, value: Input, now: string) => Output | Promise<Output>;
    revalidateTags?: readonly string[];
    scope?: readonly DashboardCollectionName[];
  }): Promise<Result<Output, PublicErrorEnvelope>> {
    const parsed = input.schema.safeParse(input.raw);
    if (!parsed.success) return this.invalid(input.actor, parsed.error);
    try {
      const value = await this.repository.execute(input.actor, input.permission, (transaction) => input.execute(transaction, parsed.data, this.clock.now().toISOString()), input.scope);
      await this.revalidateCommitted(input);
      return { ok: true, value };
    } catch (error) {
      if (error instanceof DashboardValidationError) return { ok: false, error: createPublicError('INVALID_INPUT', 'Please correct the highlighted fields.', input.actor.requestId, error.fields) };
      if (error instanceof DashboardAccessDeniedError) return this.denied(input.actor, input.action, input.targetType);
      if (error instanceof DashboardSubscriptionInactiveError) return { ok: false, error: createPublicError('FORBIDDEN', 'Langganan tidak aktif. Hubungi administrator agar dapat melanjutkan perubahan.', input.actor.requestId) };
      if (error instanceof DashboardConflictError) return { ok: false, error: createPublicError('CONFLICT', error.message, input.actor.requestId) };
      return this.internal(input.actor, error, 'dashboard.mutation.failed', input.action, input.targetType, input.permission);
    }
  }

  /**
   * Revalidate cache tags after a mutation commits.
   *
   * @param input - Mutation actor, action, and tags to bust.
   * @returns Nothing; a purge failure is telemetry, never a mutation failure.
   */
  private async revalidateCommitted(input: { actor: AuthorizedTenantActorContext; action: string; revalidateTags?: readonly string[] }): Promise<void> {
    const tags = input.revalidateTags;
    if (this.cacheInvalidator === null || tags === undefined || tags.length === 0) return;
    try {
      await this.cacheInvalidator.revalidateTags(tags);
    } catch (error) {
      logEvent('warn', {
        event: 'dashboard.cache.invalidate_failed',
        requestId: input.actor.requestId,
        context: { action: input.action, name: errorIdentity(error) },
      });
    }
  }

  private base(actor: AuthorizedTenantActorContext, now: string) {
    return { id: this.identifiers.create(), organizationId: actor.organizationId, version: 1, createdAt: now, updatedAt: now } as const;
  }

  private audit(transaction: DashboardTransaction, action: string, targetType: string, targetId: string, before: object | null, after: object | null): void {
    const beforeValue = before === null ? null : publicRecord(before);
    const afterValue = after === null ? null : publicRecord(after);
    transaction.appendAudit({
      action, targetType, targetId, outcome: 'succeeded',
      changedFields: beforeValue === null ? Object.keys(afterValue ?? {}).sort() : afterValue === null ? Object.keys(beforeValue).sort() : changedFields(beforeValue, afterValue),
      before: beforeValue, after: afterValue,
    });
  }

  async listConfiguration(actor: AuthorizedTenantActorContext, filter: { readonly search?: string | undefined } = {}) {
    try {
      const candidates = [
        DASHBOARD_PERMISSIONS.domainRead, DASHBOARD_PERMISSIONS.domainManage,
        DASHBOARD_PERMISSIONS.regionRead, DASHBOARD_PERMISSIONS.regionManage,
        DASHBOARD_PERMISSIONS.siteRead, DASHBOARD_PERMISSIONS.siteManage,
        DASHBOARD_PERMISSIONS.roleManage,
        DASHBOARD_PERMISSIONS.membershipRead, DASHBOARD_PERMISSIONS.membershipManage,
      ].filter((permission) => actor.permissionSet.has(permission));
      let state: ConfigurationScope | null = null;
      for (const permission of candidates) {
        try {
          state = await this.repository.readConfigurationScope(actor, permission);
          break;
        } catch (error) {
          if (!(error instanceof DashboardAccessDeniedError)) throw error;
        }
      }
      if (state === null) return this.denied(actor, 'configuration.list', 'configuration');
      const domainState = actor.permissionSet.has(DASHBOARD_PERMISSIONS.domainRead) || actor.permissionSet.has(DASHBOARD_PERMISSIONS.domainManage) ? state : null;
      const regionState = actor.permissionSet.has(DASHBOARD_PERMISSIONS.regionRead) || actor.permissionSet.has(DASHBOARD_PERMISSIONS.regionManage) ? state : null;
      const siteState = actor.permissionSet.has(DASHBOARD_PERMISSIONS.siteRead) || actor.permissionSet.has(DASHBOARD_PERMISSIONS.siteManage) ? state : null;
      const roleManage = actor.permissionSet.has(DASHBOARD_PERMISSIONS.roleManage) ? state : null;
      const membershipState = actor.permissionSet.has(DASHBOARD_PERMISSIONS.membershipRead) || actor.permissionSet.has(DASHBOARD_PERMISSIONS.membershipManage) ? state : null;
      const anyState = domainState ?? regionState ?? siteState ?? roleManage ?? membershipState;
      if (anyState === null) return this.denied(actor, 'configuration.list', 'configuration');
      let activationAttempts: readonly ActivationAttemptRecord[] = [];
      let invitations: readonly InvitationSummary[] = [];
      const attemptsPermission = actor.permissionSet.has(DASHBOARD_PERMISSIONS.siteRead)
        ? DASHBOARD_PERMISSIONS.siteRead
        : actor.permissionSet.has(DASHBOARD_PERMISSIONS.siteManage) ? DASHBOARD_PERMISSIONS.siteManage : null;
      if (siteState !== null && attemptsPermission !== null) {
        try { activationAttempts = await this.repository.activationAttempts(actor, attemptsPermission); }
        catch (error) { if (!(error instanceof DashboardAccessDeniedError)) throw error; }
      }
      if (membershipState !== null) {
        try { invitations = await this.repository.listInvitations(actor, DASHBOARD_PERMISSIONS.membershipManage); }
        catch (error) { if (!(error instanceof DashboardAccessDeniedError)) throw error; }
      }
      const lock = regionLock(actor);
      const scopeRegion = lock === null ? null : (regionState?.regions ?? []).find(({ id }) => id === lock);
      const geography = regionState?.regions ?? siteState?.regions ?? [];
      const inScope = (site: { readonly regionId: string | null }) => siteInScope(site, lock, geography);
      const scopedSites = (siteState?.sites ?? []).filter(inScope);
      const settingsNames = new Map((siteState?.siteSettings ?? []).map((row) => [row.siteId, row.name] as const));
      const needle = (filter.search ?? '').trim().toLowerCase();
      const matchedSites = needle === ''
        ? scopedSites
        : scopedSites.filter((site) => `${site.normalizedHostname} ${settingsNames.get(site.id) ?? ''}`.toLowerCase().includes(needle));
      const listedSites = [...matchedSites]
        .sort((left, right) => SITE_LEVEL_RANK[left.siteLevel] - SITE_LEVEL_RANK[right.siteLevel] || left.normalizedHostname.localeCompare(right.normalizedHostname))
        .slice(0, CONFIGURATION_SITE_LIMIT);
      const listedIds = new Set(listedSites.map((site) => site.id));
      return { ok: true as const, value: {
        organizationName: anyState.organizationName,
        domains: domainState?.domains ?? [],
        regions: (regionState?.regions ?? []).filter((region) => regionScopeCovers(lock, region.id, geography)),
        sites: listedSites,
        siteSettings: (siteState?.siteSettings ?? []).filter((settings) => listedIds.has(settings.siteId)),
        siteTotal: matchedSites.length,
        siteTotalInScope: scopedSites.length,
        siteLimit: CONFIGURATION_SITE_LIMIT,
        siteSearch: needle === '' ? null : needle,
        roles: (roleManage?.roles ?? []).map(roleJson), memberships: membershipState?.memberships ?? [],
        activationAttempts, invitations,
        regionScope: scopeRegion === undefined || scopeRegion === null ? null : { id: scopeRegion.id, name: scopeRegion.name },
      } };
    } catch (error) {
      return this.internal(actor, error, 'dashboard.query.failed', 'configuration.list', 'configuration');
    }
  }

  /**
   * Rewrite hostnames derived from a domain hostname or geography slug rename.
   *
   * Mirrors the rename-cascade triggers in the database so the persisted rows
   * and the projection that produced them stay identical.
   *
   * @param state - Mutable tenant state.
   * @param sites - Sites whose hostname is derived from the renamed record.
   * @param hostnameFor - Resolves the new hostname, or null to leave a site untouched.
   * @param now - Audit timestamp for the rewrite.
   * @throws {DashboardConflictError} When a rewritten hostname is already taken.
   */
  private rederiveSiteHostnames(state: MutableTenantState, sites: readonly SiteRecord[], hostnameFor: (site: SiteRecord) => string | null, now: string): void {
    for (const site of sites) {
      const normalizedHostname = hostnameFor(site);
      if (normalizedHostname === null || normalizedHostname === site.normalizedHostname) continue;
      if (state.sites.some((item) => item.id !== site.id && item.normalizedHostname === normalizedHostname)) throw new DashboardConflictError();
      replaceById(state.sites, { ...site, normalizedHostname, version: site.version + 1, updatedAt: now });
    }
  }

  createDomain(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: domainCreateSchema, permission: DASHBOARD_PERMISSIONS.domainManage, action: 'domain.create', targetType: 'domain', scope: ['domains'], execute: (transaction, value, now) => {
      requireUnrestrictedRegion(actor);
      if (transaction.state.domains.some(({ normalizedHostname }) => normalizedHostname === value.normalizedHostname)) throw new DashboardConflictError();
      const record: DomainRecord = { ...this.base(actor, now), ...value, cloudflareZoneId: null, routingVersion: 1 };
      transaction.state.domains.push(record); this.audit(transaction, 'domain.create', 'domain', record.id, null, record); return record;
    }});
  }

  updateDomain(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: domainUpdateSchema, permission: DASHBOARD_PERMISSIONS.domainManage, action: 'domain.update', targetType: 'domain', scope: ['domains', 'sites', 'regions'], execute: (transaction, value, now) => {
      requireUnrestrictedRegion(actor);
      const before = requireRecord(transaction.state.domains, value.id); requireVersion(before, value.expectedVersion);
      if (transaction.state.domains.some((item) => item.id !== before.id && item.normalizedHostname === value.normalizedHostname)) throw new DashboardConflictError();
      const after: DomainRecord = { ...before, normalizedHostname: value.normalizedHostname, status: value.status, siteTopology: value.siteTopology, version: before.version + 1, updatedAt: now };
      if (value.siteTopology === 'national' && transaction.state.sites.some((site) => site.domainId === before.id && site.siteLevel !== 'apex')) throw new DashboardConflictError();
      if (value.siteTopology === 'regional' && !transaction.state.sites.some((site) => site.domainId === before.id && site.siteLevel === 'region')) {
        throw new DashboardValidationError({ siteTopology: ['Domain regional harus punya portal region dan city; buat keduanya lebih dulu.'] });
      }
      replaceById(transaction.state.domains, after);
      this.rederiveSiteHostnames(transaction.state, transaction.state.sites.filter((site) => site.domainId === before.id), (site) => {
        const geography = transaction.state.regions.find((item) => item.id === site.regionId);
        return geography === undefined ? null : `${geography.slug}.${value.normalizedHostname}`;
      }, now);
      this.audit(transaction, 'domain.update', 'domain', after.id, before, after); return after;
    }});
  }

  createRegion(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: regionCreateSchema, permission: DASHBOARD_PERMISSIONS.regionManage, action: 'region.create', targetType: 'region', scope: ['regions'], execute: (transaction, value, now) => {
      requireUnrestrictedRegion(actor);
      if (transaction.state.regions.some(({ slug, externalKey }) => slug === value.slug || externalKey === value.externalKey)) throw new DashboardConflictError();
      const parent = value.parentRegionId === null ? null : requireRecord(transaction.state.regions, value.parentRegionId);
      if ((value.kind === 'city') === (parent === null)) throw new DashboardValidationError({ parentRegionId: ['Kota wajib berinduk ke satu region; region tidak berinduk.'] });
      if (parent !== null && (parent.kind !== 'region' || parent.status === 'archived')) throw new DashboardValidationError({ parentRegionId: ['Induk kota harus region aktif.'] });
      const record: RegionRecord = { ...this.base(actor, now), ...value };
      transaction.state.regions.push(record); this.audit(transaction, 'region.create', 'region', record.id, null, record); return record;
    }});
  }

  updateRegion(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: regionUpdateSchema, permission: DASHBOARD_PERMISSIONS.regionManage, action: 'region.update', targetType: 'region', scope: ['regions', 'sites', 'domains'], execute: (transaction, value, now) => {
      requireUnrestrictedRegion(actor);
      const before = requireRecord(transaction.state.regions, value.id); requireVersion(before, value.expectedVersion);
      const kind = value.kind ?? before.kind ?? 'region';
      const parentRegionId = (value.parentRegionId ?? before.parentRegionId) ?? null;
      const parent = parentRegionId === null ? null : requireRecord(transaction.state.regions, parentRegionId);
      if ((kind === 'city') === (parent === null)) throw new DashboardValidationError({ parentRegionId: ['Kota wajib berinduk ke satu region; region tidak berinduk.'] });
      if (parent !== null && (parent.id === before.id || parent.kind !== 'region' || parent.status === 'archived')) throw new DashboardValidationError({ parentRegionId: ['Induk kota harus region aktif yang berbeda.'] });
      if (before.kind === 'region' && kind === 'city' && transaction.state.regions.some((region) => region.parentRegionId === before.id)) throw new DashboardConflictError();
      if ((kind !== before.kind || parentRegionId !== before.parentRegionId) && transaction.state.sites.some((site) => site.regionId === before.id)) {
        throw new DashboardConflictError();
      }
      const after: RegionRecord = { ...before, externalKey: value.externalKey, name: value.name, shortName: value.shortName ?? before.shortName, slug: value.slug, status: value.status, kind, parentRegionId, version: before.version + 1, updatedAt: now };
      replaceById(transaction.state.regions, after);
      this.rederiveSiteHostnames(transaction.state, transaction.state.sites.filter((site) => site.regionId === before.id), (site) => {
        const domain = transaction.state.domains.find((item) => item.id === site.domainId);
        return domain === undefined ? null : `${value.slug}.${domain.normalizedHostname}`;
      }, now);
      this.audit(transaction, 'region.update', 'region', after.id, before, after); return after;
    }});
  }

  /**
   * Derive the level, parent portal, and hostname a site must carry.
   *
   * The apex -> region -> city chain is computed from the geography tree, never
   * supplied by the caller, so a site can never claim a level its geography
   * does not support or hang off a parent that does not exist.
   *
   * @param state - Tenant state holding domains, geographies, and sites.
   * @param domainId - Owning domain (transport root).
   * @param regionId - Geography served, or null for the apex site.
   * @param selfId - Site being updated; excluded from collision and parent lookups.
   * @returns Derived level, parent site id, and normalized hostname.
   * @throws {DashboardConflictError} When the domain already has an apex site or the hostname is taken.
   * @throws {DashboardValidationError} When the apex site is missing or a city has no region site yet.
   */
  private resolveSitePlacement(
    state: DashboardTenantState,
    domainId: string,
    regionId: string | null,
    selfId?: string,
  ): { siteLevel: SiteLevel; parentSiteId: string | null; normalizedHostname: string } {
    const domain = requireRecord(state.domains, domainId);
    const others = state.sites.filter((site) => site.id !== selfId);
    const apex = others.find((site) => site.domainId === domainId && site.siteLevel === 'apex');
    if (regionId === null) {
      if (apex !== undefined) throw new DashboardConflictError();
      return { siteLevel: 'apex', parentSiteId: null, normalizedHostname: domain.normalizedHostname };
    }
    if (apex === undefined) throw new DashboardValidationError({ regionId: ['Domain harus punya situs apex sebelum menambah portal region atau city.'] });
    const geography = requireRecord(state.regions, regionId);
    const normalizedHostname = `${geography.slug}.${domain.normalizedHostname}`;
    if (others.some((site) => site.normalizedHostname === normalizedHostname)) throw new DashboardConflictError();
    if (geography.kind === 'region') return { siteLevel: 'region', parentSiteId: apex.id, normalizedHostname };
    const parentGeography = geography.parentRegionId === null ? null : requireRecord(state.regions, geography.parentRegionId);
    const regionSite = parentGeography === null
      ? undefined
      : others.find((site) => site.domainId === domainId && site.regionId === parentGeography.id && site.siteLevel === 'region');
    if (regionSite === undefined) {
      throw new DashboardValidationError({ regionId: [`Kota ${geography.name} butuh portal region ${parentGeography?.name ?? 'induk'} di domain yang sama.`] });
    }
    return { siteLevel: 'city', parentSiteId: regionSite.id, normalizedHostname };
  }

  createSite(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: siteCreateSchema, permission: DASHBOARD_PERMISSIONS.siteManage, action: 'site.create', targetType: 'site', scope: ['domains', 'regions', 'sites'], execute: (transaction, value, now) => {
      requireUnrestrictedRegion(actor);
      const domain = requireRecord(transaction.state.domains, value.domainId);
      if (domain.status === 'archived' || (value.regionId !== null && requireRecord(transaction.state.regions, value.regionId).status === 'archived')) throw new DashboardAccessDeniedError();
      if (value.regionId !== null && domain.siteTopology !== 'regional') {
        throw new DashboardValidationError({ regionId: ['Domain ini jaringan nasional; ubah topologi domain ke regional sebelum menambah portal region atau city.'] });
      }
      const placement = this.resolveSitePlacement(transaction.state, value.domainId, value.regionId);
      const record: SiteRecord = { ...this.base(actor, now), domainId: value.domainId, regionId: value.regionId, ...placement, status: value.status, activationState: 'inactive' };
      transaction.state.sites.push(record); this.audit(transaction, 'site.create', 'site', record.id, null, record); return record;
    }});
  }

  updateSite(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: siteUpdateSchema, permission: DASHBOARD_PERMISSIONS.siteManage, action: 'site.update', targetType: 'site', scope: ['domains', 'regions', 'sites'], execute: (transaction, value, now) => {
      requireUnrestrictedRegion(actor);
      requireRecord(transaction.state.domains, value.domainId); if (value.regionId !== null) requireRecord(transaction.state.regions, value.regionId);
      const before = requireRecord(transaction.state.sites, value.id); requireVersion(before, value.expectedVersion);
      const placement = this.resolveSitePlacement(transaction.state, value.domainId, value.regionId, before.id);
      if (placement.parentSiteId !== before.parentSiteId && transaction.state.sites.some((site) => site.parentSiteId === before.id)) throw new DashboardConflictError();
      const after: SiteRecord = { ...before, domainId: value.domainId, regionId: value.regionId, ...placement, status: value.status, activationState: value.status === 'active' ? 'pending' : 'inactive', version: before.version + 1, updatedAt: now };
      replaceById(transaction.state.sites, after); this.audit(transaction, 'site.update', 'site', after.id, before, after); return after;
    }});
  }

  private requireActiveMedia(transaction: DashboardTransaction, next: string | null | undefined, current: string | null, field: string, expectedPurpose?: string): string | null {
    if (next === undefined) return current;
    if (next === null) return null;
    const media = transaction.state.media.find(({ id }) => id === next);
    if (media === undefined || media.state !== 'active' || !media.mediaType.startsWith('image/')) throw new DashboardValidationError({ [field]: ['Media tidak ditemukan atau belum aktif.'] });
    if (expectedPurpose !== undefined && media.purpose !== expectedPurpose) throw new DashboardValidationError({ [field]: ['Media tidak ditemukan atau belum aktif.'] });
    return next;
  }

  /**
   * Carry an apex brand image change to every portal that inherits it.
   *
   * Region and city portals keep `logo_media_id` and `favicon_media_id` null and
   * resolve them to the apex at delivery, but the database requires a concrete
   * `default_media_id` for an active portal. Without this the pointer would
   * drift: changing the apex default would leave the province and its 31 cities
   * on the previous image, and the shared-media guard would then block archiving
   * the old asset. Repointing only the portals that actually pointed at the
   * previous image keeps hand-authored per-portal media untouched.
   *
   * @param transaction - Open dashboard transaction.
   * @param apexSiteId - Site whose settings were just written.
   * @param previousMediaId - Default media before the write, if any.
   * @param nextMediaId - Default media after the write, if any.
   * @param now - Timestamp for the rewritten rows.
   */
  private propagateBrandMedia(transaction: DashboardTransaction, apexSiteId: string, previousMediaId: string | null, nextMediaId: string | null, now: string): void {
    if (nextMediaId === null || previousMediaId === nextMediaId) return;
    const apex = transaction.state.sites.find((site) => site.id === apexSiteId);
    if (apex === undefined || apex.siteLevel !== 'apex') return;
    for (const site of transaction.state.sites) {
      if (site.domainId !== apex.domainId || site.siteLevel === 'apex') continue;
      const settings = transaction.state.siteSettings.find((row) => row.siteId === site.id);
      if (settings === undefined || settings.defaultMediaId !== previousMediaId) continue;
      replaceById(transaction.state.siteSettings, { ...settings, defaultMediaId: nextMediaId, version: settings.version + 1, updatedAt: now });
    }
  }

  saveSiteSettings(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: siteSettingsSchema, permission: DASHBOARD_PERMISSIONS.siteManage, action: 'site.settings.update', targetType: 'site_settings', revalidateTags: [orgTag(actor.organizationId)], scope: ['sites', 'regions', 'siteSettings', 'media'], execute: (transaction, value, now) => {
      requireSiteInScope(transaction.state, value.siteId, actor);
      const before = transaction.state.siteSettings.find(({ siteId }) => siteId === value.siteId);
      if (before === undefined && !isKnownTemplateId(value.colors?.templateId)) throw new DashboardValidationError({ colors: ['templateId wajib diisi dari daftar template terdaftar.'] });
      if (before !== undefined && value.expectedVersion !== undefined) requireVersion(before, value.expectedVersion);
      const logoMediaId = this.requireActiveMedia(transaction, value.logoMediaId, before?.logoMediaId ?? null, 'logoMediaId', 'site-logo');
      const faviconMediaId = this.requireActiveMedia(transaction, value.faviconMediaId, before?.faviconMediaId ?? null, 'faviconMediaId', 'site-favicon');
      const defaultMediaId = this.requireActiveMedia(transaction, value.defaultMediaId, before?.defaultMediaId ?? null, 'defaultMediaId', 'site-default');
      const tagline = value.tagline === undefined ? (before?.tagline ?? null) : value.tagline;
      const seoDefaultTitle = value.seoDefaultTitle === undefined ? (before?.seoDefaultTitle ?? null) : value.seoDefaultTitle;
      const seoDefaultDescription = value.seoDefaultDescription === undefined ? (before?.seoDefaultDescription ?? null) : value.seoDefaultDescription;
      const seoOpenGraphSiteName = value.seoOpenGraphSiteName === undefined ? (before?.seoOpenGraphSiteName ?? null) : value.seoOpenGraphSiteName;
      const locale = value.locale === undefined ? (before?.locale ?? null) : value.locale;
      const seoRobotsDirective = value.seoRobotsDirective === undefined ? (before?.seoRobotsDirective ?? null) : value.seoRobotsDirective;
      const commentsEnabled = value.commentsEnabled ?? before?.commentsEnabled ?? false;
      const uniqueCandidates = [
        ['name', 'Nama kanal', value.name],
        ['description', 'Deskripsi', value.description],
        ['seoDefaultTitle', 'Judul SEO', seoDefaultTitle],
        ['seoDefaultDescription', 'Deskripsi SEO', seoDefaultDescription],
        ['seoOpenGraphSiteName', 'Nama situs OG', seoOpenGraphSiteName],
      ] as const;
      const clashes: Record<string, readonly string[]> = {};
      for (const [field, label, candidate] of uniqueCandidates) {
        const folded = candidate?.trim().toLowerCase() ?? '';
        if (folded === '') continue;
        const clash = transaction.state.siteSettings.find((row) => row.siteId !== value.siteId && (row[field]?.trim().toLowerCase() ?? '') === folded);
        if (clash !== undefined) clashes[field] = [`${label} sudah dipakai kanal lain. Tulis yang unik per hostname.`];
      }
      if (Object.keys(clashes).length > 0) throw new DashboardValidationError(clashes);
      const after: SiteSettingsRecord = before === undefined
        ? { ...this.base(actor, now), siteId: value.siteId, id: value.siteId, name: value.name, description: value.description, tagline, seoDefaultTitle, seoDefaultDescription, seoOpenGraphSiteName, locale, seoRobotsDirective, colors: value.colors ?? {}, socialLinks: value.socialLinks ?? {}, seo: value.seo ?? {}, navigation: value.navigation ?? [], logoMediaId, faviconMediaId, defaultMediaId, commentsEnabled, version: 1 }
        : { ...before, name: value.name, description: value.description, tagline, seoDefaultTitle, seoDefaultDescription, seoOpenGraphSiteName, locale, seoRobotsDirective, colors: value.colors ?? before.colors, socialLinks: value.socialLinks ?? before.socialLinks, seo: value.seo ?? before.seo, navigation: value.navigation ?? before.navigation, logoMediaId, faviconMediaId, defaultMediaId, commentsEnabled, version: before.version + 1, updatedAt: now };
      if (before === undefined) transaction.state.siteSettings.push(after); else replaceById(transaction.state.siteSettings, after);
      this.propagateBrandMedia(transaction, value.siteId, before?.defaultMediaId ?? null, defaultMediaId, now);
      this.audit(transaction, 'site.settings.update', 'site_settings', after.id, before ?? null, after); return after;
    }});
  }

  async purgeSiteCache(actor: AuthorizedTenantActorContext, raw: unknown) {
    const parsed = siteCachePurgeSchema.safeParse(raw);
    if (!parsed.success) return this.invalid(actor, parsed.error);
    try {
      const sites = await this.repository.enqueueCachePurge(actor, DASHBOARD_PERMISSIONS.siteManage, parsed.data.siteId ?? null);
      return { ok: true as const, value: { sites } };
    } catch (error) {
      if (error instanceof DashboardAccessDeniedError) return this.denied(actor, 'site.cache.purge', 'site');
      if (error instanceof DashboardRateLimitedError) {
        try { await this.repository.recordDenied(actor, 'site.cache.purge', 'site'); } catch { return { ok: false as const, error: createPublicError('DEPENDENCY_UNAVAILABLE', 'The operation could not be completed.', actor.requestId) }; }
        return { ok: false as const, error: createPublicError('RATE_LIMITED', `Purge semua situs terlalu sering. Coba lagi dalam ${error.retryAfterSeconds} detik.`, actor.requestId) };
      }
      if (error instanceof DashboardSubscriptionInactiveError) return { ok: false as const, error: createPublicError('FORBIDDEN', 'Langganan tidak aktif. Hubungi administrator agar dapat melanjutkan perubahan.', actor.requestId) };
      return this.internal(actor, error, 'dashboard.mutation.failed', 'site.cache.purge', 'site', DASHBOARD_PERMISSIONS.siteManage);
    }
  }

  createRole(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: roleCreateSchema, permission: DASHBOARD_PERMISSIONS.roleManage, action: 'role.create', targetType: 'role', scope: ['roles'], execute: (transaction, value, now) => {
      requireUnrestrictedRegion(actor);
      if (transaction.state.roles.some(({ name }) => name.toLowerCase() === value.name.toLowerCase())) throw new DashboardConflictError();
      const record: RoleRecord = { ...this.base(actor, now), name: value.name, tier: value.tier, active: value.active, permissions: new Set(value.permissions) };
      transaction.state.roles.push(record); this.audit(transaction, 'role.create', 'role', record.id, null, { ...record, permissions: [...record.permissions] }); return roleJson(record);
    }});
  }

  updateRole(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: roleUpdateSchema, permission: DASHBOARD_PERMISSIONS.roleManage, action: 'role.update', targetType: 'role', scope: ['roles'], execute: (transaction, value, now) => {
      requireUnrestrictedRegion(actor);
      const before = requireRecord(transaction.state.roles, value.id); requireVersion(before, value.expectedVersion);
      const after: RoleRecord = { ...before, name: value.name, tier: value.tier ?? before.tier, active: value.active, permissions: new Set(value.permissions), version: before.version + 1, updatedAt: now };
      replaceById(transaction.state.roles, after); this.audit(transaction, 'role.update', 'role', after.id, { ...before, permissions: [...before.permissions] }, { ...after, permissions: [...after.permissions] }); return roleJson(after);
    }});
  }

  saveMembership(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: membershipSchema, permission: DASHBOARD_PERMISSIONS.membershipManage, action: 'membership.update', targetType: 'membership', scope: ['roles', 'regions', 'memberships'], execute: async (transaction, value, now) => {
      requireUnrestrictedRegion(actor);
      requireRecord(transaction.state.roles, value.roleId);
      if (value.regionId !== null) requireRecord(transaction.state.regions, value.regionId);
      const before = transaction.state.memberships.find(({ userId }) => userId === value.userId);
      if (before !== undefined && value.expectedVersion !== undefined) requireVersion(before, value.expectedVersion);
      const persistedDisplayName = before?.displayName ?? await transaction.resolveUserDisplayName(value.userId);
      if (persistedDisplayName === null) throw new DashboardAccessDeniedError();
      const after: MembershipRecord = before === undefined
        ? { ...this.base(actor, now), id: value.userId, userId: value.userId, displayName: persistedDisplayName, avatarUrl: null, roleId: value.roleId, status: value.status, regionId: value.regionId, version: 1 }
        : { ...before, displayName: persistedDisplayName, roleId: value.roleId, status: value.status, regionId: value.regionId, version: before.version + 1, updatedAt: now };
      if (before === undefined) transaction.state.memberships.push(after); else replaceById(transaction.state.memberships, after);
      this.audit(transaction, 'membership.update', 'membership', after.id, before ?? null, after); return after;
    }});
  }

  async listPublishers(actor: AuthorizedTenantActorContext, filter: { readonly search?: string | undefined } = {}) {
    try {
      const state = await this.repository.readPublisherScope(actor, DASHBOARD_PERMISSIONS.publisherRead);
      const siteNames = new Map(state.sites.map((site) => [site.id, site.normalizedHostname] as const));
      const cityNames = new Map(state.regions.map((region) => [region.id, region.name] as const));
      const siteCity = (siteId: string): string | null => state.sites.find((site) => site.id === siteId)?.regionId ?? null;
      const cityName = (siteId: string): string | null => {
        const regionId = siteCity(siteId);
        return regionId === null ? null : cityNames.get(regionId) ?? null;
      };
      const needle = (filter.search ?? '').trim().toLowerCase();
      const matches = (...fields: readonly (string | null)[]): boolean =>
        needle === '' || fields.some((field) => (field ?? '').toLowerCase().includes(needle));
      const publishers = state.publishers.filter((publisher) => matches(publisher.name, publisher.attributionLabel));
      const claims = new Map<string, { affiliation: OfficialAffiliationRecord; hostnames: string[] }>();
      for (const affiliation of state.affiliations) {
        const city = siteCity(affiliation.siteId);
        const key = `${affiliation.publisherId}|${city ?? ''}|${affiliation.institutionName}`;
        const hostname = siteNames.get(affiliation.siteId) ?? '';
        const existing = claims.get(key);
        if (existing === undefined) claims.set(key, { affiliation, hostnames: [hostname] });
        else {
          existing.hostnames.push(hostname);
          if (hostname < (siteNames.get(existing.affiliation.siteId) ?? '')) existing.affiliation = affiliation;
        }
      }
      const allClaims = [...claims.values()];
      const matchedClaims = allClaims.filter(({ affiliation, hostnames }) => matches(
        affiliation.institutionName,
        cityName(affiliation.siteId),
        affiliation.evidenceReference,
        ...hostnames,
      ));
      const affiliations = matchedClaims
        .map(({ affiliation, hostnames }) => ({ affiliation, portalCount: hostnames.length }))
        .sort((left, right) => left.affiliation.institutionName.localeCompare(right.affiliation.institutionName) || (cityName(left.affiliation.siteId) ?? '').localeCompare(cityName(right.affiliation.siteId) ?? ''))
        .slice(0, PUBLISHER_AFFILIATION_LIMIT)
        .map(({ affiliation, portalCount }) => ({ ...affiliation, cityName: cityName(affiliation.siteId), portalCount }));
      return { ok: true as const, value: {
        publishers,
        affiliations,
        affiliationTotal: matchedClaims.length,
        affiliationTotalInScope: allClaims.length,
        affiliationRowTotal: state.affiliations.length,
        affiliationLimit: PUBLISHER_AFFILIATION_LIMIT,
        affiliationSearch: needle === '' ? null : needle,
      } };
    } catch (error) {
      if (error instanceof DashboardAccessDeniedError) return this.denied(actor, 'publisher.list', 'publisher');
      return this.internal(actor, error, 'dashboard.query.failed', 'publisher.list', 'publisher', DASHBOARD_PERMISSIONS.publisherRead);
    }
  }

  /**
 * Create a publisher, verifying it on the spot when the actor already holds the
 * rights the manual approve path demands.
 *
 * @param actor - Tenant actor creating the publisher.
 * @param raw - Unvalidated publisher payload.
 * @returns The stored publisher record.
 * @remarks Auto-verification is limited to actors that could have approved the
 * record anyway: `publisher.verify`, an unrestricted region, and evidence supplied
 * up front. An actor holding only `publisher.manage` still gets an unverified
 * publisher, so the verification boundary cannot be self-minted.
 */
createPublisher(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: publisherCreateSchema, permission: DASHBOARD_PERMISSIONS.publisherManage, action: 'publisher.create', targetType: 'publisher', scope: ['publishers', 'articles', 'articleSites'], execute: (transaction, value, now) => {
      requirePublisherNameAvailable(transaction.state, value.name);
      const autoVerify = value.evidenceReference !== null && regionLock(actor) === null && actor.permissionSet.has(DASHBOARD_PERMISSIONS.publisherVerify);
      const record: PublisherRecord = { ...this.base(actor, now), ...value, verificationStatus: autoVerify ? 'verified' : 'unverified', submittedBy: autoVerify ? actor.actorId : null, submittedAt: autoVerify ? now : null, verifiedBy: autoVerify ? actor.actorId : null, verifiedAt: autoVerify ? now : null, rejectionReason: null, status: 'active' };
      transaction.state.publishers.push(record); this.audit(transaction, 'publisher.create', 'publisher', record.id, null, record);
      if (autoVerify) this.audit(transaction, 'publisher.verify', 'publisher', record.id, { ...record, verificationStatus: 'unverified', verifiedBy: null, verifiedAt: null }, record);
      return record;
    }});
  }

  updatePublisher(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: publisherUpdateSchema, permission: DASHBOARD_PERMISSIONS.publisherManage, action: 'publisher.update', targetType: 'publisher', scope: ['publishers', 'articles', 'articleSites'], execute: (transaction, value, now) => {
      const before = requireRecord(transaction.state.publishers, value.id); requireVersion(before, value.expectedVersion);
      if (value.name !== before.name) requirePublisherNameAvailable(transaction.state, value.name);
      const identityChanged = before.name !== value.name || before.type !== value.type || before.attributionLabel !== value.attributionLabel
        || JSON.stringify(before.contacts) !== JSON.stringify(value.contacts) || before.evidenceReference !== value.evidenceReference;
      const after: PublisherRecord = { ...before, ...value, verificationStatus: identityChanged && before.verificationStatus === 'verified' ? 'unverified' : before.verificationStatus, verifiedBy: identityChanged ? null : before.verifiedBy, verifiedAt: identityChanged ? null : before.verifiedAt, version: before.version + 1, updatedAt: now };
      replaceById(transaction.state.publishers, after); this.audit(transaction, 'publisher.update', 'publisher', after.id, before, after); return after;
    }});
  }

  submitPublisher(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.publisherDecision(actor, raw, 'submit');
  }
  approvePublisher(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.publisherDecision(actor, raw, 'approve');
  }
  rejectPublisher(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.publisherDecision(actor, raw, 'reject');
  }
  archivePublisher(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.publisherDecision(actor, raw, 'archive');
  }

  private publisherDecision(actor: AuthorizedTenantActorContext, raw: unknown, decision: 'submit' | 'approve' | 'reject' | 'archive') {
    const permission = decision === 'approve' || decision === 'reject' ? DASHBOARD_PERMISSIONS.publisherVerify : DASHBOARD_PERMISSIONS.publisherManage;
    return this.mutate({ actor, raw, schema: publisherDecisionSchema, permission, action: `publisher.${decision}`, targetType: 'publisher', scope: ['publishers', 'articles', 'articleSites'], execute: (transaction, value, now) => {
      if (decision === 'approve' || decision === 'reject') requireUnrestrictedRegion(actor);
      const before = requireRecord(transaction.state.publishers, value.id); requireVersion(before, value.expectedVersion);
      if ((decision === 'submit' || decision === 'approve') && (value.evidenceReference ?? before.evidenceReference) === null) throw new DashboardValidationError({ evidenceReference: ['Verification evidence is required.'] });
      if (decision === 'reject' && value.reason === undefined) throw new DashboardValidationError({ reason: ['A rejection reason is required.'] });
      const after: PublisherRecord = {
        ...before,
        evidenceReference: value.evidenceReference ?? before.evidenceReference,
        verificationStatus: decision === 'submit' ? 'pending' : decision === 'approve' ? 'verified' : decision === 'reject' ? 'rejected' : before.verificationStatus,
        submittedBy: decision === 'submit' ? actor.actorId : before.submittedBy,
        submittedAt: decision === 'submit' ? now : before.submittedAt,
        verifiedBy: decision === 'approve' || decision === 'reject' ? actor.actorId : before.verifiedBy,
        verifiedAt: decision === 'approve' || decision === 'reject' ? now : before.verifiedAt,
        rejectionReason: decision === 'reject' ? value.reason ?? null : null,
        status: decision === 'archive' ? 'archived' : before.status,
        version: before.version + 1, updatedAt: now,
      };
      replaceById(transaction.state.publishers, after); this.audit(transaction, `publisher.${decision}`, 'publisher', after.id, before, after); return after;
    }});
  }

  createAffiliation(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: affiliationSchema, permission: DASHBOARD_PERMISSIONS.publisherVerify, action: 'affiliation.create', targetType: 'official_affiliation', scope: ['publishers', 'sites', 'regions', 'affiliations', 'articles', 'articleSites'], execute: (transaction, value, now) => {
      const publisher = requireRecord(transaction.state.publishers, value.publisherId); requireSiteInScope(transaction.state, value.siteId, actor);
      if (publisher.verificationStatus !== 'verified') throw new DashboardAccessDeniedError();
      const record: OfficialAffiliationRecord = { ...this.base(actor, now), ...value, active: true, verifiedAt: now };
      transaction.state.affiliations.push(record); this.audit(transaction, 'affiliation.create', 'official_affiliation', record.id, null, record); return record;
    }});
  }

  updateAffiliation(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: affiliationUpdateSchema, permission: DASHBOARD_PERMISSIONS.publisherVerify, action: 'affiliation.update', targetType: 'official_affiliation', scope: ['publishers', 'sites', 'regions', 'affiliations', 'articles', 'articleSites'], execute: (transaction, value, now) => {
      const before = requireRecord(transaction.state.affiliations, value.id); requireVersion(before, value.expectedVersion);
      const publisher = requireRecord(transaction.state.publishers, before.publisherId); requireSiteInScope(transaction.state, before.siteId, actor);
      if (value.active && publisher.verificationStatus !== 'verified') throw new DashboardAccessDeniedError();
      const after: OfficialAffiliationRecord = { ...before, institutionName: value.institutionName, claimScopes: value.claimScopes, evidenceReference: value.evidenceReference, active: value.active, verifiedAt: value.active ? now : before.verifiedAt, version: before.version + 1, updatedAt: now };
      const replicas = this.affiliationClaimReplicas(transaction.state, before);
      for (const replica of replicas) {
        const updated: OfficialAffiliationRecord = { ...replica, institutionName: value.institutionName, claimScopes: value.claimScopes, evidenceReference: value.evidenceReference, active: value.active, verifiedAt: value.active ? now : replica.verifiedAt, version: replica.version + 1, updatedAt: now };
        replaceById(transaction.state.affiliations, updated);
      }
      this.audit(transaction, 'affiliation.update', 'official_affiliation', after.id, before, after);
      return after;
    }});
  }

  /**
   * Every row carrying one institution claim across the portals that publish it.
   *
   * A claim is stored once per portal: the same institution asserting its name on
   * the same city is a separate row per Domain, which is why one claim is 134
   * rows. Editing a claim therefore has to move all of them together, or the
   * dashboard would report one claim while only a single portal changed.
   *
   * @param state - Tenant state holding affiliations, sites, and regions.
   * @param seed - The affiliation row the operator opened.
   * @returns Replica rows sharing the seed's publisher, institution, and city.
   */
  private affiliationClaimReplicas(state: DashboardTenantState, seed: OfficialAffiliationRecord): readonly OfficialAffiliationRecord[] {
    const seedSite = requireRecord(state.sites, seed.siteId);
    const cityOf = (siteId: string): string | null => {
      const site = state.sites.find((candidate) => candidate.id === siteId);
      return site?.regionId ?? null;
    };
    return state.affiliations.filter((affiliation) =>
      affiliation.publisherId === seed.publisherId
      && affiliation.institutionName === seed.institutionName
      && cityOf(affiliation.siteId) === seedSite.regionId);
  }

  async getPublisherClaim(actor: AuthorizedTenantActorContext, publisherId: string, siteId: string): Promise<Result<NetworkPublisherClaim, PublicErrorEnvelope>> {
    try {
      const scope = await this.repository.readPublisherClaimScope(actor, DASHBOARD_PERMISSIONS.publisherRead, publisherId, siteId);
      return { ok: true, value: buildNetworkPublisherClaim(scope.publisher, scope.affiliations, siteId) };
    } catch (error) {
      if (error instanceof DashboardAccessDeniedError) return this.denied(actor, 'publisher.claim.read', 'publisher');
      return this.internal(actor, error, 'dashboard.query.failed', 'publisher.claim.read', 'publisher', DASHBOARD_PERMISSIONS.publisherRead);
    }
  }

  createCategory(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: categoryCreateSchema, permission: DASHBOARD_PERMISSIONS.articleManage, action: 'category.create', targetType: 'category', revalidateTags: [orgTag(actor.organizationId)], scope: ['categories', 'articles', 'articleSites'], execute: (transaction, value, now) => {
      if (transaction.state.categories.some(({ slug }) => slug === value.slug)) throw new DashboardConflictError();
      const record: CategoryRecord = { ...this.base(actor, now), ...value }; transaction.state.categories.push(record); this.audit(transaction, 'category.create', 'category', record.id, null, record); return record;
    }});
  }

  updateCategory(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: categoryUpdateSchema, permission: DASHBOARD_PERMISSIONS.articleManage, action: 'category.update', targetType: 'category', revalidateTags: [orgTag(actor.organizationId)], scope: ['categories', 'articles', 'articleSites'], execute: (transaction, value, now) => {
      const before = requireRecord(transaction.state.categories, value.id); requireVersion(before, value.expectedVersion);
      const after: CategoryRecord = { ...before, name: value.name, slug: value.slug, status: value.status, version: before.version + 1, updatedAt: now };
      replaceById(transaction.state.categories, after); this.audit(transaction, 'category.update', 'category', after.id, before, after); return after;
    }});
  }

  deleteCategory(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: categoryDeleteSchema, permission: DASHBOARD_PERMISSIONS.articleManage, action: 'category.delete', targetType: 'category', revalidateTags: [orgTag(actor.organizationId)], scope: ['categories', 'articles', 'articleCategories', 'regions', 'articleSites'], execute: (transaction, value, now) => {
      const before = requireRecord(transaction.state.categories, value.id); requireVersion(before, value.expectedVersion);
      const lock = regionLock(actor);
      const detached = transaction.state.articles.filter((article) => article.categoryIds.includes(value.id) || article.categoryId === value.id);
      for (const article of detached) {
        if (!articleInScope(article, lock, transaction.state.regions)) throw new DashboardAccessDeniedError();
      }
      for (const article of detached) {
        const categoryIds = article.categoryIds.filter((categoryId) => categoryId !== value.id);
        const after: ArticleRecord = { ...article, categoryId: categoryIds[0] ?? null, categoryIds, version: article.version + 1, updatedAt: now };
        replaceById(transaction.state.articles, after); this.syncArticleCategories(transaction.state, after.id, categoryIds); this.audit(transaction, 'category.delete', 'article', after.id, article, after);
      }
      transaction.state.categories = transaction.state.categories.filter(({ id }) => id !== value.id);
      this.audit(transaction, 'category.delete', 'category', before.id, before, null); return { id: before.id, detached: detached.length };
    }});
  }

  renameTag(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: tagRenameSchema, permission: DASHBOARD_PERMISSIONS.articleManage, action: 'tag.rename', targetType: 'article', scope: ['articles', 'regions', 'articleSites'], execute: (transaction, value, now) => {
      const lock = regionLock(actor);
      const affected = transaction.state.articles.filter((article) => article.tags.includes(value.from));
      for (const article of affected) {
        if (!articleInScope(article, lock, transaction.state.regions)) throw new DashboardAccessDeniedError();
      }
      for (const article of affected) {
        const tags = [...new Set(article.tags.map((tag) => (tag === value.from ? value.to : tag)))];
        const after: ArticleRecord = { ...article, tags, version: article.version + 1, updatedAt: now };
        replaceById(transaction.state.articles, after); this.audit(transaction, 'tag.rename', 'article', after.id, article, after);
      }
      return { from: value.from, to: value.to, affected: affected.length };
    }});
  }

  removeTag(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: tagRemoveSchema, permission: DASHBOARD_PERMISSIONS.articleManage, action: 'tag.remove', targetType: 'article', scope: ['articles', 'regions', 'articleSites'], execute: (transaction, value, now) => {
      const lock = regionLock(actor);
      const affected = transaction.state.articles.filter((article) => article.tags.includes(value.tag));
      for (const article of affected) {
        if (!articleInScope(article, lock, transaction.state.regions)) throw new DashboardAccessDeniedError();
      }
      for (const article of affected) {
        const after: ArticleRecord = { ...article, tags: article.tags.filter((tag) => tag !== value.tag), version: article.version + 1, updatedAt: now };
        replaceById(transaction.state.articles, after); this.audit(transaction, 'tag.remove', 'article', after.id, article, after);
      }
      return { tag: value.tag, affected: affected.length };
    }});
  }

  async listTaxonomy(actor: AuthorizedTenantActorContext) {
    try {
      const scope = await this.repository.readTaxonomyScope(actor, DASHBOARD_PERMISSIONS.articleRead);
      const lock = regionLock(actor);
      const articles = scope.articles.filter((article) => articleInScope(article, lock, scope.regions));
      const categoryCounts = new Map<string, number>();
      for (const article of articles) {
        for (const categoryId of new Set([article.categoryId, ...article.categoryIds])) {
          if (categoryId === null) continue;
          categoryCounts.set(categoryId, (categoryCounts.get(categoryId) ?? 0) + 1);
        }
      }
      const tagCounts = new Map<string, number>();
      for (const article of articles) {
        for (const tag of new Set(article.tags)) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      }
      return { ok: true as const, value: {
        categories: scope.categories.map((category) => ({ ...category, articleCount: categoryCounts.get(category.id) ?? 0 })),
        tags: [...tagCounts.entries()]
          .map(([tag, count]) => ({ tag, count }))
          .sort((left, right) => right.count - left.count || left.tag.localeCompare(right.tag)),
      } };
    } catch (error) {
      if (error instanceof DashboardAccessDeniedError) return this.denied(actor, 'taxonomy.list', 'taxonomy');
      return this.internal(actor, error, 'dashboard.query.failed', 'taxonomy.list', 'taxonomy', DASHBOARD_PERMISSIONS.articleRead);
    }
  }

  createAuthor(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: authorCreateSchema, permission: DASHBOARD_PERMISSIONS.articleManage, action: 'author.create', targetType: 'author', scope: ['authors', 'articles', 'articleSites'], execute: (transaction, value, now) => {
      const record: AuthorRecord = { ...this.base(actor, now), ...value }; transaction.state.authors.push(record); this.audit(transaction, 'author.create', 'author', record.id, null, record); return record;
    }});
  }

  updateAuthor(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: authorUpdateSchema, permission: DASHBOARD_PERMISSIONS.articleManage, action: 'author.update', targetType: 'author', scope: ['authors', 'articles', 'articleSites'], execute: (transaction, value, now) => {
      const before = requireRecord(transaction.state.authors, value.id); requireVersion(before, value.expectedVersion);
      const after: AuthorRecord = { ...before, displayName: value.displayName, byline: value.byline, status: value.status, version: before.version + 1, updatedAt: now };
      replaceById(transaction.state.authors, after); this.audit(transaction, 'author.update', 'author', after.id, before, after); return after;
    }});
  }

  async listEditorialSummaries(actor: AuthorizedTenantActorContext): Promise<Result<EditorialSummaries, PublicErrorEnvelope>> {
    try {
      const summaries = await this.repository.listEditorialSummaries(actor, DASHBOARD_PERMISSIONS.articleRead);
      const lock = regionLock(actor);
      const regions = summaries.regions.filter((region) => regionScopeCovers(lock, region.id, summaries.regions));
      const sites = summaries.sites.filter((site) => siteInScope(site, lock, summaries.regions));
      const articles = summaries.articles.filter((article) => articleInScope(article, lock, summaries.regions));
      const scopeRegion = lock === null ? null : regions.find(({ id }) => id === lock);
      return { ok: true, value: { articles, sites, regions, regionScope: scopeRegion === undefined || scopeRegion === null ? null : { id: scopeRegion.id, name: scopeRegion.name } } };
    } catch (error) {
      if (error instanceof DashboardAccessDeniedError) return this.denied(actor, 'article.list', 'article');
      return this.internal(actor, error, 'dashboard.query.failed', 'article.list', 'article', DASHBOARD_PERMISSIONS.articleRead);
    }
  }

  async searchArticleSummaries(actor: AuthorizedTenantActorContext, keyword: string, limit = 8): Promise<Result<readonly EditorialSummaryArticle[], PublicErrorEnvelope>> {
    if (keyword.trim() === '') return { ok: true, value: [] };
    try {
      return { ok: true, value: await this.repository.searchArticleSummaries(actor, DASHBOARD_PERMISSIONS.articleRead, keyword, limit) };
    } catch (error) {
      if (error instanceof DashboardAccessDeniedError) return this.denied(actor, 'article.list', 'article');
      return this.internal(actor, error, 'dashboard.query.failed', 'article.search', 'article', DASHBOARD_PERMISSIONS.articleRead);
    }
  }

  listEditorial(actor: AuthorizedTenantActorContext, rawFilter: unknown = {}) {
    const parsed = articleFilterSchema.safeParse(rawFilter);
    if (!parsed.success) return Promise.resolve(this.invalid(actor, parsed.error));
    const filter = defined(parsed.data) as ArticleFilter;
    return this.readEditorial(actor, filter, 'article.list', 'article');
  }

  private async readEditorial(actor: AuthorizedTenantActorContext, filter: ArticleFilter, action: string, targetType: string) {
    try {
      const scope = await this.repository.readEditorialScope(actor, DASHBOARD_PERMISSIONS.articleRead, filter, {
        ...(filter.limit === undefined ? {} : { limit: filter.limit }),
        ...(filter.cursor === undefined ? {} : { cursor: filter.cursor }),
      });
      this.requireFilterReferences(scope, filter, actor);
      const lock = regionLock(actor);
      const regions = scope.regions.filter((region) => regionScopeCovers(lock, region.id, scope.regions));
      const sites = scope.sites.filter((site) => siteInScope(site, lock, scope.regions));
      const scopeRegion = lock === null ? null : regions.find(({ id }) => id === lock);
      const referencedDomainIds = new Set(sites.map((site) => site.domainId).filter((domainId): domainId is string => typeof domainId === 'string'));
      const basePublishers = scope.publishers.map(({ id, name, attributionLabel, status }) => ({ id, name, attributionLabel, status }));
      let ownerOrgs: ReadonlyMap<string, string> = new Map();
      if (actor.platformPermissionSet?.has(INTEGRATIONS_PERMISSIONS.superAdmin) === true) {
        try {
          ownerOrgs = await this.repository.findOrganizationsBySlugs(actor, basePublishers.map((publisher) => resolveOwnerOrgSlug(publisher.name)));
        } catch {
          ownerOrgs = new Map();
        }
      }
      const publishers = basePublishers.map((publisher) => {
        const ownerId = ownerOrgs.get(resolveOwnerOrgSlug(publisher.name)) ?? null;
        return { ...publisher, ownerOrganizationId: ownerId !== null && ownerId !== actor.organizationId ? ownerId : null };
      });
      return { ok: true as const, value: {
        articles: scope.articles, articlesNextCursor: scope.articlesNextCursor, total: scope.total, tagOptions: scope.tagOptions,
        categories: scope.categories, authors: scope.authors,
        publishers, regions, sites,
        domains: scope.domains.filter((domain) => referencedDomainIds.has(domain.id)).map(({ id, normalizedHostname }) => ({ id, normalizedHostname })),
        articleSites: scope.articleSites,
        regionScope: scopeRegion === undefined || scopeRegion === null ? null : { id: scopeRegion.id, name: scopeRegion.name },
      } };
    } catch (error) {
      if (error instanceof DashboardAccessDeniedError) return this.denied(actor, action, targetType);
      return this.internal(actor, error, 'dashboard.query.failed', action, targetType, DASHBOARD_PERMISSIONS.articleRead);
    }
  }

  async createArticle(actor: AuthorizedTenantActorContext, raw: unknown) {
    const forOrg = await this.tryCreateArticleForOwnerOrg(actor, raw);
    const result = forOrg ?? await this.mutate({ actor, raw, schema: articleCreateSchema, permission: DASHBOARD_PERMISSIONS.articleManage, action: 'article.create', targetType: 'article', scope: ['articles', 'regions', 'publishers', 'categories', 'articleCategories', 'authors', 'media', 'articleSites'], execute: (transaction, value, now) => this.insertArticleRecord(transaction, actor, value, now) });
    if (result.ok && this.notifier !== null) {
      try {
        await this.notifier.notifyArticleCreated({ organizationId: result.value.organizationId, articleId: result.value.id, title: result.value.title });
      } catch { /* best-effort notification: queue failure does not fail the write */ }
    }
    return result;
  }

  private insertArticleRecord(transaction: DashboardTransaction, actor: AuthorizedTenantActorContext, value: ArticleCreateInput, now: string): ArticleRecord {
    this.requireArticleReferences(transaction.state, value);
    requireLockedRegionValue(transaction.state, actor, value.regionId);
    const slug = allocateUniqueSlug(transaction.state.articles.map(({ slug }) => slug), value.slug);
    const distinctCategoryIds = this.resolveArticleCategoryIds(transaction.state, value.categoryIds ?? []);
    const leadMediaId = this.requireActiveMedia(transaction, value.leadMediaId ?? null, null, 'leadMediaId', 'article-cover');
    const record: ArticleRecord = { ...this.base(actor, now), ...value, slug, categoryId: distinctCategoryIds[0] ?? null, categoryIds: distinctCategoryIds, leadMediaId, coverImageUrl: value.coverImageUrl ?? null, excerpt: value.excerpt ?? null, canonicalUrl: value.canonicalUrl ?? null, bodyJson: requireValidBodyJson(value.bodyJson), source: value.source ?? '', scheduledAt: value.scheduledAt ?? null, publishedAt: null, archivedAt: null };
    transaction.state.articles.push(record); this.syncArticleCategories(transaction.state, record.id, distinctCategoryIds); this.audit(transaction, 'article.create', 'article', record.id, null, record);
    return record;
  }

  /**
   * Buatkan artikel langsung di org pemilik penerbit cermin.
   *
   * @param actor - Admin pemanggil; wajib membawa grant platform super_admin.
   * @param raw - Payload kreasi mentah dari dasbor org aktif.
   * @returns Record milik org pemilik, atau null bila jalur normal yang berlaku.
   * @remarks Admin menulis dari dasbor operator tetapi memilih penerbit humas
   * (mis. RUTAN KELAS II B WONOSOBO): artikel, atribusi, dan audit harus
   * melekat ke org UPT tersebut, bukan ke org operator. Penerbit tanpa
   * cermin org (Indicate Newsroom, Redaksi) dan penerbit kosong kembali ke
   * jalur normal (return null). Sampul unggahan (leadMediaId milik org
   * operator) dikosongkan karena FK media satu-org; penyalinan berkas media
   * adalah tahap berikutnya, bukan tahap ini.
   */
  private async tryCreateArticleForOwnerOrg(actor: AuthorizedTenantActorContext, raw: unknown): Promise<Result<ArticleRecord, PublicErrorEnvelope> | null> {
    if (actor.platformPermissionSet?.has(INTEGRATIONS_PERMISSIONS.superAdmin) !== true) return null;
    const parsed = articleCreateSchema.safeParse(raw);
    if (!parsed.success || parsed.data.publisherId === null) return null;
    let scope;
    try {
      scope = await this.repository.readEditorialScope(actor, DASHBOARD_PERMISSIONS.articleRead, { publisherId: parsed.data.publisherId }, { limit: 0 });
    } catch {
      return null;
    }
    const publisher = scope.publishers.find((candidate) => candidate.id === parsed.data.publisherId);
    if (publisher === undefined) return null;
    let ownerOrgId: string | null;
    try {
      ownerOrgId = await this.repository.findOrganizationBySlug(actor, resolveOwnerOrgSlug(publisher.name));
    } catch {
      return null;
    }
    if (ownerOrgId === null || ownerOrgId === actor.organizationId) return null;
    const { ownerOrganizationId: claimedOwner, ...rest } = parsed.data;
    if (claimedOwner !== undefined && claimedOwner !== null && claimedOwner !== ownerOrgId) {
      return { ok: false, error: createPublicError('INVALID_INPUT', 'Penerbit dan organisasi tujuan tidak cocok; pilih ulang penerbit.', actor.requestId, { ownerOrganizationId: ['Penerbit dan organisasi tujuan tidak cocok.'] }) };
    }
    const categorySlugs = (rest.categoryIds ?? []).flatMap((id) => {
      const slug = scope.categories.find((candidate) => candidate.id === id)?.slug;
      return slug === undefined ? [] : [slug];
    });
    const regionSlug = rest.regionId === null ? null : (scope.regions.find((candidate) => candidate.id === rest.regionId)?.slug ?? null);
    const ownerActor: AuthorizedTenantActorContext = { ...actor, organizationId: ownerOrgId, regionScopeId: null };
    try {
      const record = await this.repository.executeForOrganization(ownerActor, ownerOrgId, (transaction) => {
        const mapped = mapArticleForOrg(
          {
            publisherId: rest.publisherId,
            authorId: rest.authorId,
            categoryIds: rest.categoryIds,
            regionId: rest.regionId,
            publisherName: publisher.name,
            categorySlugs,
            regionSlug,
          },
          transaction.state,
        );
        if (mapped === null) throw new DashboardValidationError({ publisherId: ['Penerbit tidak tersedia di organisasi tujuan.'] });
        return this.insertArticleRecord(
          transaction,
          ownerActor,
          { ...rest, publisherId: mapped.publisherId, authorId: mapped.authorId, categoryIds: mapped.categoryIds, regionId: mapped.regionId },
          this.clock.now().toISOString(),
        );
      }, ['articles', 'regions', 'publishers', 'categories', 'articleCategories', 'authors', 'media', 'articleSites']);
      return { ok: true, value: record } as const;
    } catch (error) {
      if (error instanceof DashboardValidationError) return { ok: false, error: createPublicError('INVALID_INPUT', 'Please correct the highlighted fields.', actor.requestId, error.fields) };
      if (error instanceof DashboardAccessDeniedError) return this.denied(actor, 'article.create', 'article');
      if (error instanceof DashboardSubscriptionInactiveError) return { ok: false, error: createPublicError('FORBIDDEN', 'Langganan tidak aktif. Hubungi administrator agar dapat melanjutkan perubahan.', actor.requestId) };
      if (error instanceof DashboardConflictError) return { ok: false, error: createPublicError('CONFLICT', error.message, actor.requestId) };
      return this.internal(actor, error, 'dashboard.mutation.failed', 'article.create', 'article', DASHBOARD_PERMISSIONS.articleManage);
    }
  }

  /**
   * Terbitkan artikel milik org lain ke portal org aktif.
   *
   * @param actor - Steward pemanggil; wajib membawa grant platform super_admin.
   * @param raw - Org pemilik, artikel, dan situs penyaji tujuan.
   * @returns Id baris bridge dan slug untuk invalidasi.
   */
  async requestBridgePublication(actor: AuthorizedTenantActorContext, raw: unknown): Promise<Result<{ readonly bridgeIds: readonly string[]; readonly slug: string }, PublicErrorEnvelope>> {
    if (actor.platformPermissionSet?.has(INTEGRATIONS_PERMISSIONS.superAdmin) !== true) return this.denied(actor, 'article.bridge.request', 'portal_assignment');
    const parsed = bridgeRequestSchema.safeParse(raw);
    if (!parsed.success) return this.invalid(actor, parsed.error);
    try {
      const value = await this.repository.requestBridgePublication(actor, parsed.data);
      return { ok: true, value } as const;
    } catch (error) {
      if (error instanceof DashboardValidationError) return { ok: false, error: createPublicError('INVALID_INPUT', 'Please correct the highlighted fields.', actor.requestId, error.fields) };
      if (error instanceof DashboardAccessDeniedError) return this.denied(actor, 'article.bridge.request', 'portal_assignment');
      if (error instanceof DashboardSubscriptionInactiveError) return { ok: false, error: createPublicError('FORBIDDEN', 'Langganan tidak aktif. Hubungi administrator agar dapat melanjutkan perubahan.', actor.requestId) };
      if (error instanceof DashboardConflictError) return { ok: false, error: createPublicError('CONFLICT', error.message, actor.requestId) };
      return this.internal(actor, error, 'dashboard.mutation.failed', 'article.bridge.request', 'portal_assignment', DASHBOARD_PERMISSIONS.articleManage);
    }
  }

  /**
   * Tarik penayangan jembatan; artikel pemilik tidak diubah.
   *
   * @param actor - Steward pemanggil; wajib membawa grant platform super_admin.
   * @param raw - Org pemilik, artikel, dan situs yang ditarik (kosong = semua).
   * @returns Jumlah baris bridge yang diturunkan.
   */
  async unpublishBridge(actor: AuthorizedTenantActorContext, raw: unknown): Promise<Result<{ readonly unpublished: number }, PublicErrorEnvelope>> {
    if (actor.platformPermissionSet?.has(INTEGRATIONS_PERMISSIONS.superAdmin) !== true) return this.denied(actor, 'article.bridge.unpublish', 'portal_assignment');
    const parsed = bridgeUnpublishSchema.safeParse(raw);
    if (!parsed.success) return this.invalid(actor, parsed.error);
    try {
      const value = await this.repository.unpublishBridge(actor, parsed.data);
      return { ok: true, value } as const;
    } catch (error) {
      if (error instanceof DashboardValidationError) return { ok: false, error: createPublicError('INVALID_INPUT', 'Please correct the highlighted fields.', actor.requestId, error.fields) };
      if (error instanceof DashboardAccessDeniedError) return this.denied(actor, 'article.bridge.unpublish', 'portal_assignment');
      if (error instanceof DashboardSubscriptionInactiveError) return { ok: false, error: createPublicError('FORBIDDEN', 'Langganan tidak aktif. Hubungi administrator agar dapat melanjutkan perubahan.', actor.requestId) };
      if (error instanceof DashboardConflictError) return { ok: false, error: createPublicError('CONFLICT', error.message, actor.requestId) };
      return this.internal(actor, error, 'dashboard.mutation.failed', 'article.bridge.unpublish', 'portal_assignment', DASHBOARD_PERMISSIONS.articleManage);
    }
  }

  updateArticle(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: articleUpdateSchema, permission: DASHBOARD_PERMISSIONS.articleManage, action: 'article.update', targetType: 'article', scope: ['articles', 'regions', 'publishers', 'categories', 'articleCategories', 'authors', 'media', 'articleSites'], execute: async (transaction, value, now) => {
      this.requireArticleReferences(transaction.state, value);
      const beforeRef = requireRecord(transaction.state.articles, value.id); requireVersion(beforeRef, value.expectedVersion);
      requireArticleInScope(transaction.state, beforeRef.id, actor);
      requireLockedRegionValue(transaction.state, actor, value.regionId);
      if (value.slug !== beforeRef.slug && transaction.state.articles.some(({ id, slug }) => id !== value.id && slug === value.slug)) throw new DashboardConflictError();
      await transaction.refreshArticleContent(value.id);
      if (value.body !== undefined || value.bodyJson !== undefined) transaction.articleContentTouched.add(value.id);
      const before = requireRecord(transaction.state.articles, value.id);
      const existingCategoryIds = transaction.state.articleCategories.filter((row) => row.articleId === value.id).sort((a, b) => a.position - b.position).map((row) => row.categoryId);
      const distinctCategoryIds = this.resolveArticleCategoryIds(transaction.state, value.categoryIds === undefined
        ? (value.categoryId === before.categoryId ? existingCategoryIds : (value.categoryId === null ? [] : [value.categoryId]))
        : value.categoryIds);
      const leadMediaId = this.requireActiveMedia(transaction, value.leadMediaId, before.leadMediaId ?? null, 'leadMediaId', 'article-cover');
      const after: ArticleRecord = { ...before, regionId: value.regionId, publisherId: value.publisherId, categoryId: distinctCategoryIds[0] ?? null, categoryIds: distinctCategoryIds, authorId: value.authorId, leadMediaId, coverImageUrl: value.coverImageUrl === undefined ? before.coverImageUrl : (value.coverImageUrl ?? null), slug: value.slug, title: value.title, excerpt: value.excerpt ?? null, canonicalUrl: value.canonicalUrl ?? null, body: value.body ?? before.body, bodyJson: value.bodyJson === undefined ? before.bodyJson : requireValidBodyJson(value.bodyJson), source: value.source ?? before.source, tags: [...value.tags], status: value.status, scheduledAt: value.scheduledAt ?? null, version: before.version + 1, updatedAt: now };
      replaceById(transaction.state.articles, after); this.syncArticleCategories(transaction.state, after.id, distinctCategoryIds); this.audit(transaction, 'article.update', 'article', after.id, before, after); return after;
    }});
  }

  private requireFilterReferences(state: { readonly regions: readonly ScopeGeography[]; readonly sites: readonly { readonly id: string; readonly regionId: string | null }[]; readonly categories: readonly { readonly id: string }[]; readonly publishers: readonly { readonly id: string }[]; readonly authors: readonly { readonly id: string }[] }, filter: ArticleFilter, actor?: AuthorizedTenantActorContext): void {
    if (filter.regionId !== undefined) requireRecord(state.regions, filter.regionId);
    if (filter.siteId !== undefined) requireRecord(state.sites, filter.siteId);
    if (filter.categoryId !== undefined) requireRecord(state.categories, filter.categoryId);
    if (filter.publisherId !== undefined) requireRecord(state.publishers, filter.publisherId);
    if (filter.authorId !== undefined) requireRecord(state.authors, filter.authorId);
    const lock = actor === undefined ? null : regionLock(actor);
    if (lock !== null) {
      if (filter.regionId !== undefined && !regionScopeCovers(lock, filter.regionId, state.regions)) throw new DashboardAccessDeniedError();
      if (filter.siteId !== undefined) requireSiteInScope(state, filter.siteId, actor!);
    }
  }

  private requireArticleReferences(state: MutableTenantState, value: { regionId: string | null; publisherId: string | null; categoryId: string | null; categoryIds?: readonly string[] | undefined; authorId: string | null }): void {
    if (value.regionId !== null && requireRecord(state.regions, value.regionId).status !== 'active') throw new DashboardAccessDeniedError();
    if (value.publisherId !== null && requireRecord(state.publishers, value.publisherId).status !== 'active') throw new DashboardAccessDeniedError();
    if (value.categoryId !== null && requireRecord(state.categories, value.categoryId).status !== 'active') throw new DashboardAccessDeniedError();
    for (const categoryId of value.categoryIds ?? []) {
      if (requireRecord(state.categories, categoryId).status !== 'active') throw new DashboardAccessDeniedError();
    }
    if (value.authorId !== null && requireRecord(state.authors, value.authorId).status !== 'active') throw new DashboardAccessDeniedError();
  }

  private syncArticleCategories(state: MutableTenantState, articleId: string, categoryIds: readonly string[]): void {
    const distinct = [...new Set(categoryIds)];
    state.articleCategories = state.articleCategories.filter((row) => row.articleId !== articleId);
    distinct.forEach((categoryId, index) => {
      state.articleCategories.push({ articleId, categoryId, position: index + 1 });
    });
  }

  /**
   * Category set to file an article under when the editor picked none.
   *
   * A categoryless article is unreachable: the category listings, the nav, and
   * the author profile all filter on a non-null slug, and the NewsArticle
   * `articleSection`, the OpenGraph `section`, and the RSS `<category>` element
   * are omitted outright. So the write path fills the seeded `Berita` category
   * instead of storing null, which also covers API callers that omit the field.
   *
   * @param state - Tenant state holding the organization categories.
   * @param picked - Category ids the editor submitted.
   * @returns The submitted ids, or the single default category when empty.
   * @throws {DashboardValidationError} When the tenant has no category at all.
   */
  private resolveArticleCategoryIds(state: DashboardTenantState, picked: readonly string[]): readonly string[] {
    const distinct = [...new Set(picked)];
    if (distinct.length > 0) return distinct;
    const active = state.categories.filter((category) => category.status === 'active');
    const fallback = active.find((category) => category.slug === DEFAULT_CATEGORY_SLUG)
      ?? [...active].sort((left, right) => left.name.localeCompare(right.name))[0];
    if (fallback === undefined) throw new DashboardValidationError({ categoryIds: ['Buat kategori terlebih dahulu sebelum menulis artikel.'] });
    return [fallback.id];
  }

  archiveArticle(actor: AuthorizedTenantActorContext, raw: unknown) { return this.transitionArticle(actor, raw, 'archived'); }
  restoreArticle(actor: AuthorizedTenantActorContext, raw: unknown) { return this.transitionArticle(actor, raw, 'draft'); }
  private transitionArticle(actor: AuthorizedTenantActorContext, raw: unknown, status: 'archived' | 'draft') {
    const action = status === 'archived' ? 'article.archive' : 'article.restore';
    return this.mutate({ actor, raw, schema: articleTransitionSchema, permission: DASHBOARD_PERMISSIONS.articleManage, action, targetType: 'article', scope: ['articles', 'regions', 'articleSites'], execute: (transaction, value: VersionInput, now) => {
      const before = requireArticleInScope(transaction.state, value.id, actor); requireVersion(before, value.expectedVersion);
      const after: ArticleRecord = { ...before, status, archivedAt: status === 'archived' ? now : null, version: before.version + 1, updatedAt: now };
      replaceById(transaction.state.articles, after); this.audit(transaction, action, 'article', after.id, before, after); return after;
    }});
  }

  /**
   * Hapus permanen satu artikel beserta relasi kategorinya.
   *
   * @param actor - Konteks tenant terotorisasi.
   * @param raw - `{ id, expectedVersion }` yang divalidasi `articleDeleteSchema`.
   * @returns Id artikel yang dihapus.
   * @throws {DashboardValidationError} Bila status masih tayang/terjadwal, masih
   * punya penugasan portal, atau sudah punya riwayat job penerbitan. Revisi ikut
   * terhapus; laporan moderasi, media milik, dan reservasi media menahan hapus
   * di lapisan persistensi dan dilaporkan sebagai galat validasi.
   */
  deleteArticle(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: articleDeleteSchema, permission: DASHBOARD_PERMISSIONS.articleManage, action: 'article.delete', targetType: 'article', scope: ['articles', 'regions', 'articleSites', 'publishingJobs', 'articleCategories'], execute: (transaction, value: VersionInput) => {
      const before = requireArticleInScope(transaction.state, value.id, actor); requireVersion(before, value.expectedVersion);
      if (before.status !== 'draft' && before.status !== 'archived') {
        throw new DashboardValidationError({ status: ['Arsipkan dulu artikel tayang atau terjadwal sebelum dihapus permanen.'] });
      }
      if (transaction.state.articleSites.some((row) => row.articleId === before.id)) {
        throw new DashboardValidationError({ articleSites: ['Lepas dulu penugasan portal artikel ini sebelum dihapus permanen.'] });
      }
      if (transaction.state.publishingJobs.some((row) => row.articleId === before.id)) {
        throw new DashboardValidationError({ publishingJobs: ['Artikel dengan riwayat job penerbitan tidak bisa dihapus permanen; arsipkan saja.'] });
      }
      transaction.state.articles = transaction.state.articles.filter((row) => row.id !== before.id);
      this.syncArticleCategories(transaction.state, before.id, []);
      this.audit(transaction, 'article.delete', 'article', before.id, before, null); return { id: before.id };
    }});
  }

  assignArticleSites(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: assignmentSchema, permission: DASHBOARD_PERMISSIONS.articleManage, action: 'article.sites.assign', targetType: 'article', scope: ['articles', 'regions', 'sites', 'articleSites'], execute: (transaction, value, now) => {
      const article = requireArticleInScope(transaction.state, value.articleId, actor);
      if (article.organizationId !== actor.organizationId) throw new DashboardAccessDeniedError();
      const before = transaction.state.articleSites.filter(({ articleId, active }) => articleId === article.id && active);
      const { after } = this.applySiteAssignment(transaction.state, article, value.siteIds, actor, now);
      const beforeIds = before.map(({ siteId }) => siteId).sort();
      const afterIds = after.map(({ siteId }) => siteId).sort();
      const beforeSet = new Set(beforeIds);
      const afterSet = new Set(afterIds);
      this.audit(
        transaction,
        'article.sites.assign',
        'article',
        article.id,
        assignmentDigest(beforeIds),
        { ...assignmentDigest(afterIds), added: afterIds.filter((siteId) => !beforeSet.has(siteId)), removed: beforeIds.filter((siteId) => !afterSet.has(siteId)) },
      );
      return after;
    }});
  }

  private applySiteAssignment(
    state: MutableTenantState,
    article: ArticleRecord,
    siteIds: readonly string[],
    actor: AuthorizedTenantActorContext,
    now: string,
  ): { after: readonly ArticleSiteRecord[] } {
    const distinct = [...new Set(siteIds)];
    const requested = distinct.map((siteId) => requireSiteInScope(state, siteId, actor));
    if (requested.some(({ organizationId, status }) => organizationId !== actor.organizationId || status !== 'active')) throw new DashboardAccessDeniedError();
    const unresolved = unresolvedCascadeAncestors(state.sites, distinct);
    if (unresolved.length > 0) {
      const missing = [...new Set(unresolved.map((entry) => entry.missing))].map((level) => (level === 'region' ? 'region' : 'apex'));
      throw new DashboardValidationError({ siteIds: [`Rantai portal belum lengkap: ${missing.join(' dan ')} belum tersedia.`] });
    }
    const expanded = distinct.map((siteId) => ({ siteId, site: requireSiteInScope(state, siteId, actor) }));
    if (expanded.some(({ site }) => site.organizationId !== actor.organizationId || site.status !== 'active')) throw new DashboardAccessDeniedError();
    const existingBySite = new Map<string, ArticleSiteRecord>();
    for (let index = 0; index < state.articleSites.length; index += 1) {
      const assignment = state.articleSites[index]!;
      if (assignment.articleId !== article.id) continue;
      const deactivated = { ...assignment, active: false };
      state.articleSites[index] = deactivated;
      existingBySite.set(assignment.siteId, deactivated);
    }
    for (const target of expanded) {
      const existing = existingBySite.get(target.siteId);
      if (existing === undefined) {
        state.articleSites.push({
          ...this.base(actor, now),
          articleId: article.id,
          siteId: target.siteId,
          state: 'queued',
          stateOccurredAt: now,
          publishedUrl: null,
          publishedAt: null,
          active: true,
          viewCount: 0,
          assignmentSource: 'manual',
          expandedFromSiteId: null,
          customCanonicalUrl: null,
        });
      } else {
        Object.assign(existing, { active: true, assignmentSource: 'manual' as const, expandedFromSiteId: null, version: existing.version + 1, updatedAt: now });
      }
    }
    const after = state.articleSites.filter(({ articleId, active }) => articleId === article.id && active);
    return { after };
  }

  setArticleSiteViews(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: siteViewsSchema, permission: DASHBOARD_PERMISSIONS.articleManage, action: 'article.sites.views.set', targetType: 'article_site', scope: ['articles', 'regions', 'sites', 'articleSites'], execute: (transaction, value, now) => {
      const article = requireArticleInScope(transaction.state, value.articleId, actor);
      if (article.organizationId !== actor.organizationId) throw new DashboardAccessDeniedError();
      const site = requireSiteInScope(transaction.state, value.siteId, actor);
      if (site.organizationId !== actor.organizationId) throw new DashboardAccessDeniedError();
      const before = transaction.state.articleSites.find(({ articleId, siteId }) => articleId === value.articleId && siteId === value.siteId);
      if (before === undefined) throw new DashboardConflictError();
      const after = { ...before, viewCount: value.viewCount, version: before.version + 1, updatedAt: now };
      replaceById(transaction.state.articleSites, after);
      this.audit(transaction, 'article.sites.views.set', 'article_site', before.id, { viewCount: before.viewCount }, { viewCount: after.viewCount });
      return after;
    }});
  }

  setArticleSiteViewsMany(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: siteViewsBulkSchema, permission: DASHBOARD_PERMISSIONS.articleManage, action: 'article.sites.views.setMany', targetType: 'article_site', scope: ['articles', 'regions', 'sites', 'articleSites'], execute: (transaction, value, now) => {
      const article = requireArticleInScope(transaction.state, value.articleId, actor);
      if (article.organizationId !== actor.organizationId) throw new DashboardAccessDeniedError();
      const updated: string[] = [];
      const missing: string[] = [];
      for (const siteId of new Set(value.siteIds)) {
        try {
          const site = requireSiteInScope(transaction.state, siteId, actor);
          if (site.organizationId !== actor.organizationId) throw new DashboardAccessDeniedError();
          const before = transaction.state.articleSites.find(({ articleId, siteId: rowSiteId }) => articleId === value.articleId && rowSiteId === siteId);
          if (before === undefined) throw new DashboardConflictError();
          replaceById(transaction.state.articleSites, { ...before, viewCount: value.viewCount, version: before.version + 1, updatedAt: now });
          updated.push(siteId);
        } catch (error) {
          if (error instanceof DashboardAccessDeniedError || error instanceof DashboardConflictError) {
            missing.push(siteId);
            continue;
          }
          throw error;
        }
      }
      this.audit(transaction, 'article.sites.views.setMany', 'article_site', value.articleId, null, { viewCount: value.viewCount, updated: updated.length, missing });
      return { updated: updated.length, missing };
    }});
  }

  async listNetworkArticles(actor: AuthorizedTenantActorContext, siteId: string, rawFilter: unknown = {}) {
    const parsed = articleFilterSchema.safeParse(rawFilter);
    if (!parsed.success) return Promise.resolve(this.invalid(actor, parsed.error));
    const filter = defined(parsed.data) as ArticleFilter;
    try {
      const scope = await this.repository.readNetworkArticlesScope(actor, DASHBOARD_PERMISSIONS.articleRead, siteId, filter);
      this.requireFilterReferences({ regions: scope.regions, sites: [scope.site], categories: scope.categoryIds.map((id) => ({ id })), publishers: scope.publishers, authors: scope.authorIds.map((id) => ({ id })) }, filter, actor);
      return { ok: true as const, value: scope.articles.map((article) => {
        const publisher = article.publisherId === null ? undefined : scope.publishers.find(({ id }) => id === article.publisherId);
        return {
          ...article,
          sourceAttribution: publisher === undefined
            ? { attribution: article.source.trim() === '' ? 'Redaksi' : article.source, independent: false, institutionName: null, claimScopes: [] as readonly string[] }
            : buildNetworkPublisherClaim(publisher, scope.affiliations, siteId),
        };
      }) };
    } catch (error) {
      if (error instanceof DashboardAccessDeniedError) return this.denied(actor, 'public_content.list', 'article');
      return this.internal(actor, error, 'dashboard.query.failed', 'public_content.list', 'article', DASHBOARD_PERMISSIONS.articleRead);
    }
  }

  dashboard(actor: AuthorizedTenantActorContext): Promise<Result<DashboardProjection, PublicErrorEnvelope>> {
    return this.dashboardCounts(actor);
  }

  private async dashboardCounts(actor: AuthorizedTenantActorContext): Promise<Result<DashboardProjection, PublicErrorEnvelope>> {
    try {
      return { ok: true, value: await this.repository.dashboardCounts(actor, DASHBOARD_PERMISSIONS.dashboardRead) };
    } catch (error) {
      if (error instanceof DashboardAccessDeniedError) return this.denied(actor, 'dashboard.read', 'dashboard');
      return this.internal(actor, error, 'dashboard.query.failed', 'dashboard.read', 'dashboard', DASHBOARD_PERMISSIONS.dashboardRead);
    }
  }

  analytics(actor: AuthorizedTenantActorContext, rawFilter: unknown = {}): Promise<Result<AnalyticsProjection, PublicErrorEnvelope>> {
    const parsed = analyticsFilterSchema.safeParse(rawFilter);
    if (!parsed.success) return Promise.resolve(this.invalid(actor, parsed.error));
    return this.summarize(actor, 'analytics.read', 'analytics', (repository) =>
      repository.analyticsSummary(actor, DASHBOARD_PERMISSIONS.analyticsRead, parsed.data));
  }

  async auditLogs(actor: AuthorizedTenantActorContext, rawFilter: unknown = {}): Promise<Result<{ readonly auditLogs: readonly AuditRecord[]; readonly auditNextCursor: string | null; readonly retentionRuns: readonly RetentionRunRecord[] }, PublicErrorEnvelope>> {
    const parsed = auditFilterSchema.safeParse(rawFilter);
    if (!parsed.success) return Promise.resolve(this.invalid(actor, parsed.error));
    try {
      const [page, retentionRuns] = await Promise.all([
        this.repository.auditLogPage(actor, DASHBOARD_PERMISSIONS.auditRead, defined(parsed.data) as AuditFilter, defined(parsed.data) as { limit?: number; cursor?: string }),
        this.repository.retentionRuns(actor, DASHBOARD_PERMISSIONS.auditRead),
      ]);
      return { ok: true, value: { auditLogs: page.logs, auditNextCursor: page.nextCursor, retentionRuns } };
    } catch (error) {
      if (error instanceof DashboardAccessDeniedError) return this.denied(actor, 'audit.list', 'audit_log');
      return this.internal(actor, error, 'dashboard.query.failed', 'audit.list', 'audit_log', DASHBOARD_PERMISSIONS.auditRead);
    }
  }

  async operations(actor: AuthorizedTenantActorContext): Promise<Result<OperationsProjection, PublicErrorEnvelope>> {
    return this.summarize(actor, 'operations.read', 'operations', (repository) =>
      repository.operationsSummary(actor, DASHBOARD_PERMISSIONS.auditRead));
  }

  async createInvitation(actor: AuthorizedTenantActorContext, raw: unknown): Promise<Result<{ readonly id: string }, PublicErrorEnvelope>> {
    const parsed = invitationCreateSchema.safeParse(raw);
    if (!parsed.success) return this.invalid(actor, parsed.error);
    try {
      const value = await this.repository.createInvitation(actor, DASHBOARD_PERMISSIONS.membershipManage, {
        email: parsed.data.email,
        roleId: parsed.data.roleId,
        tokenHash: parsed.data.tokenHash,
      });
      return { ok: true, value };
    } catch (error) {
      if (error instanceof DashboardAccessDeniedError) return this.denied(actor, 'invitation.create', 'invitation');
      if (error instanceof DashboardConflictError) return { ok: false, error: createPublicError('CONFLICT', error.message, actor.requestId) };
      if (error instanceof DashboardSubscriptionInactiveError) return { ok: false, error: createPublicError('FORBIDDEN', 'Langganan tidak aktif. Hubungi administrator agar dapat melanjutkan perubahan.', actor.requestId) };
      return this.internal(actor, error, 'dashboard.mutation.failed', 'invitation.create', 'invitation', DASHBOARD_PERMISSIONS.membershipManage);
    }
  }

  async revokeInvitation(actor: AuthorizedTenantActorContext, raw: unknown): Promise<Result<{ readonly id: string }, PublicErrorEnvelope>> {
    const parsed = invitationRevokeSchema.safeParse(raw);
    if (!parsed.success) return this.invalid(actor, parsed.error);
    try {
      const value = await this.repository.revokeInvitation(actor, DASHBOARD_PERMISSIONS.membershipManage, { id: parsed.data.id });
      return { ok: true, value };
    } catch (error) {
      if (error instanceof DashboardAccessDeniedError) return this.denied(actor, 'invitation.revoke', 'invitation');
      if (error instanceof DashboardConflictError) return { ok: false, error: createPublicError('CONFLICT', error.message, actor.requestId) };
      if (error instanceof DashboardSubscriptionInactiveError) return { ok: false, error: createPublicError('FORBIDDEN', 'Langganan tidak aktif. Hubungi administrator agar dapat melanjutkan perubahan.', actor.requestId) };
      return this.internal(actor, error, 'dashboard.mutation.failed', 'invitation.revoke', 'invitation', DASHBOARD_PERMISSIONS.membershipManage);
    }
  }

  private async summarize<T>(
    actor: AuthorizedTenantActorContext,
    action: string,
    targetType: string,
    run: (repository: DashboardRepository) => Promise<T>,
  ): Promise<Result<T, PublicErrorEnvelope>> {
    try {
      return { ok: true, value: await run(this.repository) };
    } catch (error) {
      if (error instanceof DashboardAccessDeniedError) return this.denied(actor, action, targetType);
      return this.internal(actor, error, 'dashboard.query.failed', action, targetType);
    }
  }
}
