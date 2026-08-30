import { describe, expect, it } from 'vitest';

import { STAGE3_PERMISSIONS, TenantBusinessService } from '@/application/stage3/tenant-business-service';
import { InMemoryStage3Repository } from '@/infrastructure/testing/stage3-memory';
import {
  ALPHA_ARTICLE_ID, ALPHA_ORGANIZATION_ID, ALPHA_PUBLISHER_ID, ALPHA_SITE_ID, BETA_ORGANIZATION_ID,
  createStage3Actor,
} from '@/infrastructure/testing/stage3-fixture';
import { createStage3Fixture } from '@/app/cms/stage3-composition';
import { SequenceIdentifierGenerator } from '../helpers/stage3';

describe('Stage 3 tenant business services', () => {
  it('executes configuration CRUD through atomic tenant services with optimistic conflicts', async () => {
    const { repository, service } = createStage3Fixture(); const actor = createStage3Actor();
    const created = await service.createDomain(actor, { normalizedHostname: 'new-alpha.example.test', status: 'inactive' });
    expect(created.ok).toBe(true); if (!created.ok) return;
    const updated = await service.updateDomain(actor, { id: created.value.id, expectedVersion: 1, normalizedHostname: 'updated-alpha.example.test', status: 'active' });
    expect(updated.ok).toBe(true);
    const stale = await service.updateDomain(actor, { id: created.value.id, expectedVersion: 1, normalizedHostname: 'stale-alpha.example.test', status: 'active' });
    expect(stale).toMatchObject({ ok: false, error: { error: { code: 'CONFLICT' } } });
    expect(repository.snapshot(ALPHA_ORGANIZATION_ID)?.domains.find(({ id }) => id === created.value.id)?.normalizedHostname).toBe('updated-alpha.example.test');
  });

  it('preserves tenant isolation and records same-shape denial without foreign identifiers', async () => {
    const { repository, service } = createStage3Fixture(); const actor = createStage3Actor();
    const absent = await service.updateSite(actor, { id: '00000000-0000-4000-8000-000000009999', expectedVersion: 1, domainId: '00000000-0000-4000-8000-000000000101', regionId: null, normalizedHostname: 'absent.example.test', status: 'active' });
    const foreign = await service.updateSite(actor, { id: '00000000-0000-4000-8000-000000000203', expectedVersion: 1, domainId: '00000000-0000-4000-8000-000000000101', regionId: null, normalizedHostname: 'foreign.example.test', status: 'active' });
    expect(absent).toEqual(foreign);
    expect(JSON.stringify(repository.snapshot(ALPHA_ORGANIZATION_ID)?.auditLogs)).not.toContain('00000000-0000-4000-8000-000000000203');
    expect(repository.snapshot(BETA_ORGANIZATION_ID)?.sites[0]?.normalizedHostname).toContain('beta');
  });

  it('enforces Publisher verification and verified same-tenant affiliations', async () => {
    const { service } = createStage3Fixture(); const actor = createStage3Actor();
    const created = await service.createPublisher(actor, { name: 'New Independent', type: 'independent_publisher', attributionLabel: 'New Independent', contacts: {}, evidenceReference: 'proof/one' });
    expect(created.ok).toBe(true); if (!created.ok) return;
    const submitted = await service.submitPublisher(actor, { id: created.value.id, expectedVersion: created.value.version });
    expect(submitted.ok).toBe(true); if (!submitted.ok) return;
    const approved = await service.approvePublisher(actor, { id: created.value.id, expectedVersion: submitted.value.version });
    expect(approved.ok).toBe(true); if (!approved.ok) return;
    const affiliation = await service.createAffiliation(actor, { publisherId: approved.value.id, siteId: ALPHA_SITE_ID, institutionName: 'Wonosobo Office', claimScopes: ['site_name'], evidenceReference: 'proof/affiliation' });
    expect(affiliation.ok).toBe(true); if (!affiliation.ok) return;
    const claim = await service.getPublisherClaim(actor, approved.value.id, ALPHA_SITE_ID);
    expect(claim).toMatchObject({ ok: true, value: { independent: true, institutionName: 'Wonosobo Office' } });
    const revoked = await service.updateAffiliation(actor, { id: affiliation.value.id, expectedVersion: affiliation.value.version, institutionName: 'Wonosobo Office', claimScopes: ['site_name'], evidenceReference: 'proof/affiliation', active: false });
    expect(revoked).toMatchObject({ ok: true, value: { active: false } });
    expect(await service.getPublisherClaim(actor, approved.value.id, ALPHA_SITE_ID)).toMatchObject({ ok: true, value: { institutionName: null, claimScopes: [] } });
    const falseReassignment = await service.updateAffiliation(actor, { id: affiliation.value.id, expectedVersion: affiliation.value.version + 1, publisherId: ALPHA_PUBLISHER_ID, siteId: ALPHA_SITE_ID, institutionName: 'False', claimScopes: ['site_name'], evidenceReference: 'proof/false', active: true });
    expect(falseReassignment).toMatchObject({ ok: false, error: { error: { code: 'INVALID_INPUT' } } });
    const changed = await service.updatePublisher(actor, { id: approved.value.id, expectedVersion: approved.value.version, name: 'Changed Identity', type: 'independent_publisher', attributionLabel: 'Changed', contacts: {}, evidenceReference: 'proof/two' });
    expect(changed).toMatchObject({ ok: true, value: { verificationStatus: 'unverified' } });
  });

  it('maintains canonical Articles, set assignments, combined filtering, and public eligibility', async () => {
    const { repository, service } = createStage3Fixture(); const actor = createStage3Actor();
    const editorial = await service.listEditorial(actor); expect(editorial.ok).toBe(true); if (!editorial.ok) return;
    const source = editorial.value.articles[0]!;
    const outcomeBeforeReassignment = repository.snapshot(ALPHA_ORGANIZATION_ID)?.articleSites[0];
    expect(outcomeBeforeReassignment).toBeDefined(); if (outcomeBeforeReassignment === undefined) return;
    const assigned = await service.assignArticleSites(actor, { articleId: source.id, siteIds: [ALPHA_SITE_ID, ALPHA_SITE_ID] });
    expect(assigned).toMatchObject({ ok: true }); if (!assigned.ok) return;
    expect(assigned.value).toHaveLength(1);
    expect(assigned.value[0]?.stateOccurredAt).toBe(outcomeBeforeReassignment.stateOccurredAt);
    const historicalAnalytics = await service.analytics(actor, {
      from: outcomeBeforeReassignment.stateOccurredAt,
      to: outcomeBeforeReassignment.stateOccurredAt,
    });
    expect(historicalAnalytics).toMatchObject({
      ok: true,
      value: { outcomesBySiteAndState: [{ key: `${ALPHA_SITE_ID}:published`, count: 1 }] },
    });
    expect(repository.snapshot(ALPHA_ORGANIZATION_ID)?.articles).toHaveLength(1);
    const filtered = await service.listEditorial(actor, { regionId: source.regionId, siteId: ALPHA_SITE_ID, publisherId: ALPHA_PUBLISHER_ID, search: 'canonical' });
    expect(filtered.ok && filtered.value.articles.map(({ id }) => id)).toEqual([ALPHA_ARTICLE_ID]);
    const invalidBefore = repository.snapshot(ALPHA_ORGANIZATION_ID);
    const invalid = await service.assignArticleSites(actor, { articleId: source.id, siteIds: [ALPHA_SITE_ID, '00000000-0000-4000-8000-000000000203'] });
    expect(invalid.ok).toBe(false);
    expect(repository.snapshot(ALPHA_ORGANIZATION_ID)?.articleSites).toEqual(invalidBefore?.articleSites);
  });

  it('preserves omitted Site Settings fields during partial CMS edits', async () => {
    const { repository, service } = createStage3Fixture(); const actor = createStage3Actor();
    const before = repository.snapshot(ALPHA_ORGANIZATION_ID)?.siteSettings[0];
    expect(before).toBeDefined(); if (before === undefined) return;
    const updated = await service.saveSiteSettings(actor, { siteId: before.siteId, expectedVersion: before.version, name: 'Updated name', description: 'Updated description' });
    expect(updated).toMatchObject({ ok: true, value: { name: 'Updated name', colors: before.colors, socialLinks: before.socialLinks, seo: before.seo, navigation: before.navigation } });
  });

  it('returns scoped dashboard, analytics, filtered immutable audits, and zero-safe measures', async () => {
    const { service } = createStage3Fixture(); const actor = createStage3Actor();
    const dashboard = await service.dashboard(actor); expect(dashboard).toMatchObject({ ok: true, value: { activeDomains: 1, activeSites: 1, activeArticles: 1, archivedArticles: 0, successfulSiteOutcomes: 1 } });
    const analytics = await service.analytics(actor); expect(analytics.ok).toBe(true); if (analytics.ok) expect(analytics.value.articlesByRegion).toHaveLength(1);
    await service.createRegion(actor, { externalKey: 'magelang', name: 'Magelang', slug: 'magelang', status: 'active' });
    const logs = await service.auditLogs(actor, { action: 'region.create', outcome: 'succeeded' });
    expect(logs.ok).toBe(true); if (logs.ok) expect(logs.value).toHaveLength(1);
  });

  it('redacts configuration modules without their permissions and preserves the global User profile during Membership changes', async () => {
    const fixture = createStage3Fixture();
    const original = structuredClone(fixture.repository.snapshot(ALPHA_ORGANIZATION_ID)!);
    const role = original.roles[0]!;
    const state = { ...original, roles: [{ ...role, permissions: new Set([STAGE3_PERMISSIONS.siteRead, STAGE3_PERMISSIONS.membershipManage]) }] };
    const repository = new InMemoryStage3Repository([state]);
    const service = new TenantBusinessService(repository, new SequenceIdentifierGenerator());
    const siteOnlyActor = { ...createStage3Actor(), permissionSet: new Set([STAGE3_PERMISSIONS.siteRead]) };
    const configuration = await service.listConfiguration(siteOnlyActor);
    expect(configuration).toMatchObject({ ok: true, value: { domains: [], regions: [], roles: [], memberships: [] } });
    if (!configuration.ok) return;
    expect(configuration.value.sites.length).toBeGreaterThan(0);
    const domainRoleState = { ...original, roles: [{ ...role, permissions: new Set([STAGE3_PERMISSIONS.domainManage]) }] };
    const domainService = new TenantBusinessService(new InMemoryStage3Repository([domainRoleState]), new SequenceIdentifierGenerator());
    const domainConfiguration = await domainService.listConfiguration({ ...createStage3Actor(), permissionSet: new Set([STAGE3_PERMISSIONS.domainManage]) });
    expect(domainConfiguration).toMatchObject({ ok: true, value: { sites: [], roles: [], memberships: [] } });
    if (domainConfiguration.ok) expect(domainConfiguration.value.domains.length).toBeGreaterThan(0);
    const actor = { ...createStage3Actor(), permissionSet: new Set([STAGE3_PERMISSIONS.siteRead, STAGE3_PERMISSIONS.membershipManage]) };
    const member = state.memberships[0]!;
    const changed = await service.saveMembership(actor, { userId: member.userId, roleId: member.roleId, status: 'inactive', expectedVersion: member.version });
    expect(changed).toMatchObject({ ok: true, value: { displayName: member.displayName, status: 'inactive' } });
    expect(repository.snapshot(ALPHA_ORGANIZATION_ID)?.memberships[0]?.displayName).toBe(member.displayName);
    const callerControlledName = await service.saveMembership(actor, { userId: member.userId, displayName: 'Tenant attempted rename', roleId: member.roleId, status: 'active', expectedVersion: member.version + 1 });
    expect(callerControlledName).toMatchObject({ ok: false, error: { error: { code: 'INVALID_INPUT' } } });
  });

  it('audits attributable context denials and rejects unknown Role permissions without mutation', async () => {
    const { repository, service } = createStage3Fixture();
    const denied = await service.dashboard({ ...createStage3Actor(), actorId: '00000000-0000-4000-8000-000000009998' });
    expect(denied).toMatchObject({ ok: false, error: { error: { code: 'RESOURCE_UNAVAILABLE' } } });
    expect(repository.snapshot(ALPHA_ORGANIZATION_ID)?.auditLogs.some(({ action, outcome }) => action === 'dashboard.read' && outcome === 'denied')).toBe(true);
    const before = repository.snapshot(ALPHA_ORGANIZATION_ID)?.roles;
    const invalid = await service.createRole(createStage3Actor(), { name: 'Invalid', active: true, permissions: ['article.raed'] });
    expect(invalid).toMatchObject({ ok: false, error: { error: { code: 'INVALID_INPUT' } } });
    expect(repository.snapshot(ALPHA_ORGANIZATION_ID)?.roles).toEqual(before);
  });

  it('rolls back every security-sensitive mutation when audit persistence fails', async () => {
    const repository = new InMemoryStage3Repository([createStage3Fixture().repository.snapshot(ALPHA_ORGANIZATION_ID)!]);
    const service = new TenantBusinessService(repository, new SequenceIdentifierGenerator());
    const before = repository.snapshot(ALPHA_ORGANIZATION_ID); repository.failNextAudit = true;
    const result = await service.createCategory(createStage3Actor(), { name: 'Rollback', slug: 'rollback', status: 'active' });
    expect(result).toMatchObject({ ok: false, error: { error: { code: 'INTERNAL_ERROR' } } });
    expect(repository.snapshot(ALPHA_ORGANIZATION_ID)).toEqual(before);
  });
});
