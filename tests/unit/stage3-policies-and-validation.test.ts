import { describe, expect, it } from 'vitest';

import { articleCreateSchema, domainCreateSchema, roleCreateSchema, siteSettingsSchema } from '@/application/stage3/schemas';
import { buildAnalytics, buildDashboard, buildPublicPublisherClaim, filterArticles, filterAuditLogs, selectPublicArticles } from '@/domain/stage3/policies';
import { emptyStage3State } from '../helpers/stage3';

describe('Stage 3 schemas and pure policies', () => {
  it('returns field-specific errors for invalid server-boundary input', () => {
    expect(domainCreateSchema.safeParse({ normalizedHostname: 'not a host', status: 'active' }).error?.issues[0]?.path).toEqual(['normalizedHostname']);
    expect(articleCreateSchema.safeParse({ title: '' }).success).toBe(false);
    expect(siteSettingsSchema.safeParse({ siteId: 'bad' }).success).toBe(false);
  });

  it('produces complete zero-safe dashboard and analytics projections', () => {
    const dashboard = buildDashboard(emptyStage3State());
    expect(dashboard).toEqual({ activeDomains: 0, activeSites: 0, activeArticles: 0, archivedArticles: 0, jobsByState: { queued: 0, processing: 0, published: 0, failed: 0, retrying: 0 }, successfulSiteOutcomes: 0, failedSiteOutcomes: 0, activeMedia: 0 });
    expect(buildAnalytics(emptyStage3State())).toEqual({ articlesByRegion: [], articlesBySite: [], articlesByCategory: [], articlesByPublisher: [], jobsByState: [], jobsBySiteRegionAndState: [], outcomesBySiteAndState: [], outcomesBySiteRegionAndState: [] });
  });

  it('never grants official claims from unverified publishers', () => {
    const claim = buildPublicPublisherClaim({ id: 'publisher', organizationId: 'org', version: 1, createdAt: '', updatedAt: '', name: 'Independent', type: 'independent_publisher', attributionLabel: 'Independent', contacts: {}, evidenceReference: null, verificationStatus: 'pending', submittedBy: null, submittedAt: null, verifiedBy: null, verifiedAt: null, rejectionReason: null, status: 'active' }, [{ id: 'affiliation', organizationId: 'org', version: 1, createdAt: '', updatedAt: '', publisherId: 'publisher', siteId: 'site', institutionName: 'Institution', claimScopes: ['official'], evidenceReference: 'proof', active: true, verifiedAt: '2026-08-30T00:00:00.000Z' }], 'site');
    expect(claim).toEqual({ attribution: 'Independent', independent: true, institutionName: null, claimScopes: [] });
  });

  it('rejects unknown Role grants before a persistence adapter can silently discard them', () => {
    expect(roleCreateSchema.safeParse({ name: 'Broken', active: true, permissions: ['article.raed'] }).success).toBe(false);
    expect(roleCreateSchema.safeParse({ name: 'Editor', active: true, permissions: ['article.read', 'article.manage'] }).success).toBe(true);
  });

  it('requires one Site assignment to satisfy every assignment filter and an active Region for public selection', () => {
    const base = { id: 'article', organizationId: 'org', regionId: 'region', publisherId: null, categoryId: null, authorId: null, slug: 'article', title: 'Article', body: 'Body', source: 'Source', status: 'active' as const, publishedAt: null, archivedAt: null, version: 1, createdAt: '2026-08-30T00:00:00.000Z', updatedAt: '2026-08-30T00:00:00.000Z' };
    const assignmentBase = { organizationId: 'org', articleId: 'article', stateOccurredAt: base.createdAt, publishedUrl: null, publishedAt: null, active: true, version: 1, createdAt: base.createdAt, updatedAt: base.updatedAt };
    const state = { ...emptyStage3State({ organizationId: 'org' }), regions: [{ id: 'region', organizationId: 'org', externalKey: 'region', name: 'Region', slug: 'region', status: 'active' as const, version: 1, createdAt: base.createdAt, updatedAt: base.updatedAt }], sites: [{ id: 'site-a', organizationId: 'org', domainId: 'domain', regionId: 'region', normalizedHostname: 'a.example.test', status: 'active' as const, activationState: 'active' as const, version: 1, createdAt: base.createdAt, updatedAt: base.updatedAt }], articles: [base], articleSites: [{ ...assignmentBase, id: 'a', siteId: 'site-a', state: 'published' as const }, { ...assignmentBase, id: 'b', siteId: 'site-b', state: 'failed' as const }] };
    expect(filterArticles(state, { siteId: 'site-a', publicationState: 'failed' })).toEqual([]);
    expect(selectPublicArticles(state, 'site-a')).toEqual([base]);
    expect(selectPublicArticles({ ...state, regions: state.regions.map((region) => ({ ...region, status: 'inactive' as const })) }, 'site-a')).toEqual([]);
  });

  it('combines every audit filter inside the supplied tenant log set', () => {
    const logs = [{ id: '1', organizationId: 'org', actorType: 'user' as const, actorId: 'user', entryPoint: 'cms' as const, action: 'article.update', targetType: 'article', targetId: 'article', outcome: 'succeeded' as const, changedFields: ['title'], before: null, after: null, requestId: 'request', occurredAt: '2026-08-30T00:00:00.000Z' }];
    expect(filterAuditLogs(logs, { actorId: 'user', action: 'article.update', targetType: 'article', outcome: 'succeeded', from: '2026-08-29T00:00:00.000Z', to: '2026-08-31T00:00:00.000Z' })).toEqual(logs);
    expect(filterAuditLogs(logs, { actorId: 'other' })).toEqual([]);
  });
});
