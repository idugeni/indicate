import type { z } from 'zod';

import type { AuthorizedTenantActorContext } from '@/core/operation-context';
import type {
  ActivationAttemptRecord, AnalyticsProjection, ArticleFilter, ArticleRecord, AuditFilter, AuditRecord, AuthorRecord, CategoryRecord,
  DashboardProjection, DomainRecord, MembershipRecord, OfficialAffiliationRecord, PublisherRecord, NetworkPublisherClaim,
  RegionRecord, RetentionRunRecord, RoleListItem, RoleRecord, SiteRecord, SiteSettingsRecord, DashboardTenantState,
} from '@/modules/dashboard/models';
import { DASHBOARD_PERMISSIONS } from '@/modules/dashboard/permissions';
import {
  buildNetworkPublisherClaim, filterArticles, selectNetworkArticles,
} from '@/modules/dashboard/policies';
import type { IdentifierGenerator } from '@/core/system/ports';
import {
  DashboardAccessDeniedError, DashboardConflictError, DashboardQuotaExceededError, DashboardSubscriptionInactiveError, type MutableTenantState, type DashboardRepository, type DashboardTransaction,
} from '@/modules/dashboard/ports';
import { createNonDisclosingDenial, createPublicError, type PublicErrorEnvelope } from '@/core/errors';
import type { Result } from '@/core/result';
import {
  affiliationSchema, affiliationUpdateSchema, analyticsFilterSchema, articleCreateSchema, articleFilterSchema, articleTransitionSchema, articleUpdateSchema, assignmentSchema,
  auditFilterSchema, authorCreateSchema, authorUpdateSchema, categoryCreateSchema, categoryUpdateSchema,
  domainCreateSchema, domainUpdateSchema, membershipSchema, publisherCreateSchema, publisherDecisionSchema,
  publisherUpdateSchema, regionCreateSchema, regionUpdateSchema, roleCreateSchema, roleUpdateSchema,
  siteCreateSchema, siteSettingsSchema, siteUpdateSchema, siteViewsSchema,
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

function requireRecord<T extends { readonly id: string }>(values: readonly T[], id: string): T {
  const value = values.find((candidate) => candidate.id === id);
  if (value === undefined) throw new DashboardAccessDeniedError();
  return value;
}

function requireVersion<T extends { readonly version: number }>(value: T, expected: number): void {
  if (value.version !== expected) throw new DashboardConflictError();
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

  private async query<T>(actor: AuthorizedTenantActorContext, permission: string, action: string, targetType: string, project: (state: DashboardTenantState) => T): Promise<Result<T, PublicErrorEnvelope>> {
    try {
      return { ok: true, value: project(await this.repository.read(actor, permission)) };
    } catch (error) {
      if (error instanceof DashboardAccessDeniedError) return this.denied(actor, action, targetType);
      return { ok: false, error: createPublicError('INTERNAL_ERROR', 'The operation could not be completed.', actor.requestId) };
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
      if (error instanceof DashboardSubscriptionInactiveError) return { ok: false, error: createPublicError('FORBIDDEN', 'Langganan tidak aktif. Perpanjang paket untuk melanjutkan perubahan.', input.actor.requestId) };
      if (error instanceof DashboardQuotaExceededError) return { ok: false, error: createPublicError('FORBIDDEN', error.message, input.actor.requestId) };
      if (error instanceof DashboardConflictError) return { ok: false, error: createPublicError('CONFLICT', error.message, input.actor.requestId) };
      return { ok: false, error: createPublicError('INTERNAL_ERROR', 'The operation could not be completed.', input.actor.requestId) };
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

  async listConfiguration(actor: AuthorizedTenantActorContext) {
    const optionalRead = async (permission: string): Promise<DashboardTenantState | null> => {
      if (!actor.permissionSet.has(permission)) return null;
      try { return await this.repository.read(actor, permission); }
      catch (error) { if (error instanceof DashboardAccessDeniedError) return null; throw error; }
    };
    try {
      const [domainRead, domainManage, regionRead, regionManage, siteRead, siteManage, roleManage, membershipRead, membershipManage] = await Promise.all([
        optionalRead(DASHBOARD_PERMISSIONS.domainRead), optionalRead(DASHBOARD_PERMISSIONS.domainManage),
        optionalRead(DASHBOARD_PERMISSIONS.regionRead), optionalRead(DASHBOARD_PERMISSIONS.regionManage),
        optionalRead(DASHBOARD_PERMISSIONS.siteRead), optionalRead(DASHBOARD_PERMISSIONS.siteManage), optionalRead(DASHBOARD_PERMISSIONS.roleManage),
        optionalRead(DASHBOARD_PERMISSIONS.membershipRead), optionalRead(DASHBOARD_PERMISSIONS.membershipManage),
      ]);
      const domainState = domainRead ?? domainManage;
      const regionState = regionRead ?? regionManage;
      const siteState = siteRead ?? siteManage;
      const membershipState = membershipRead ?? membershipManage;
      const anyState = domainState ?? regionState ?? siteState ?? roleManage ?? membershipState;
      if (anyState === null) return this.denied(actor, 'configuration.list', 'configuration');
      let activationAttempts: readonly ActivationAttemptRecord[] = [];
      const attemptsPermission = siteRead !== null ? DASHBOARD_PERMISSIONS.siteRead : siteManage !== null ? DASHBOARD_PERMISSIONS.siteManage : null;
      if (siteState !== null && attemptsPermission !== null) {
        try { activationAttempts = await this.repository.activationAttempts(actor, attemptsPermission); }
        catch (error) { if (!(error instanceof DashboardAccessDeniedError)) throw error; }
      }
      return { ok: true as const, value: {
        organizationName: anyState.organizationName,
        domains: domainState?.domains ?? [], regions: regionState?.regions ?? [],
        sites: siteState?.sites ?? [], siteSettings: siteState?.siteSettings ?? [],
        roles: (roleManage?.roles ?? []).map(roleJson), memberships: membershipState?.memberships ?? [],
        telegramMappings: membershipState?.telegramMappings ?? [],
        activationAttempts,
      } };
    } catch {
      return { ok: false as const, error: createPublicError('INTERNAL_ERROR', 'The operation could not be completed.', actor.requestId) };
    }
  }

  createDomain(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: domainCreateSchema, permission: DASHBOARD_PERMISSIONS.domainManage, action: 'domain.create', targetType: 'domain', execute: (transaction, value, now) => {
      if (transaction.state.domains.some(({ normalizedHostname }) => normalizedHostname === value.normalizedHostname)) throw new DashboardConflictError();
      const record: DomainRecord = { ...this.base(actor, now), ...value };
      transaction.state.domains.push(record); this.audit(transaction, 'domain.create', 'domain', record.id, null, record); return record;
    }});
  }

  updateDomain(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: domainUpdateSchema, permission: DASHBOARD_PERMISSIONS.domainManage, action: 'domain.update', targetType: 'domain', execute: (transaction, value, now) => {
      const before = requireRecord(transaction.state.domains, value.id); requireVersion(before, value.expectedVersion);
      if (transaction.state.domains.some((item) => item.id !== before.id && item.normalizedHostname === value.normalizedHostname)) throw new DashboardConflictError();
      const after: DomainRecord = { ...before, normalizedHostname: value.normalizedHostname, status: value.status, version: before.version + 1, updatedAt: now };
      replaceById(transaction.state.domains, after); this.audit(transaction, 'domain.update', 'domain', after.id, before, after); return after;
    }});
  }

  createRegion(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: regionCreateSchema, permission: DASHBOARD_PERMISSIONS.regionManage, action: 'region.create', targetType: 'region', execute: (transaction, value, now) => {
      if (transaction.state.regions.some(({ slug, externalKey }) => slug === value.slug || externalKey === value.externalKey)) throw new DashboardConflictError();
      const record: RegionRecord = { ...this.base(actor, now), ...value };
      transaction.state.regions.push(record); this.audit(transaction, 'region.create', 'region', record.id, null, record); return record;
    }});
  }

  updateRegion(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: regionUpdateSchema, permission: DASHBOARD_PERMISSIONS.regionManage, action: 'region.update', targetType: 'region', execute: (transaction, value, now) => {
      const before = requireRecord(transaction.state.regions, value.id); requireVersion(before, value.expectedVersion);
      const after: RegionRecord = { ...before, externalKey: value.externalKey, name: value.name, slug: value.slug, status: value.status, version: before.version + 1, updatedAt: now };
      replaceById(transaction.state.regions, after); this.audit(transaction, 'region.update', 'region', after.id, before, after); return after;
    }});
  }

  createSite(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: siteCreateSchema, permission: DASHBOARD_PERMISSIONS.siteManage, action: 'site.create', targetType: 'site', execute: (transaction, value, now) => {
      const domain = requireRecord(transaction.state.domains, value.domainId);
      if (domain.status === 'archived' || (value.regionId !== null && requireRecord(transaction.state.regions, value.regionId).status === 'archived')) throw new DashboardAccessDeniedError();
      if (transaction.state.sites.some(({ normalizedHostname }) => normalizedHostname === value.normalizedHostname)) throw new DashboardConflictError();
      const record: SiteRecord = { ...this.base(actor, now), ...value, activationState: 'inactive' };
      transaction.state.sites.push(record); this.audit(transaction, 'site.create', 'site', record.id, null, record); return record;
    }});
  }

  updateSite(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: siteUpdateSchema, permission: DASHBOARD_PERMISSIONS.siteManage, action: 'site.update', targetType: 'site', execute: (transaction, value, now) => {
      requireRecord(transaction.state.domains, value.domainId); if (value.regionId !== null) requireRecord(transaction.state.regions, value.regionId);
      const before = requireRecord(transaction.state.sites, value.id); requireVersion(before, value.expectedVersion);
      const after: SiteRecord = { ...before, domainId: value.domainId, regionId: value.regionId, normalizedHostname: value.normalizedHostname, status: value.status, activationState: value.status === 'active' ? 'pending' : 'inactive', version: before.version + 1, updatedAt: now };
      replaceById(transaction.state.sites, after); this.audit(transaction, 'site.update', 'site', after.id, before, after); return after;
    }});
  }

  saveSiteSettings(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: siteSettingsSchema, permission: DASHBOARD_PERMISSIONS.siteManage, action: 'site.settings.update', targetType: 'site_settings', execute: (transaction, value, now) => {
      requireRecord(transaction.state.sites, value.siteId);
      const before = transaction.state.siteSettings.find(({ siteId }) => siteId === value.siteId);
      if (before !== undefined && value.expectedVersion !== undefined) requireVersion(before, value.expectedVersion);
      const after: SiteSettingsRecord = before === undefined
        ? { ...this.base(actor, now), siteId: value.siteId, id: value.siteId, name: value.name, description: value.description, colors: value.colors ?? {}, socialLinks: value.socialLinks ?? {}, seo: value.seo ?? {}, navigation: value.navigation ?? [], version: 1 }
        : { ...before, name: value.name, description: value.description, colors: value.colors ?? before.colors, socialLinks: value.socialLinks ?? before.socialLinks, seo: value.seo ?? before.seo, navigation: value.navigation ?? before.navigation, version: before.version + 1, updatedAt: now };
      if (before === undefined) transaction.state.siteSettings.push(after); else replaceById(transaction.state.siteSettings, after);
      this.audit(transaction, 'site.settings.update', 'site_settings', after.id, before ?? null, after); return after;
    }});
  }

  createRole(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: roleCreateSchema, permission: DASHBOARD_PERMISSIONS.roleManage, action: 'role.create', targetType: 'role', execute: (transaction, value, now) => {
      if (transaction.state.roles.some(({ name }) => name.toLowerCase() === value.name.toLowerCase())) throw new DashboardConflictError();
      const record: RoleRecord = { ...this.base(actor, now), name: value.name, tier: value.tier, active: value.active, permissions: new Set(value.permissions) };
      transaction.state.roles.push(record); this.audit(transaction, 'role.create', 'role', record.id, null, { ...record, permissions: [...record.permissions] }); return roleJson(record);
    }});
  }

  updateRole(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: roleUpdateSchema, permission: DASHBOARD_PERMISSIONS.roleManage, action: 'role.update', targetType: 'role', execute: (transaction, value, now) => {
      const before = requireRecord(transaction.state.roles, value.id); requireVersion(before, value.expectedVersion);
      const after: RoleRecord = { ...before, name: value.name, tier: value.tier ?? before.tier, active: value.active, permissions: new Set(value.permissions), version: before.version + 1, updatedAt: now };
      replaceById(transaction.state.roles, after); this.audit(transaction, 'role.update', 'role', after.id, { ...before, permissions: [...before.permissions] }, { ...after, permissions: [...after.permissions] }); return roleJson(after);
    }});
  }

  saveMembership(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: membershipSchema, permission: DASHBOARD_PERMISSIONS.membershipManage, action: 'membership.update', targetType: 'membership', execute: async (transaction, value, now) => {
      requireRecord(transaction.state.roles, value.roleId);
      const before = transaction.state.memberships.find(({ userId }) => userId === value.userId);
      if (before !== undefined && value.expectedVersion !== undefined) requireVersion(before, value.expectedVersion);
      for (let index = 0; index < transaction.state.telegramMappings.length; index += 1) {
        const mapping = transaction.state.telegramMappings[index]!;
        const diverges = value.status !== 'active' || mapping.roleId !== value.roleId;
        if (mapping.userId === value.userId && mapping.status === 'active' && diverges) {
          transaction.state.telegramMappings[index] = { ...mapping, status: 'inactive', updatedAt: now };
        }
      }
      const persistedDisplayName = before?.displayName ?? await transaction.resolveUserDisplayName(value.userId);
      if (persistedDisplayName === null) throw new DashboardAccessDeniedError();
      const after: MembershipRecord = before === undefined
        ? { ...this.base(actor, now), id: value.userId, userId: value.userId, displayName: persistedDisplayName, avatarUrl: null, roleId: value.roleId, status: value.status, version: 1 }
        : { ...before, displayName: persistedDisplayName, roleId: value.roleId, status: value.status, version: before.version + 1, updatedAt: now };
      if (before === undefined) transaction.state.memberships.push(after); else replaceById(transaction.state.memberships, after);
      this.audit(transaction, 'membership.update', 'membership', after.id, before ?? null, after); return after;
    }});
  }

  async listPublishers(actor: AuthorizedTenantActorContext) {
    try {
      const state = await this.repository.read(actor, DASHBOARD_PERMISSIONS.publisherRead);
      let visibleSites: DashboardTenantState['sites'] = [];
      if (actor.permissionSet.has(DASHBOARD_PERMISSIONS.siteRead)) {
        try { visibleSites = (await this.repository.read(actor, DASHBOARD_PERMISSIONS.siteRead)).sites; }
        catch (error) { if (!(error instanceof DashboardAccessDeniedError)) throw error; }
      }
      return { ok: true as const, value: { publishers: state.publishers, affiliations: state.affiliations, sites: visibleSites } };
    } catch (error) {
      if (error instanceof DashboardAccessDeniedError) return this.denied(actor, 'publisher.list', 'publisher');
      return { ok: false as const, error: createPublicError('INTERNAL_ERROR', 'The operation could not be completed.', actor.requestId) };
    }
  }

  createPublisher(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: publisherCreateSchema, permission: DASHBOARD_PERMISSIONS.publisherManage, action: 'publisher.create', targetType: 'publisher', execute: (transaction, value, now) => {
      const record: PublisherRecord = { ...this.base(actor, now), ...value, verificationStatus: 'unverified', submittedBy: null, submittedAt: null, verifiedBy: null, verifiedAt: null, rejectionReason: null, status: 'active' };
      transaction.state.publishers.push(record); this.audit(transaction, 'publisher.create', 'publisher', record.id, null, record); return record;
    }});
  }

  updatePublisher(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: publisherUpdateSchema, permission: DASHBOARD_PERMISSIONS.publisherManage, action: 'publisher.update', targetType: 'publisher', execute: (transaction, value, now) => {
      const before = requireRecord(transaction.state.publishers, value.id); requireVersion(before, value.expectedVersion);
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
      const publisher = requireRecord(transaction.state.publishers, value.publisherId); requireRecord(transaction.state.sites, value.siteId);
      if (publisher.verificationStatus !== 'verified') throw new DashboardAccessDeniedError();
      const record: OfficialAffiliationRecord = { ...this.base(actor, now), ...value, active: true, verifiedAt: now };
      transaction.state.affiliations.push(record); this.audit(transaction, 'affiliation.create', 'official_affiliation', record.id, null, record); return record;
    }});
  }

  updateAffiliation(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: affiliationUpdateSchema, permission: DASHBOARD_PERMISSIONS.publisherVerify, action: 'affiliation.update', targetType: 'official_affiliation', execute: (transaction, value, now) => {
      const before = requireRecord(transaction.state.affiliations, value.id); requireVersion(before, value.expectedVersion);
      const publisher = requireRecord(transaction.state.publishers, before.publisherId); requireRecord(transaction.state.sites, before.siteId);
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

  listEditorial(actor: AuthorizedTenantActorContext, rawFilter: unknown = {}) {
    const parsed = articleFilterSchema.safeParse(rawFilter);
    if (!parsed.success) return Promise.resolve(this.invalid(actor, parsed.error));
    const filter = defined(parsed.data) as ArticleFilter;
    return this.query(actor, DASHBOARD_PERMISSIONS.articleRead, 'article.list', 'article', (state) => {
      this.requireFilterReferences(state, filter);
      return {
        articles: filterArticles(state, filter), categories: state.categories, authors: state.authors,
        publishers: state.publishers.map(({ id, name, attributionLabel }) => ({ id, name, attributionLabel })), regions: state.regions, sites: state.sites, articleSites: state.articleSites,
      };
    });
  }

  createArticle(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: articleCreateSchema, permission: DASHBOARD_PERMISSIONS.articleManage, action: 'article.create', targetType: 'article', execute: (transaction, value, now) => {
      this.requireArticleReferences(transaction.state, value);
      if (transaction.state.articles.some(({ slug }) => slug === value.slug)) throw new DashboardConflictError();
      const record: ArticleRecord = { ...this.base(actor, now), ...value, publishedAt: null, archivedAt: null };
      transaction.state.articles.push(record); this.audit(transaction, 'article.create', 'article', record.id, null, record); return record;
    }});
  }

  updateArticle(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: articleUpdateSchema, permission: DASHBOARD_PERMISSIONS.articleManage, action: 'article.update', targetType: 'article', execute: (transaction, value, now) => {
      this.requireArticleReferences(transaction.state, value);
      const before = requireRecord(transaction.state.articles, value.id); requireVersion(before, value.expectedVersion);
      const after: ArticleRecord = { ...before, regionId: value.regionId, publisherId: value.publisherId, categoryId: value.categoryId, authorId: value.authorId, slug: value.slug, title: value.title, body: value.body, source: value.source, tags: [...value.tags], status: value.status, version: before.version + 1, updatedAt: now };
      replaceById(transaction.state.articles, after); this.audit(transaction, 'article.update', 'article', after.id, before, after); return after;
    }});
  }

  private requireFilterReferences(state: DashboardTenantState, filter: ArticleFilter): void {
    if (filter.regionId !== undefined) requireRecord(state.regions, filter.regionId);
    if (filter.siteId !== undefined) requireRecord(state.sites, filter.siteId);
    if (filter.categoryId !== undefined) requireRecord(state.categories, filter.categoryId);
    if (filter.publisherId !== undefined) requireRecord(state.publishers, filter.publisherId);
    if (filter.authorId !== undefined) requireRecord(state.authors, filter.authorId);
  }

  private requireArticleReferences(state: MutableTenantState, value: { regionId: string; publisherId: string | null; categoryId: string | null; authorId: string | null }): void {
    if (requireRecord(state.regions, value.regionId).status !== 'active') throw new DashboardAccessDeniedError();
    if (value.publisherId !== null && requireRecord(state.publishers, value.publisherId).status !== 'active') throw new DashboardAccessDeniedError();
    if (value.categoryId !== null && requireRecord(state.categories, value.categoryId).status !== 'active') throw new DashboardAccessDeniedError();
    if (value.authorId !== null && requireRecord(state.authors, value.authorId).status !== 'active') throw new DashboardAccessDeniedError();
  }

  archiveArticle(actor: AuthorizedTenantActorContext, raw: unknown) { return this.transitionArticle(actor, raw, 'archived'); }
  restoreArticle(actor: AuthorizedTenantActorContext, raw: unknown) { return this.transitionArticle(actor, raw, 'draft'); }
  private transitionArticle(actor: AuthorizedTenantActorContext, raw: unknown, status: 'archived' | 'draft') {
    const action = status === 'archived' ? 'article.archive' : 'article.restore';
    return this.mutate({ actor, raw, schema: articleTransitionSchema, permission: DASHBOARD_PERMISSIONS.articleManage, action, targetType: 'article', execute: (transaction, value: VersionInput, now) => {
      const before = requireRecord(transaction.state.articles, value.id); requireVersion(before, value.expectedVersion);
      const after: ArticleRecord = { ...before, status, archivedAt: status === 'archived' ? now : null, version: before.version + 1, updatedAt: now };
      replaceById(transaction.state.articles, after); this.audit(transaction, action, 'article', after.id, before, after); return after;
    }});
  }

  assignArticleSites(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: assignmentSchema, permission: DASHBOARD_PERMISSIONS.articleManage, action: 'article.sites.assign', targetType: 'article', execute: (transaction, value, now) => {
      const article = requireRecord(transaction.state.articles, value.articleId);
      if (article.organizationId !== actor.organizationId) throw new DashboardAccessDeniedError();
      const distinct = [...new Set(value.siteIds)];
      const targetSites = distinct.map((siteId) => requireRecord(transaction.state.sites, siteId));
      if (targetSites.some(({ organizationId, status }) => organizationId !== actor.organizationId || status !== 'active')) throw new DashboardAccessDeniedError();
      const before = transaction.state.articleSites.filter(({ articleId, active }) => articleId === article.id && active);
      for (let index = 0; index < transaction.state.articleSites.length; index += 1) {
        const assignment = transaction.state.articleSites[index]!;
        if (assignment.articleId === article.id) transaction.state.articleSites[index] = { ...assignment, active: false };
      }
      for (const site of targetSites) {
        const existing = transaction.state.articleSites.find(({ articleId, siteId }) => articleId === article.id && siteId === site.id);
        if (existing === undefined) transaction.state.articleSites.push({ ...this.base(actor, now), articleId: article.id, siteId: site.id, state: 'queued', stateOccurredAt: now, publishedUrl: null, publishedAt: null, active: true, viewCount: 0 });
        else Object.assign(existing, { active: true, version: existing.version + 1, updatedAt: now });
      }
      const after = transaction.state.articleSites.filter(({ articleId, active }) => articleId === article.id && active);
      this.audit(transaction, 'article.sites.assign', 'article', article.id, { siteIds: before.map(({ siteId }) => siteId).sort() }, { siteIds: after.map(({ siteId }) => siteId).sort() });
      return after;
    }});
  }

  setArticleSiteViews(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: siteViewsSchema, permission: DASHBOARD_PERMISSIONS.articleManage, action: 'article.sites.views.set', targetType: 'article_site', execute: (transaction, value, now) => {
      const article = requireRecord(transaction.state.articles, value.articleId);
      if (article.organizationId !== actor.organizationId) throw new DashboardAccessDeniedError();
      const site = requireRecord(transaction.state.sites, value.siteId);
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
      requireRecord(state.sites, siteId); this.requireFilterReferences(state, filter);
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
      return { ok: false, error: createPublicError('INTERNAL_ERROR', 'The operation could not be completed.', actor.requestId) };
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
      return { ok: false, error: createPublicError('INTERNAL_ERROR', 'The operation could not be completed.', actor.requestId) };
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
      return { ok: false, error: createPublicError('INTERNAL_ERROR', 'The operation could not be completed.', actor.requestId) };
    }
  }
}
