import type { z } from 'zod';

import type { AuthorizedTenantActorContext } from '@/core/operation-context';
import type {
  ActivationAttemptRecord, AnalyticsProjection, ArticleFilter, ArticleRecord, ArticleSiteRecord, AuditFilter, AuditRecord, AuthorRecord, CategoryRecord,
  DashboardProjection, DomainRecord, EditorialSummaries, EditorialSummaryArticle, InvitationSummary, MembershipRecord, OfficialAffiliationRecord, OperationsProjection, PublisherRecord, NetworkPublisherClaim,
  RegionRecord, RetentionRunRecord, RoleListItem, RoleRecord, SiteLevel, SiteRecord, SiteSettingsRecord, DashboardTenantState,
} from '@/modules/dashboard/models';
import { DASHBOARD_PERMISSIONS } from '@/modules/dashboard/permissions';
import {
  buildNetworkPublisherClaim, filterArticles, selectNetworkArticles,
} from '@/modules/dashboard/policies';
import type { IdentifierGenerator } from '@/core/system/ports';
import { allocateUniqueSlug } from '@/modules/site/slug-allocator';
import { expandCascadeSites } from '@/modules/site/site-cascade';
import { regionScopeCovers, type ScopeGeography } from '@/modules/site/region-scope';
import { validateTipTapDoc } from '@/modules/site/tiptap-document';
import {
  DashboardAccessDeniedError, DashboardConflictError, DashboardRateLimitedError, DashboardSubscriptionInactiveError, type MutableTenantState, type DashboardRepository, type DashboardTransaction,
} from '@/modules/dashboard/ports';
import { createNonDisclosingDenial, createPublicError, type PublicErrorEnvelope } from '@/core/errors';
import { logEvent } from '@/core/observability/logger';
import type { Result } from '@/core/result';
import {
  affiliationSchema, affiliationUpdateSchema, analyticsFilterSchema, articleCreateSchema, articleFilterSchema, articleTransitionSchema, articleUpdateSchema, assignmentSchema,
  auditFilterSchema, authorCreateSchema, authorUpdateSchema, categoryCreateSchema, categoryDeleteSchema, categoryUpdateSchema,
  domainCreateSchema, domainUpdateSchema, invitationCreateSchema, invitationRevokeSchema, isKnownTemplateId, membershipSchema, publisherCreateSchema, publisherDecisionSchema,
  publisherUpdateSchema, regionCreateSchema, regionUpdateSchema, roleCreateSchema, roleUpdateSchema,
  siteCreateSchema, siteSettingsSchema, siteUpdateSchema, siteViewsSchema, siteCachePurgeSchema, tagRemoveSchema, tagRenameSchema,
} from '@/modules/dashboard/schemas';

interface ClockLike { now(): Date }
interface VersionInput { readonly id: string; readonly expectedVersion: number }
class DashboardValidationError extends Error {
  constructor(readonly fields: Readonly<Record<string, readonly string[]>>) { super('Dashboard validation failed'); }
}

function fieldErrors(error: z.ZodError): Readonly<Record<string, readonly string[]>> {
  const output: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.') || 'request';
    output[path] = [...(output[path] ?? []), issue.message];
  }
  return output;
}

function changedFields(before: Readonly<Record<string, unknown>>, after: Readonly<Record<string, unknown>>): readonly string[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys].filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key])).sort();
}

function publicRecord(value: object): Readonly<Record<string, unknown>> {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !['createdAt', 'updatedAt'].includes(key)));
}

function roleJson(role: RoleRecord): RoleListItem {
  return { ...role, permissions: [...role.permissions] };
}

function defined<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;
}

/** Batas panjang pesan agar satu error tidak membanjiri telemetry. */
const ERROR_MESSAGE_LIMIT = 300;

/** Kedalaman rantai `cause` yang ditelusuri. */
const ERROR_CAUSE_DEPTH = 4;

/**
 * Klasifikasikan satu error untuk log lewat nama konstruktor aslinya.
 *
 * @param error - Error yang ditangkap dari lapisan repositori.
 * @returns Nama konstruktor, atau `NonError` bila bukan objek Error.
 * @remarks `error.name` saja tidak cukup. Drizzle dan `TypeError` sama-sama
 * bisa melaporkan `name` sebagai `Error`, sehingga setiap kegagalan terlihat
 * identik di log. Nama konstruktor yang membedakan keduanya.
 */
function errorIdentity(error: unknown): string {
  if (!(error instanceof Error)) return 'NonError';
  return error.constructor.name === 'Object' ? 'Error' : error.constructor.name;
}

/**
 * Ambil metadata driver yang aman-log dari seluruh rantai penyebab.
 *
 * @param error - Error yang ditangkap dari lapisan repositori.
 * @returns Field log dari rantai `cause` (`code`, `table`, `column`,
 * `constraint`), diambil dari lapisan terdalam yang punya nilai.
 * @remarks Pesan, `detail`, dan argumen query tidak pernah ikut agar PII
 * tidak bocor ke telemetry. Menelusuri `cause` penting karena
 * `DrizzleQueryError` menyimpan error Postgres di sana, sehingga `code` asli
 * sebelumnya hilang dari log.
 */
function driverErrorContext(error: Error): { readonly [key: string]: string } {
  const fields: Record<string, string> = {};
  const seen = new Set<unknown>();
  let current: unknown = error;
  for (let depth = 0; depth < ERROR_CAUSE_DEPTH; depth += 1) {
    if (typeof current !== 'object' || current === null || seen.has(current)) break;
    seen.add(current);
    const record = current as Record<string, unknown>;
    for (const key of ['code', 'table', 'column', 'constraint'] as const) {
      const value = record[key];
      if (typeof value === 'string' && value !== '' && fields[key] === undefined) {
        fields[key] = value.slice(0, ERROR_MESSAGE_LIMIT);
      }
    }
    current = record.cause;
  }
  return fields;
}

/**
 * Ambil pesan error yang aman-log.
 *
 * @param error - Error yang ditangkap dari lapisan repositori.
 * @returns Potongan pesan, atau `undefined` bila error berasal dari driver.
 * @remarks Error yang dilempar kode aplikasi sendiri, misalnya
 * `schema_gate_unsatisfied: applied=... required=...`, hanya memuat nomor
 * versi dan aman dicatat. Pesan itulah satu-satunya petunjuk yang membuat
 * kegagalan bisa ditindaklanjuti. Error dari driver Postgres tidak ikut karena
 * `message`-nya bisa memuat constraint, kolom, dan cuplikan baris;
 * `errorIdentity` sudah menjembatani kasus itu.
 */
function safeErrorMessage(error: unknown): string | undefined {
  if (!(error instanceof Error)) return undefined;
  const driverFields = ['code', 'constraint', 'table', 'column', 'severity', 'detail'];
  const record = error as unknown as Record<string, unknown>;
  if (driverFields.some((key) => typeof record[key] === 'string')) return undefined;
  const message = error.message.trim();
  if (message === '') return undefined;
  return message.length > ERROR_MESSAGE_LIMIT ? `${message.slice(0, ERROR_MESSAGE_LIMIT)}…` : message;
}

function requireRecord<T extends { readonly id: string }>(values: readonly T[], id: string): T {
  const value = values.find((candidate) => candidate.id === id);
  if (value === undefined) throw new DashboardAccessDeniedError();
  return value;
}

function requireVersion<T extends { readonly version: number }>(value: T, expected: number): void {
  if (value.version !== expected) throw new DashboardConflictError();
}

function regionLock(actor: AuthorizedTenantActorContext): string | null {
  return actor.regionScopeId ?? null;
}

/**
 * Group notification port invoked by the article service when a draft is created.
 *
 * @remarks The implementation never throws: queue failures are only
 * telemetry so article writes never fail because of notifications.
 */
export interface ArticleCreatedNotifier {
  notifyArticleCreated(input: { readonly organizationId: string; readonly articleId: string; readonly title: string }): Promise<void>;
}

function requireUnrestrictedRegion(actor: AuthorizedTenantActorContext): void {
  if (regionLock(actor) !== null) throw new DashboardAccessDeniedError();
}

function requireSiteInScope(state: DashboardTenantState, siteId: string, actor: AuthorizedTenantActorContext): SiteRecord {
  const site = requireRecord(state.sites, siteId);
  if (!regionScopeCovers(regionLock(actor), site.regionId, state.regions)) throw new DashboardAccessDeniedError();
  return site;
}

function requireArticleInScope(state: DashboardTenantState, articleId: string, actor: AuthorizedTenantActorContext): ArticleRecord {
  const article = requireRecord(state.articles, articleId);
  if (!regionScopeCovers(regionLock(actor), article.regionId, state.regions)) throw new DashboardAccessDeniedError();
  return article;
}

function requireLockedRegionValue(state: DashboardTenantState, actor: AuthorizedTenantActorContext, regionId: string): void {
  if (!regionScopeCovers(regionLock(actor), regionId, state.regions)) throw new DashboardAccessDeniedError();
}

function requireValidBodyJson(value: unknown): Record<string, unknown> | null {
  if (value === undefined || value === null) return null;
  const result = validateTipTapDoc(value);
  if (!result.ok) throw new DashboardValidationError({ bodyJson: [`Dokumen teks kaya tidak valid (${result.reason}).`] });
  return result.doc as unknown as Record<string, unknown>;
}

function normalizeHostnameCandidate(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/gu, '');
}

function requirePublisherNameAvailable(
  state: { readonly sites: readonly { readonly normalizedHostname: string }[]; readonly domains: readonly { readonly normalizedHostname: string }[] },
  name: string,
): void {
  const folded = normalizeHostnameCandidate(name);
  if (folded === '') return;
  const matches = (hostname: string): boolean => {
    const clean = hostname.toLowerCase().trim();
    if (normalizeHostnameCandidate(clean) === folded) return true;
    return false;
  };
  const domainLabels = state.domains.map((domain) => domain.normalizedHostname.toLowerCase().trim().split('.')[0] ?? '');
  if (state.sites.some((site) => matches(site.normalizedHostname)) || state.domains.some((domain) => matches(domain.normalizedHostname)) || domainLabels.some((label) => label !== '' && normalizeHostnameCandidate(label) === folded)) {
    throw new DashboardValidationError({ name: ['Nama menyerupai domain/situs tenant; gunakan nama institusi resmi.'] });
  }
}

function siteInScope(site: { readonly regionId: string | null }, lock: string | null, geography: readonly ScopeGeography[]): boolean {
  return regionScopeCovers(lock, site.regionId, geography);
}

const SITE_LEVEL_RANK: Readonly<Record<SiteLevel, number>> = Object.freeze({ apex: 0, region: 1, city: 2 });

const CONFIGURATION_SITE_LIMIT = 200;

function articleInScope(article: { readonly regionId: string }, lock: string | null, geography: readonly ScopeGeography[]): boolean {
  return regionScopeCovers(lock, article.regionId, geography);
}

function replaceById<T extends { readonly id: string }>(values: T[], next: T): void {
  const index = values.findIndex(({ id }) => id === next.id);
  if (index < 0) throw new DashboardAccessDeniedError();
  values[index] = next;
}

export class TenantBusinessService {
  constructor(
    private readonly repository: DashboardRepository,
    private readonly identifiers: IdentifierGenerator,
    private readonly clock: ClockLike = { now: () => new Date() },
    private readonly notifier: ArticleCreatedNotifier | null = null,
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

  private async query<T>(actor: AuthorizedTenantActorContext, permission: string, action: string, targetType: string, project: (state: DashboardTenantState) => T): Promise<Result<T, PublicErrorEnvelope>> {
    try {
      return { ok: true, value: project(await this.repository.read(actor, permission)) };
    } catch (error) {
      if (error instanceof DashboardAccessDeniedError) return this.denied(actor, action, targetType);
      return this.internal(actor, error, 'dashboard.query.failed', action, targetType, permission);
    }
  }

  private async mutate<Input, Output>(input: {
    actor: AuthorizedTenantActorContext; permission: string; action: string; targetType: string; schema: z.ZodType<Input>; raw: unknown;
    execute: (transaction: DashboardTransaction, value: Input, now: string) => Output | Promise<Output>;
  }): Promise<Result<Output, PublicErrorEnvelope>> {
    const parsed = input.schema.safeParse(input.raw);
    if (!parsed.success) return this.invalid(input.actor, parsed.error);
    try {
      const value = await this.repository.execute(input.actor, input.permission, (transaction) => input.execute(transaction, parsed.data, this.clock.now().toISOString()));
      return { ok: true, value };
    } catch (error) {
      if (error instanceof DashboardValidationError) return { ok: false, error: createPublicError('INVALID_INPUT', 'Please correct the highlighted fields.', input.actor.requestId, error.fields) };
      if (error instanceof DashboardAccessDeniedError) return this.denied(input.actor, input.action, input.targetType);
      if (error instanceof DashboardSubscriptionInactiveError) return { ok: false, error: createPublicError('FORBIDDEN', 'Langganan tidak aktif. Hubungi administrator agar dapat melanjutkan perubahan.', input.actor.requestId) };
      if (error instanceof DashboardConflictError) return { ok: false, error: createPublicError('CONFLICT', error.message, input.actor.requestId) };
      return this.internal(input.actor, error, 'dashboard.mutation.failed', input.action, input.targetType, input.permission);
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
      let state: DashboardTenantState | null = null;
      for (const permission of candidates) {
        try {
          state = await this.repository.read(actor, permission);
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
    return this.mutate({ actor, raw, schema: domainCreateSchema, permission: DASHBOARD_PERMISSIONS.domainManage, action: 'domain.create', targetType: 'domain', execute: (transaction, value, now) => {
      requireUnrestrictedRegion(actor);
      if (transaction.state.domains.some(({ normalizedHostname }) => normalizedHostname === value.normalizedHostname)) throw new DashboardConflictError();
      const record: DomainRecord = { ...this.base(actor, now), ...value, cloudflareZoneId: null, routingVersion: 1 };
      transaction.state.domains.push(record); this.audit(transaction, 'domain.create', 'domain', record.id, null, record); return record;
    }});
  }

  updateDomain(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: domainUpdateSchema, permission: DASHBOARD_PERMISSIONS.domainManage, action: 'domain.update', targetType: 'domain', execute: (transaction, value, now) => {
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
    return this.mutate({ actor, raw, schema: regionCreateSchema, permission: DASHBOARD_PERMISSIONS.regionManage, action: 'region.create', targetType: 'region', execute: (transaction, value, now) => {
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
    return this.mutate({ actor, raw, schema: regionUpdateSchema, permission: DASHBOARD_PERMISSIONS.regionManage, action: 'region.update', targetType: 'region', execute: (transaction, value, now) => {
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
    return this.mutate({ actor, raw, schema: siteCreateSchema, permission: DASHBOARD_PERMISSIONS.siteManage, action: 'site.create', targetType: 'site', execute: (transaction, value, now) => {
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
    return this.mutate({ actor, raw, schema: siteUpdateSchema, permission: DASHBOARD_PERMISSIONS.siteManage, action: 'site.update', targetType: 'site', execute: (transaction, value, now) => {
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
    return this.mutate({ actor, raw, schema: siteSettingsSchema, permission: DASHBOARD_PERMISSIONS.siteManage, action: 'site.settings.update', targetType: 'site_settings', execute: (transaction, value, now) => {
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
        ? { ...this.base(actor, now), siteId: value.siteId, id: value.siteId, name: value.name, description: value.description, tagline, seoDefaultTitle, seoDefaultDescription, seoOpenGraphSiteName, locale, seoRobotsDirective, colors: value.colors ?? {}, socialLinks: value.socialLinks ?? {}, seo: value.seo ?? {}, navigation: value.navigation ?? [], logoMediaId, faviconMediaId, defaultMediaId, version: 1 }
        : { ...before, name: value.name, description: value.description, tagline, seoDefaultTitle, seoDefaultDescription, seoOpenGraphSiteName, locale, seoRobotsDirective, colors: value.colors ?? before.colors, socialLinks: value.socialLinks ?? before.socialLinks, seo: value.seo ?? before.seo, navigation: value.navigation ?? before.navigation, logoMediaId, faviconMediaId, defaultMediaId, version: before.version + 1, updatedAt: now };
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
    return this.mutate({ actor, raw, schema: roleCreateSchema, permission: DASHBOARD_PERMISSIONS.roleManage, action: 'role.create', targetType: 'role', execute: (transaction, value, now) => {
      requireUnrestrictedRegion(actor);
      if (transaction.state.roles.some(({ name }) => name.toLowerCase() === value.name.toLowerCase())) throw new DashboardConflictError();
      const record: RoleRecord = { ...this.base(actor, now), name: value.name, tier: value.tier, active: value.active, permissions: new Set(value.permissions) };
      transaction.state.roles.push(record); this.audit(transaction, 'role.create', 'role', record.id, null, { ...record, permissions: [...record.permissions] }); return roleJson(record);
    }});
  }

  updateRole(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: roleUpdateSchema, permission: DASHBOARD_PERMISSIONS.roleManage, action: 'role.update', targetType: 'role', execute: (transaction, value, now) => {
      requireUnrestrictedRegion(actor);
      const before = requireRecord(transaction.state.roles, value.id); requireVersion(before, value.expectedVersion);
      const after: RoleRecord = { ...before, name: value.name, tier: value.tier ?? before.tier, active: value.active, permissions: new Set(value.permissions), version: before.version + 1, updatedAt: now };
      replaceById(transaction.state.roles, after); this.audit(transaction, 'role.update', 'role', after.id, { ...before, permissions: [...before.permissions] }, { ...after, permissions: [...after.permissions] }); return roleJson(after);
    }});
  }

  saveMembership(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: membershipSchema, permission: DASHBOARD_PERMISSIONS.membershipManage, action: 'membership.update', targetType: 'membership', execute: async (transaction, value, now) => {
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

  async listPublishers(actor: AuthorizedTenantActorContext) {
    try {
      const state = await this.repository.read(actor, DASHBOARD_PERMISSIONS.publisherRead);
      const visibleSites = actor.permissionSet.has(DASHBOARD_PERMISSIONS.siteRead)
        ? state.sites.filter((site) => siteInScope(site, regionLock(actor), state.regions))
        : [];
      return { ok: true as const, value: { publishers: state.publishers, affiliations: state.affiliations, sites: visibleSites } };
    } catch (error) {
      if (error instanceof DashboardAccessDeniedError) return this.denied(actor, 'publisher.list', 'publisher');
      return this.internal(actor, error, 'dashboard.query.failed', 'publisher.list', 'publisher', DASHBOARD_PERMISSIONS.publisherRead);
    }
  }

  createPublisher(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: publisherCreateSchema, permission: DASHBOARD_PERMISSIONS.publisherManage, action: 'publisher.create', targetType: 'publisher', execute: (transaction, value, now) => {
      requirePublisherNameAvailable(transaction.state, value.name);
      const record: PublisherRecord = { ...this.base(actor, now), ...value, verificationStatus: 'unverified', submittedBy: null, submittedAt: null, verifiedBy: null, verifiedAt: null, rejectionReason: null, status: 'active' };
      transaction.state.publishers.push(record); this.audit(transaction, 'publisher.create', 'publisher', record.id, null, record); return record;
    }});
  }

  updatePublisher(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: publisherUpdateSchema, permission: DASHBOARD_PERMISSIONS.publisherManage, action: 'publisher.update', targetType: 'publisher', execute: (transaction, value, now) => {
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
    return this.mutate({ actor, raw, schema: publisherDecisionSchema, permission, action: `publisher.${decision}`, targetType: 'publisher', execute: (transaction, value, now) => {
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
    return this.mutate({ actor, raw, schema: affiliationSchema, permission: DASHBOARD_PERMISSIONS.publisherVerify, action: 'affiliation.create', targetType: 'official_affiliation', execute: (transaction, value, now) => {
      const publisher = requireRecord(transaction.state.publishers, value.publisherId); requireSiteInScope(transaction.state, value.siteId, actor);
      if (publisher.verificationStatus !== 'verified') throw new DashboardAccessDeniedError();
      const record: OfficialAffiliationRecord = { ...this.base(actor, now), ...value, active: true, verifiedAt: now };
      transaction.state.affiliations.push(record); this.audit(transaction, 'affiliation.create', 'official_affiliation', record.id, null, record); return record;
    }});
  }

  updateAffiliation(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: affiliationUpdateSchema, permission: DASHBOARD_PERMISSIONS.publisherVerify, action: 'affiliation.update', targetType: 'official_affiliation', execute: (transaction, value, now) => {
      const before = requireRecord(transaction.state.affiliations, value.id); requireVersion(before, value.expectedVersion);
      const publisher = requireRecord(transaction.state.publishers, before.publisherId); requireSiteInScope(transaction.state, before.siteId, actor);
      if (value.active && publisher.verificationStatus !== 'verified') throw new DashboardAccessDeniedError();
      const after: OfficialAffiliationRecord = { ...before, institutionName: value.institutionName, claimScopes: value.claimScopes, evidenceReference: value.evidenceReference, active: value.active, verifiedAt: value.active ? now : before.verifiedAt, version: before.version + 1, updatedAt: now };
      replaceById(transaction.state.affiliations, after); this.audit(transaction, 'affiliation.update', 'official_affiliation', after.id, before, after); return after;
    }});
  }

  getPublisherClaim(actor: AuthorizedTenantActorContext, publisherId: string, siteId: string): Promise<Result<NetworkPublisherClaim, PublicErrorEnvelope>> {
    return this.query(actor, DASHBOARD_PERMISSIONS.publisherRead, 'publisher.claim.read', 'publisher', (state) => buildNetworkPublisherClaim(requireRecord(state.publishers, publisherId), state.affiliations, siteId));
  }

  createCategory(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: categoryCreateSchema, permission: DASHBOARD_PERMISSIONS.articleManage, action: 'category.create', targetType: 'category', execute: (transaction, value, now) => {
      if (transaction.state.categories.some(({ slug }) => slug === value.slug)) throw new DashboardConflictError();
      const record: CategoryRecord = { ...this.base(actor, now), ...value }; transaction.state.categories.push(record); this.audit(transaction, 'category.create', 'category', record.id, null, record); return record;
    }});
  }

  updateCategory(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: categoryUpdateSchema, permission: DASHBOARD_PERMISSIONS.articleManage, action: 'category.update', targetType: 'category', execute: (transaction, value, now) => {
      const before = requireRecord(transaction.state.categories, value.id); requireVersion(before, value.expectedVersion);
      const after: CategoryRecord = { ...before, name: value.name, slug: value.slug, status: value.status, version: before.version + 1, updatedAt: now };
      replaceById(transaction.state.categories, after); this.audit(transaction, 'category.update', 'category', after.id, before, after); return after;
    }});
  }

  deleteCategory(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: categoryDeleteSchema, permission: DASHBOARD_PERMISSIONS.articleManage, action: 'category.delete', targetType: 'category', execute: (transaction, value, now) => {
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
    return this.mutate({ actor, raw, schema: tagRenameSchema, permission: DASHBOARD_PERMISSIONS.articleManage, action: 'tag.rename', targetType: 'article', execute: (transaction, value, now) => {
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
    return this.mutate({ actor, raw, schema: tagRemoveSchema, permission: DASHBOARD_PERMISSIONS.articleManage, action: 'tag.remove', targetType: 'article', execute: (transaction, value, now) => {
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

  listTaxonomy(actor: AuthorizedTenantActorContext) {
    return this.query(actor, DASHBOARD_PERMISSIONS.articleRead, 'taxonomy.list', 'taxonomy', (state) => {
      const lock = regionLock(actor);
      const articles = state.articles.filter((article) => articleInScope(article, lock, state.regions));
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
      return {
        categories: state.categories.map((category) => ({ ...category, articleCount: categoryCounts.get(category.id) ?? 0 })),
        tags: [...tagCounts.entries()]
          .map(([tag, count]) => ({ tag, count }))
          .sort((left, right) => right.count - left.count || left.tag.localeCompare(right.tag)),
      };
    });
  }

  createAuthor(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: authorCreateSchema, permission: DASHBOARD_PERMISSIONS.articleManage, action: 'author.create', targetType: 'author', execute: (transaction, value, now) => {
      const record: AuthorRecord = { ...this.base(actor, now), ...value }; transaction.state.authors.push(record); this.audit(transaction, 'author.create', 'author', record.id, null, record); return record;
    }});
  }

  updateAuthor(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: authorUpdateSchema, permission: DASHBOARD_PERMISSIONS.articleManage, action: 'author.update', targetType: 'author', execute: (transaction, value, now) => {
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
    return this.query(actor, DASHBOARD_PERMISSIONS.articleRead, 'article.list', 'article', (state) => {
      this.requireFilterReferences(state, filter, actor);
      const lock = regionLock(actor);
      const regions = state.regions.filter((region) => regionScopeCovers(lock, region.id, state.regions));
      const sites = state.sites.filter((site) => siteInScope(site, lock, state.regions));
      const scoped = { ...state, regions, sites, articles: state.articles.filter((article) => articleInScope(article, lock, state.regions)) };
      const articles = filterArticles(scoped, filter);
      const articleIds = new Set(articles.map(({ id }) => id));
      const siteIds = new Set(sites.map(({ id }) => id));
      const scopeRegion = lock === null ? null : regions.find(({ id }) => id === lock);
      const referencedDomainIds = new Set(sites.map((site) => site.domainId).filter((domainId): domainId is string => typeof domainId === 'string'));
      return {
        articles, categories: state.categories, authors: state.authors,
        publishers: state.publishers.map(({ id, name, attributionLabel, status }) => ({ id, name, attributionLabel, status })), regions, sites,
        domains: (state.domains ?? []).filter((domain) => referencedDomainIds.has(domain.id)).map(({ id, normalizedHostname }) => ({ id, normalizedHostname })),
        articleSites: state.articleSites.filter(({ articleId, siteId }) => articleIds.has(articleId) || siteIds.has(siteId)),
        regionScope: scopeRegion === undefined || scopeRegion === null ? null : { id: scopeRegion.id, name: scopeRegion.name },
      };
    });
  }

  async createArticle(actor: AuthorizedTenantActorContext, raw: unknown) {
    const result = await this.mutate({ actor, raw, schema: articleCreateSchema, permission: DASHBOARD_PERMISSIONS.articleManage, action: 'article.create', targetType: 'article', execute: (transaction, value, now) => {
      this.requireArticleReferences(transaction.state, value);
      requireLockedRegionValue(transaction.state, actor, value.regionId);
      const slug = allocateUniqueSlug(transaction.state.articles.map(({ slug }) => slug), value.slug);
      const distinctCategoryIds = [...new Set(value.categoryIds ?? [])];
      const leadMediaId = this.requireActiveMedia(transaction, value.leadMediaId ?? null, null, 'leadMediaId', 'article-cover');
      const record: ArticleRecord = { ...this.base(actor, now), ...value, slug, categoryId: distinctCategoryIds[0] ?? null, categoryIds: distinctCategoryIds, leadMediaId, coverImageUrl: value.coverImageUrl ?? null, excerpt: value.excerpt ?? null, canonicalUrl: value.canonicalUrl ?? null, bodyJson: requireValidBodyJson(value.bodyJson), scheduledAt: value.scheduledAt ?? null, publishedAt: null, archivedAt: null };
      transaction.state.articles.push(record); this.syncArticleCategories(transaction.state, record.id, distinctCategoryIds); this.audit(transaction, 'article.create', 'article', record.id, null, record);
      const lock = regionLock(actor);
      const autoSiteIds = transaction.state.sites
        .filter((site) => site.organizationId === actor.organizationId && site.status === 'active' && site.activationState === 'active' && siteInScope(site, lock, transaction.state.regions))
        .map(({ id }) => id);
      if (autoSiteIds.length > 0) {
        const { after, expandedFrom } = this.applySiteAssignment(transaction.state, record, autoSiteIds, actor, now);
        this.audit(transaction, 'article.sites.assign', 'article', record.id, { siteIds: [] as string[] }, { siteIds: after.map(({ siteId }) => siteId).sort(), expanded: expandedFrom });
      }
      return record;
    }});
    if (result.ok && this.notifier !== null) {
      try {
        await this.notifier.notifyArticleCreated({ organizationId: actor.organizationId, articleId: result.value.id, title: result.value.title });
      } catch { /* best-effort notification: queue failure does not fail the write */ }
    }
    return result;
  }

  updateArticle(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: articleUpdateSchema, permission: DASHBOARD_PERMISSIONS.articleManage, action: 'article.update', targetType: 'article', execute: (transaction, value, now) => {
      this.requireArticleReferences(transaction.state, value);
      const before = requireRecord(transaction.state.articles, value.id); requireVersion(before, value.expectedVersion);
      requireArticleInScope(transaction.state, before.id, actor);
      requireLockedRegionValue(transaction.state, actor, value.regionId);
      if (value.slug !== before.slug && transaction.state.articles.some(({ id, slug }) => id !== value.id && slug === value.slug)) throw new DashboardConflictError();
      const existingCategoryIds = transaction.state.articleCategories.filter((row) => row.articleId === value.id).sort((a, b) => a.position - b.position).map((row) => row.categoryId);
      const distinctCategoryIds = value.categoryIds === undefined
        ? (value.categoryId === before.categoryId ? existingCategoryIds : (value.categoryId === null ? [] : [value.categoryId]))
        : [...new Set(value.categoryIds)];
      const leadMediaId = this.requireActiveMedia(transaction, value.leadMediaId, before.leadMediaId ?? null, 'leadMediaId', 'article-cover');
      const after: ArticleRecord = { ...before, regionId: value.regionId, publisherId: value.publisherId, categoryId: distinctCategoryIds[0] ?? null, categoryIds: distinctCategoryIds, authorId: value.authorId, leadMediaId, coverImageUrl: value.coverImageUrl === undefined ? before.coverImageUrl : (value.coverImageUrl ?? null), slug: value.slug, title: value.title, excerpt: value.excerpt ?? null, canonicalUrl: value.canonicalUrl ?? null, body: value.body, bodyJson: value.bodyJson === undefined ? before.bodyJson : requireValidBodyJson(value.bodyJson), source: value.source, tags: [...value.tags], status: value.status, scheduledAt: value.scheduledAt ?? null, version: before.version + 1, updatedAt: now };
      replaceById(transaction.state.articles, after); this.syncArticleCategories(transaction.state, after.id, distinctCategoryIds); this.audit(transaction, 'article.update', 'article', after.id, before, after); return after;
    }});
  }

  private requireFilterReferences(state: DashboardTenantState, filter: ArticleFilter, actor?: AuthorizedTenantActorContext): void {
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

  private requireArticleReferences(state: MutableTenantState, value: { regionId: string; publisherId: string | null; categoryId: string | null; categoryIds?: readonly string[] | undefined; authorId: string | null }): void {
    if (requireRecord(state.regions, value.regionId).status !== 'active') throw new DashboardAccessDeniedError();
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

  archiveArticle(actor: AuthorizedTenantActorContext, raw: unknown) { return this.transitionArticle(actor, raw, 'archived'); }
  restoreArticle(actor: AuthorizedTenantActorContext, raw: unknown) { return this.transitionArticle(actor, raw, 'draft'); }
  private transitionArticle(actor: AuthorizedTenantActorContext, raw: unknown, status: 'archived' | 'draft') {
    const action = status === 'archived' ? 'article.archive' : 'article.restore';
    return this.mutate({ actor, raw, schema: articleTransitionSchema, permission: DASHBOARD_PERMISSIONS.articleManage, action, targetType: 'article', execute: (transaction, value: VersionInput, now) => {
      const before = requireArticleInScope(transaction.state, value.id, actor); requireVersion(before, value.expectedVersion);
      const after: ArticleRecord = { ...before, status, archivedAt: status === 'archived' ? now : null, version: before.version + 1, updatedAt: now };
      replaceById(transaction.state.articles, after); this.audit(transaction, action, 'article', after.id, before, after); return after;
    }});
  }

  assignArticleSites(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: assignmentSchema, permission: DASHBOARD_PERMISSIONS.articleManage, action: 'article.sites.assign', targetType: 'article', execute: (transaction, value, now) => {
      const article = requireArticleInScope(transaction.state, value.articleId, actor);
      if (article.organizationId !== actor.organizationId) throw new DashboardAccessDeniedError();
      const before = transaction.state.articleSites.filter(({ articleId, active }) => articleId === article.id && active);
      const { after, expandedFrom } = this.applySiteAssignment(transaction.state, article, value.siteIds, actor, now);
      this.audit(transaction, 'article.sites.assign', 'article', article.id, { siteIds: before.map(({ siteId }) => siteId).sort() }, { siteIds: after.map(({ siteId }) => siteId).sort(), expanded: expandedFrom });
      return after;
    }});
  }

  private applySiteAssignment(
    state: MutableTenantState,
    article: ArticleRecord,
    siteIds: readonly string[],
    actor: AuthorizedTenantActorContext,
    now: string,
  ): { after: readonly ArticleSiteRecord[]; expandedFrom: Record<string, string> } {
    const distinct = [...new Set(siteIds)];
    const requested = distinct.map((siteId) => requireSiteInScope(state, siteId, actor));
    if (requested.some(({ organizationId, status }) => organizationId !== actor.organizationId || status !== 'active')) throw new DashboardAccessDeniedError();
    const expansion = expandCascadeSites(state.sites, distinct, article.slug);
    if (expansion.unresolved.length > 0) {
      const missing = [...new Set(expansion.unresolved.map((entry) => entry.missing))].map((level) => (level === 'region' ? 'region' : 'apex'));
      throw new DashboardValidationError({ siteIds: [`Rantai portal belum lengkap: ${missing.join(' dan ')} belum tersedia.`] });
    }
    const expanded = expansion.targets.map((target) => ({ ...target, site: requireSiteInScope(state, target.siteId, actor) }));
    if (expanded.some(({ site }) => site.organizationId !== actor.organizationId || site.status !== 'active')) throw new DashboardAccessDeniedError();
    for (let index = 0; index < state.articleSites.length; index += 1) {
      const assignment = state.articleSites[index]!;
      if (assignment.articleId === article.id) state.articleSites[index] = { ...assignment, active: false };
    }
    const expandedFrom: Record<string, string> = {};
    for (const target of expanded) {
      const existing = state.articleSites.find(({ articleId, siteId }) => articleId === article.id && siteId === target.siteId);
      if (target.originSiteId !== null) expandedFrom[target.siteId] = target.originSiteId;
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
          assignmentSource: target.originSiteId === null ? 'manual' : 'auto',
          expandedFromSiteId: target.originSiteId,
          customCanonicalUrl: target.originSiteId === null ? null : target.canonicalUrl,
        });
      } else if (target.originSiteId === null) {
        Object.assign(existing, { active: true, assignmentSource: 'manual' as const, expandedFromSiteId: null, version: existing.version + 1, updatedAt: now });
      } else {
        Object.assign(existing, { active: true, assignmentSource: 'auto' as const, expandedFromSiteId: target.originSiteId, customCanonicalUrl: target.canonicalUrl, version: existing.version + 1, updatedAt: now });
      }
    }
    const after = state.articleSites.filter(({ articleId, active }) => articleId === article.id && active);
    return { after, expandedFrom };
  }

  setArticleSiteViews(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: siteViewsSchema, permission: DASHBOARD_PERMISSIONS.articleManage, action: 'article.sites.views.set', targetType: 'article_site', execute: (transaction, value, now) => {
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

  listNetworkArticles(actor: AuthorizedTenantActorContext, siteId: string, rawFilter: unknown = {}) {
    const parsed = articleFilterSchema.safeParse(rawFilter);
    if (!parsed.success) return Promise.resolve(this.invalid(actor, parsed.error));
    const filter = defined(parsed.data) as ArticleFilter;
    return this.query(actor, DASHBOARD_PERMISSIONS.articleRead, 'public_content.list', 'article', (state) => {
      requireSiteInScope(state, siteId, actor); this.requireFilterReferences(state, filter, actor);
      const articles = selectNetworkArticles(state, siteId, filter);
      return articles.map((article) => {
        const publisher = article.publisherId === null ? undefined : state.publishers.find(({ id }) => id === article.publisherId);
        return {
          ...article,
          sourceAttribution: publisher === undefined
            ? { attribution: article.source, independent: false, institutionName: null, claimScopes: [] }
            : buildNetworkPublisherClaim(publisher, state.affiliations, siteId),
        };
      });
    });
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

  async auditLogs(actor: AuthorizedTenantActorContext, rawFilter: unknown = {}): Promise<Result<{ readonly auditLogs: readonly AuditRecord[]; readonly retentionRuns: readonly RetentionRunRecord[] }, PublicErrorEnvelope>> {
    const parsed = auditFilterSchema.safeParse(rawFilter);
    if (!parsed.success) return Promise.resolve(this.invalid(actor, parsed.error));
    try {
      const [auditLogs, retentionRuns] = await Promise.all([
        this.repository.auditLogPage(actor, DASHBOARD_PERMISSIONS.auditRead, defined(parsed.data) as AuditFilter),
        this.repository.retentionRuns(actor, DASHBOARD_PERMISSIONS.auditRead),
      ]);
      return { ok: true, value: { auditLogs, retentionRuns } };
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
