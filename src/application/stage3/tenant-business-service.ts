import type { z } from 'zod';

import type { AuthorizedTenantActorContext } from '@/domain/context/operation-context';
import type {
  AnalyticsProjection, ArticleFilter, ArticleRecord, AuditFilter, AuditRecord, AuthorRecord, CategoryRecord,
  DashboardProjection, DomainRecord, MembershipRecord, OfficialAffiliationRecord, PublisherRecord, PublicPublisherClaim,
  RegionRecord, RoleRecord, SiteRecord, SiteSettingsRecord, Stage3TenantState,
} from '@/domain/stage3/models';
import { STAGE3_PERMISSIONS } from '@/domain/stage3/permissions';
export { STAGE3_PERMISSIONS } from '@/domain/stage3/permissions';
import {
  buildAnalytics, buildDashboard, buildPublicPublisherClaim, filterArticles, filterAuditLogs, selectPublicArticles,
} from '@/domain/stage3/policies';
import type { IdentifierGenerator } from '@/ports/identifier-generator';
import {
  Stage3AccessDeniedError, Stage3ConflictError, type MutableTenantState, type Stage3Repository, type Stage3Transaction,
} from '@/ports/stage3-repository';
import { createNonDisclosingDenial, createPublicError, type PublicErrorEnvelope } from '@/shared/errors/application-error';
import type { Result } from '@/shared/types/result';
import {
  affiliationSchema, affiliationUpdateSchema, analyticsFilterSchema, articleCreateSchema, articleFilterSchema, articleTransitionSchema, articleUpdateSchema, assignmentSchema,
  auditFilterSchema, authorCreateSchema, authorUpdateSchema, categoryCreateSchema, categoryUpdateSchema,
  domainCreateSchema, domainUpdateSchema, membershipSchema, publisherCreateSchema, publisherDecisionSchema,
  publisherUpdateSchema, regionCreateSchema, regionUpdateSchema, roleCreateSchema, roleUpdateSchema,
  siteCreateSchema, siteSettingsSchema, siteUpdateSchema,
} from './schemas';

interface ClockLike { now(): Date }
interface VersionInput { readonly id: string; readonly expectedVersion: number }
class Stage3ValidationError extends Error {
  constructor(readonly fields: Readonly<Record<string, readonly string[]>>) { super('Stage 3 validation failed'); }
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

function defined<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;
}

function requireRecord<T extends { readonly id: string }>(values: readonly T[], id: string): T {
  const value = values.find((candidate) => candidate.id === id);
  if (value === undefined) throw new Stage3AccessDeniedError();
  return value;
}

function requireVersion<T extends { readonly version: number }>(value: T, expected: number): void {
  if (value.version !== expected) throw new Stage3ConflictError();
}

function replaceById<T extends { readonly id: string }>(values: T[], next: T): void {
  const index = values.findIndex(({ id }) => id === next.id);
  if (index < 0) throw new Stage3AccessDeniedError();
  values[index] = next;
}

export class TenantBusinessService {
  constructor(
    private readonly repository: Stage3Repository,
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

  private async query<T>(actor: AuthorizedTenantActorContext, permission: string, action: string, targetType: string, project: (state: Stage3TenantState) => T): Promise<Result<T, PublicErrorEnvelope>> {
    try {
      return { ok: true, value: project(await this.repository.read(actor, permission)) };
    } catch (error) {
      if (error instanceof Stage3AccessDeniedError) return this.denied(actor, action, targetType);
      return { ok: false, error: createPublicError('INTERNAL_ERROR', 'The operation could not be completed.', actor.requestId) };
    }
  }

  private async mutate<Input, Output>(input: {
    actor: AuthorizedTenantActorContext; permission: string; action: string; targetType: string; schema: z.ZodType<Input>; raw: unknown;
    execute: (transaction: Stage3Transaction, value: Input, now: string) => Output | Promise<Output>;
  }): Promise<Result<Output, PublicErrorEnvelope>> {
    const parsed = input.schema.safeParse(input.raw);
    if (!parsed.success) return this.invalid(input.actor, parsed.error);
    try {
      const value = await this.repository.execute(input.actor, input.permission, (transaction) => input.execute(transaction, parsed.data, this.clock.now().toISOString()));
      return { ok: true, value };
    } catch (error) {
      if (error instanceof Stage3ValidationError) return { ok: false, error: createPublicError('INVALID_INPUT', 'Please correct the highlighted fields.', input.actor.requestId, error.fields) };
      if (error instanceof Stage3AccessDeniedError) return this.denied(input.actor, input.action, input.targetType);
      if (error instanceof Stage3ConflictError) return { ok: false, error: createPublicError('CONFLICT', error.message, input.actor.requestId) };
      return { ok: false, error: createPublicError('INTERNAL_ERROR', 'The operation could not be completed.', input.actor.requestId) };
    }
  }

  private base(actor: AuthorizedTenantActorContext, now: string) {
    return { id: this.identifiers.create(), organizationId: actor.organizationId, version: 1, createdAt: now, updatedAt: now } as const;
  }

  private audit(transaction: Stage3Transaction, action: string, targetType: string, targetId: string, before: object | null, after: object | null): void {
    const beforeValue = before === null ? null : publicRecord(before);
    const afterValue = after === null ? null : publicRecord(after);
    transaction.appendAudit({
      action, targetType, targetId, outcome: 'succeeded',
      changedFields: beforeValue === null ? Object.keys(afterValue ?? {}).sort() : afterValue === null ? Object.keys(beforeValue).sort() : changedFields(beforeValue, afterValue),
      before: beforeValue, after: afterValue,
    });
  }

  async listConfiguration(actor: AuthorizedTenantActorContext) {
    const optionalRead = async (permission: string): Promise<Stage3TenantState | null> => {
      if (!actor.permissionSet.has(permission)) return null;
      try { return await this.repository.read(actor, permission); }
      catch (error) { if (error instanceof Stage3AccessDeniedError) return null; throw error; }
    };
    try {
      const [domainRead, domainManage, regionRead, regionManage, siteRead, siteManage, roleManage, membershipRead, membershipManage] = await Promise.all([
        optionalRead(STAGE3_PERMISSIONS.domainRead), optionalRead(STAGE3_PERMISSIONS.domainManage),
        optionalRead(STAGE3_PERMISSIONS.regionRead), optionalRead(STAGE3_PERMISSIONS.regionManage),
        optionalRead(STAGE3_PERMISSIONS.siteRead), optionalRead(STAGE3_PERMISSIONS.siteManage), optionalRead(STAGE3_PERMISSIONS.roleManage),
        optionalRead(STAGE3_PERMISSIONS.membershipRead), optionalRead(STAGE3_PERMISSIONS.membershipManage),
      ]);
      const domainState = domainRead ?? domainManage;
      const regionState = regionRead ?? regionManage;
      const siteState = siteRead ?? siteManage;
      const membershipState = membershipRead ?? membershipManage;
      const anyState = domainState ?? regionState ?? siteState ?? roleManage ?? membershipState;
      if (anyState === null) return this.denied(actor, 'configuration.list', 'configuration');
      return { ok: true as const, value: {
        organizationName: anyState.organizationName,
        domains: domainState?.domains ?? [], regions: regionState?.regions ?? [],
        sites: siteState?.sites ?? [], siteSettings: siteState?.siteSettings ?? [],
        roles: roleManage?.roles ?? [], memberships: membershipState?.memberships ?? [],
      } };
    } catch {
      return { ok: false as const, error: createPublicError('INTERNAL_ERROR', 'The operation could not be completed.', actor.requestId) };
    }
  }

  createDomain(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: domainCreateSchema, permission: STAGE3_PERMISSIONS.domainManage, action: 'domain.create', targetType: 'domain', execute: (transaction, value, now) => {
      if (transaction.state.domains.some(({ normalizedHostname }) => normalizedHostname === value.normalizedHostname)) throw new Stage3ConflictError();
      const record: DomainRecord = { ...this.base(actor, now), ...value };
      transaction.state.domains.push(record); this.audit(transaction, 'domain.create', 'domain', record.id, null, record); return record;
    }});
  }

  updateDomain(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: domainUpdateSchema, permission: STAGE3_PERMISSIONS.domainManage, action: 'domain.update', targetType: 'domain', execute: (transaction, value, now) => {
      const before = requireRecord(transaction.state.domains, value.id); requireVersion(before, value.expectedVersion);
      if (transaction.state.domains.some((item) => item.id !== before.id && item.normalizedHostname === value.normalizedHostname)) throw new Stage3ConflictError();
      const after: DomainRecord = { ...before, normalizedHostname: value.normalizedHostname, status: value.status, version: before.version + 1, updatedAt: now };
      replaceById(transaction.state.domains, after); this.audit(transaction, 'domain.update', 'domain', after.id, before, after); return after;
    }});
  }

  createRegion(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: regionCreateSchema, permission: STAGE3_PERMISSIONS.regionManage, action: 'region.create', targetType: 'region', execute: (transaction, value, now) => {
      if (transaction.state.regions.some(({ slug, externalKey }) => slug === value.slug || externalKey === value.externalKey)) throw new Stage3ConflictError();
      const record: RegionRecord = { ...this.base(actor, now), ...value };
      transaction.state.regions.push(record); this.audit(transaction, 'region.create', 'region', record.id, null, record); return record;
    }});
  }

  updateRegion(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: regionUpdateSchema, permission: STAGE3_PERMISSIONS.regionManage, action: 'region.update', targetType: 'region', execute: (transaction, value, now) => {
      const before = requireRecord(transaction.state.regions, value.id); requireVersion(before, value.expectedVersion);
      const after: RegionRecord = { ...before, externalKey: value.externalKey, name: value.name, slug: value.slug, status: value.status, version: before.version + 1, updatedAt: now };
      replaceById(transaction.state.regions, after); this.audit(transaction, 'region.update', 'region', after.id, before, after); return after;
    }});
  }

  createSite(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: siteCreateSchema, permission: STAGE3_PERMISSIONS.siteManage, action: 'site.create', targetType: 'site', execute: (transaction, value, now) => {
      const domain = requireRecord(transaction.state.domains, value.domainId);
      if (domain.status === 'archived' || (value.regionId !== null && requireRecord(transaction.state.regions, value.regionId).status === 'archived')) throw new Stage3AccessDeniedError();
      if (transaction.state.sites.some(({ normalizedHostname }) => normalizedHostname === value.normalizedHostname)) throw new Stage3ConflictError();
      const record: SiteRecord = { ...this.base(actor, now), ...value, activationState: 'inactive' };
      transaction.state.sites.push(record); this.audit(transaction, 'site.create', 'site', record.id, null, record); return record;
    }});
  }

  updateSite(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: siteUpdateSchema, permission: STAGE3_PERMISSIONS.siteManage, action: 'site.update', targetType: 'site', execute: (transaction, value, now) => {
      requireRecord(transaction.state.domains, value.domainId); if (value.regionId !== null) requireRecord(transaction.state.regions, value.regionId);
      const before = requireRecord(transaction.state.sites, value.id); requireVersion(before, value.expectedVersion);
      const after: SiteRecord = { ...before, domainId: value.domainId, regionId: value.regionId, normalizedHostname: value.normalizedHostname, status: value.status, activationState: value.status === 'active' ? 'pending' : 'inactive', version: before.version + 1, updatedAt: now };
      replaceById(transaction.state.sites, after); this.audit(transaction, 'site.update', 'site', after.id, before, after); return after;
    }});
  }

  saveSiteSettings(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: siteSettingsSchema, permission: STAGE3_PERMISSIONS.siteManage, action: 'site.settings.update', targetType: 'site_settings', execute: (transaction, value, now) => {
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
    return this.mutate({ actor, raw, schema: roleCreateSchema, permission: STAGE3_PERMISSIONS.roleManage, action: 'role.create', targetType: 'role', execute: (transaction, value, now) => {
      if (transaction.state.roles.some(({ name }) => name.toLowerCase() === value.name.toLowerCase())) throw new Stage3ConflictError();
      const record: RoleRecord = { ...this.base(actor, now), name: value.name, active: value.active, permissions: new Set(value.permissions) };
      transaction.state.roles.push(record); this.audit(transaction, 'role.create', 'role', record.id, null, { ...record, permissions: [...record.permissions] }); return record;
    }});
  }

  updateRole(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: roleUpdateSchema, permission: STAGE3_PERMISSIONS.roleManage, action: 'role.update', targetType: 'role', execute: (transaction, value, now) => {
      const before = requireRecord(transaction.state.roles, value.id); requireVersion(before, value.expectedVersion);
      const after: RoleRecord = { ...before, name: value.name, active: value.active, permissions: new Set(value.permissions), version: before.version + 1, updatedAt: now };
      replaceById(transaction.state.roles, after); this.audit(transaction, 'role.update', 'role', after.id, { ...before, permissions: [...before.permissions] }, { ...after, permissions: [...after.permissions] }); return after;
    }});
  }

  saveMembership(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: membershipSchema, permission: STAGE3_PERMISSIONS.membershipManage, action: 'membership.update', targetType: 'membership', execute: async (transaction, value, now) => {
      requireRecord(transaction.state.roles, value.roleId);
      const before = transaction.state.memberships.find(({ userId }) => userId === value.userId);
      if (before !== undefined && value.expectedVersion !== undefined) requireVersion(before, value.expectedVersion);
      const persistedDisplayName = before?.displayName ?? await transaction.resolveUserDisplayName(value.userId);
      if (persistedDisplayName === null) throw new Stage3AccessDeniedError();
      const after: MembershipRecord = before === undefined
        ? { ...this.base(actor, now), id: value.userId, userId: value.userId, displayName: persistedDisplayName, roleId: value.roleId, status: value.status, version: 1 }
        : { ...before, displayName: persistedDisplayName, roleId: value.roleId, status: value.status, version: before.version + 1, updatedAt: now };
      if (before === undefined) transaction.state.memberships.push(after); else replaceById(transaction.state.memberships, after);
      this.audit(transaction, 'membership.update', 'membership', after.id, before ?? null, after); return after;
    }});
  }

  async listPublishers(actor: AuthorizedTenantActorContext) {
    try {
      const state = await this.repository.read(actor, STAGE3_PERMISSIONS.publisherRead);
      let visibleSites: Stage3TenantState['sites'] = [];
      if (actor.permissionSet.has(STAGE3_PERMISSIONS.siteRead)) {
        try { visibleSites = (await this.repository.read(actor, STAGE3_PERMISSIONS.siteRead)).sites; }
        catch (error) { if (!(error instanceof Stage3AccessDeniedError)) throw error; }
      }
      return { ok: true as const, value: { publishers: state.publishers, affiliations: state.affiliations, sites: visibleSites } };
    } catch (error) {
      if (error instanceof Stage3AccessDeniedError) return this.denied(actor, 'publisher.list', 'publisher');
      return { ok: false as const, error: createPublicError('INTERNAL_ERROR', 'The operation could not be completed.', actor.requestId) };
    }
  }

  createPublisher(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: publisherCreateSchema, permission: STAGE3_PERMISSIONS.publisherManage, action: 'publisher.create', targetType: 'publisher', execute: (transaction, value, now) => {
      const record: PublisherRecord = { ...this.base(actor, now), ...value, verificationStatus: 'unverified', submittedBy: null, submittedAt: null, verifiedBy: null, verifiedAt: null, rejectionReason: null, status: 'active' };
      transaction.state.publishers.push(record); this.audit(transaction, 'publisher.create', 'publisher', record.id, null, record); return record;
    }});
  }

  updatePublisher(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: publisherUpdateSchema, permission: STAGE3_PERMISSIONS.publisherManage, action: 'publisher.update', targetType: 'publisher', execute: (transaction, value, now) => {
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
    const permission = decision === 'approve' || decision === 'reject' ? STAGE3_PERMISSIONS.publisherVerify : STAGE3_PERMISSIONS.publisherManage;
    return this.mutate({ actor, raw, schema: publisherDecisionSchema, permission, action: `publisher.${decision}`, targetType: 'publisher', execute: (transaction, value, now) => {
      const before = requireRecord(transaction.state.publishers, value.id); requireVersion(before, value.expectedVersion);
      if ((decision === 'submit' || decision === 'approve') && (value.evidenceReference ?? before.evidenceReference) === null) throw new Stage3ValidationError({ evidenceReference: ['Verification evidence is required.'] });
      if (decision === 'reject' && value.reason === undefined) throw new Stage3ValidationError({ reason: ['A rejection reason is required.'] });
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
    return this.mutate({ actor, raw, schema: affiliationSchema, permission: STAGE3_PERMISSIONS.publisherVerify, action: 'affiliation.create', targetType: 'official_affiliation', execute: (transaction, value, now) => {
      const publisher = requireRecord(transaction.state.publishers, value.publisherId); requireRecord(transaction.state.sites, value.siteId);
      if (publisher.verificationStatus !== 'verified') throw new Stage3AccessDeniedError();
      const record: OfficialAffiliationRecord = { ...this.base(actor, now), ...value, active: true, verifiedAt: now };
      transaction.state.affiliations.push(record); this.audit(transaction, 'affiliation.create', 'official_affiliation', record.id, null, record); return record;
    }});
  }

  updateAffiliation(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: affiliationUpdateSchema, permission: STAGE3_PERMISSIONS.publisherVerify, action: 'affiliation.update', targetType: 'official_affiliation', execute: (transaction, value, now) => {
      const before = requireRecord(transaction.state.affiliations, value.id); requireVersion(before, value.expectedVersion);
      const publisher = requireRecord(transaction.state.publishers, before.publisherId); requireRecord(transaction.state.sites, before.siteId);
      if (value.active && publisher.verificationStatus !== 'verified') throw new Stage3AccessDeniedError();
      const after: OfficialAffiliationRecord = { ...before, institutionName: value.institutionName, claimScopes: value.claimScopes, evidenceReference: value.evidenceReference, active: value.active, verifiedAt: value.active ? now : before.verifiedAt, version: before.version + 1, updatedAt: now };
      replaceById(transaction.state.affiliations, after); this.audit(transaction, 'affiliation.update', 'official_affiliation', after.id, before, after); return after;
    }});
  }

  getPublisherClaim(actor: AuthorizedTenantActorContext, publisherId: string, siteId: string): Promise<Result<PublicPublisherClaim, PublicErrorEnvelope>> {
    return this.query(actor, STAGE3_PERMISSIONS.publisherRead, 'publisher.claim.read', 'publisher', (state) => buildPublicPublisherClaim(requireRecord(state.publishers, publisherId), state.affiliations, siteId));
  }

  createCategory(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: categoryCreateSchema, permission: STAGE3_PERMISSIONS.articleManage, action: 'category.create', targetType: 'category', execute: (transaction, value, now) => {
      if (transaction.state.categories.some(({ slug }) => slug === value.slug)) throw new Stage3ConflictError();
      const record: CategoryRecord = { ...this.base(actor, now), ...value }; transaction.state.categories.push(record); this.audit(transaction, 'category.create', 'category', record.id, null, record); return record;
    }});
  }

  updateCategory(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: categoryUpdateSchema, permission: STAGE3_PERMISSIONS.articleManage, action: 'category.update', targetType: 'category', execute: (transaction, value, now) => {
      const before = requireRecord(transaction.state.categories, value.id); requireVersion(before, value.expectedVersion);
      const after: CategoryRecord = { ...before, name: value.name, slug: value.slug, status: value.status, version: before.version + 1, updatedAt: now };
      replaceById(transaction.state.categories, after); this.audit(transaction, 'category.update', 'category', after.id, before, after); return after;
    }});
  }

  createAuthor(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: authorCreateSchema, permission: STAGE3_PERMISSIONS.articleManage, action: 'author.create', targetType: 'author', execute: (transaction, value, now) => {
      const record: AuthorRecord = { ...this.base(actor, now), ...value }; transaction.state.authors.push(record); this.audit(transaction, 'author.create', 'author', record.id, null, record); return record;
    }});
  }

  updateAuthor(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: authorUpdateSchema, permission: STAGE3_PERMISSIONS.articleManage, action: 'author.update', targetType: 'author', execute: (transaction, value, now) => {
      const before = requireRecord(transaction.state.authors, value.id); requireVersion(before, value.expectedVersion);
      const after: AuthorRecord = { ...before, displayName: value.displayName, byline: value.byline, status: value.status, version: before.version + 1, updatedAt: now };
      replaceById(transaction.state.authors, after); this.audit(transaction, 'author.update', 'author', after.id, before, after); return after;
    }});
  }

  listEditorial(actor: AuthorizedTenantActorContext, rawFilter: unknown = {}) {
    const parsed = articleFilterSchema.safeParse(rawFilter);
    if (!parsed.success) return Promise.resolve(this.invalid(actor, parsed.error));
    const filter = defined(parsed.data) as ArticleFilter;
    return this.query(actor, STAGE3_PERMISSIONS.articleRead, 'article.list', 'article', (state) => {
      this.requireFilterReferences(state, filter);
      return {
        articles: filterArticles(state, filter), categories: state.categories, authors: state.authors,
        publishers: state.publishers.map(({ id, name, attributionLabel }) => ({ id, name, attributionLabel })), regions: state.regions, sites: state.sites, articleSites: state.articleSites,
      };
    });
  }

  createArticle(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: articleCreateSchema, permission: STAGE3_PERMISSIONS.articleManage, action: 'article.create', targetType: 'article', execute: (transaction, value, now) => {
      this.requireArticleReferences(transaction.state, value);
      if (transaction.state.articles.some(({ slug }) => slug === value.slug)) throw new Stage3ConflictError();
      const record: ArticleRecord = { ...this.base(actor, now), ...value, publishedAt: null, archivedAt: null };
      transaction.state.articles.push(record); this.audit(transaction, 'article.create', 'article', record.id, null, record); return record;
    }});
  }

  updateArticle(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: articleUpdateSchema, permission: STAGE3_PERMISSIONS.articleManage, action: 'article.update', targetType: 'article', execute: (transaction, value, now) => {
      this.requireArticleReferences(transaction.state, value);
      const before = requireRecord(transaction.state.articles, value.id); requireVersion(before, value.expectedVersion);
      const after: ArticleRecord = { ...before, regionId: value.regionId, publisherId: value.publisherId, categoryId: value.categoryId, authorId: value.authorId, slug: value.slug, title: value.title, body: value.body, source: value.source, status: value.status, version: before.version + 1, updatedAt: now };
      replaceById(transaction.state.articles, after); this.audit(transaction, 'article.update', 'article', after.id, before, after); return after;
    }});
  }

  private requireFilterReferences(state: Stage3TenantState, filter: ArticleFilter): void {
    if (filter.regionId !== undefined) requireRecord(state.regions, filter.regionId);
    if (filter.siteId !== undefined) requireRecord(state.sites, filter.siteId);
    if (filter.categoryId !== undefined) requireRecord(state.categories, filter.categoryId);
    if (filter.publisherId !== undefined) requireRecord(state.publishers, filter.publisherId);
    if (filter.authorId !== undefined) requireRecord(state.authors, filter.authorId);
  }

  private requireArticleReferences(state: MutableTenantState, value: { regionId: string; publisherId: string | null; categoryId: string | null; authorId: string | null }): void {
    if (requireRecord(state.regions, value.regionId).status !== 'active') throw new Stage3AccessDeniedError();
    if (value.publisherId !== null && requireRecord(state.publishers, value.publisherId).status !== 'active') throw new Stage3AccessDeniedError();
    if (value.categoryId !== null && requireRecord(state.categories, value.categoryId).status !== 'active') throw new Stage3AccessDeniedError();
    if (value.authorId !== null && requireRecord(state.authors, value.authorId).status !== 'active') throw new Stage3AccessDeniedError();
  }

  archiveArticle(actor: AuthorizedTenantActorContext, raw: unknown) { return this.transitionArticle(actor, raw, 'archived'); }
  restoreArticle(actor: AuthorizedTenantActorContext, raw: unknown) { return this.transitionArticle(actor, raw, 'draft'); }
  private transitionArticle(actor: AuthorizedTenantActorContext, raw: unknown, status: 'archived' | 'draft') {
    const action = status === 'archived' ? 'article.archive' : 'article.restore';
    return this.mutate({ actor, raw, schema: articleTransitionSchema, permission: STAGE3_PERMISSIONS.articleManage, action, targetType: 'article', execute: (transaction, value: VersionInput, now) => {
      const before = requireRecord(transaction.state.articles, value.id); requireVersion(before, value.expectedVersion);
      const after: ArticleRecord = { ...before, status, archivedAt: status === 'archived' ? now : null, version: before.version + 1, updatedAt: now };
      replaceById(transaction.state.articles, after); this.audit(transaction, action, 'article', after.id, before, after); return after;
    }});
  }

  assignArticleSites(actor: AuthorizedTenantActorContext, raw: unknown) {
    return this.mutate({ actor, raw, schema: assignmentSchema, permission: STAGE3_PERMISSIONS.articleManage, action: 'article.sites.assign', targetType: 'article', execute: (transaction, value, now) => {
      const article = requireRecord(transaction.state.articles, value.articleId);
      if (article.organizationId !== actor.organizationId) throw new Stage3AccessDeniedError();
      const distinct = [...new Set(value.siteIds)];
      const targetSites = distinct.map((siteId) => requireRecord(transaction.state.sites, siteId));
      if (targetSites.some(({ organizationId, status }) => organizationId !== actor.organizationId || status !== 'active')) throw new Stage3AccessDeniedError();
      const before = transaction.state.articleSites.filter(({ articleId, active }) => articleId === article.id && active);
      for (let index = 0; index < transaction.state.articleSites.length; index += 1) {
        const assignment = transaction.state.articleSites[index]!;
        if (assignment.articleId === article.id) transaction.state.articleSites[index] = { ...assignment, active: false };
      }
      for (const site of targetSites) {
        const existing = transaction.state.articleSites.find(({ articleId, siteId }) => articleId === article.id && siteId === site.id);
        if (existing === undefined) transaction.state.articleSites.push({ ...this.base(actor, now), articleId: article.id, siteId: site.id, state: 'queued', stateOccurredAt: now, publishedUrl: null, publishedAt: null, active: true });
        else Object.assign(existing, { active: true, version: existing.version + 1, updatedAt: now });
      }
      const after = transaction.state.articleSites.filter(({ articleId, active }) => articleId === article.id && active);
      this.audit(transaction, 'article.sites.assign', 'article', article.id, { siteIds: before.map(({ siteId }) => siteId).sort() }, { siteIds: after.map(({ siteId }) => siteId).sort() });
      return after;
    }});
  }

  listPublicArticles(actor: AuthorizedTenantActorContext, siteId: string, rawFilter: unknown = {}) {
    const parsed = articleFilterSchema.safeParse(rawFilter);
    if (!parsed.success) return Promise.resolve(this.invalid(actor, parsed.error));
    const filter = defined(parsed.data) as ArticleFilter;
    return this.query(actor, STAGE3_PERMISSIONS.articleRead, 'public_content.list', 'article', (state) => {
      requireRecord(state.sites, siteId); this.requireFilterReferences(state, filter);
      const articles = selectPublicArticles(state, siteId, filter);
      return articles.map((article) => {
        const publisher = article.publisherId === null ? undefined : state.publishers.find(({ id }) => id === article.publisherId);
        return {
          ...article,
          sourceAttribution: publisher === undefined
            ? { attribution: article.source, independent: false, institutionName: null, claimScopes: [] }
            : buildPublicPublisherClaim(publisher, state.affiliations, siteId),
        };
      });
    });
  }

  dashboard(actor: AuthorizedTenantActorContext): Promise<Result<DashboardProjection, PublicErrorEnvelope>> {
    return this.query(actor, STAGE3_PERMISSIONS.dashboardRead, 'dashboard.read', 'dashboard', buildDashboard);
  }

  analytics(actor: AuthorizedTenantActorContext, rawFilter: unknown = {}): Promise<Result<AnalyticsProjection, PublicErrorEnvelope>> {
    const parsed = analyticsFilterSchema.safeParse(rawFilter);
    if (!parsed.success) return Promise.resolve(this.invalid(actor, parsed.error));
    return this.query(actor, STAGE3_PERMISSIONS.analyticsRead, 'analytics.read', 'analytics', (state) => buildAnalytics(state, parsed.data));
  }

  auditLogs(actor: AuthorizedTenantActorContext, rawFilter: unknown = {}): Promise<Result<readonly AuditRecord[], PublicErrorEnvelope>> {
    const parsed = auditFilterSchema.safeParse(rawFilter);
    if (!parsed.success) return Promise.resolve(this.invalid(actor, parsed.error));
    return this.query(actor, STAGE3_PERMISSIONS.auditRead, 'audit.list', 'audit_log', (state) => filterAuditLogs(state.auditLogs, defined(parsed.data) as AuditFilter));
  }
}
