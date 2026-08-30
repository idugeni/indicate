import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import type { AnalyticsPoint, PublishingState } from '@/domain/stage3/models';
import { buildAnalytics, buildDashboard } from '@/domain/stage3/policies';
import { assertProperty } from '../helpers/property';
import { base, emptyStage3State, ORG_ID } from '../helpers/stage3';

// Feature: indicate-mvp, Property 9: Tenant aggregates equal a scoped reference model
// **Validates: Requirements 7.23, 7.24, 7.25, 7.26, 7.27, 18.14, 18.15**
describe('Property 9: scoped aggregates', () => {
  it('matches a multi-tenant, immutable-target, date-filtered reference model', () => {
    const states = ['queued', 'processing', 'published', 'failed', 'retrying'] as const;
    const early = '2026-08-01T00:00:00.000Z';
    const late = '2026-09-01T00:00:00.000Z';
    const foreignOrganizationId = '00000000-0000-4000-8000-000000000002';
    const group = (values: readonly string[]): readonly AnalyticsPoint[] => {
      const counts = new Map<string, number>();
      for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
      return [...counts].sort(([left], [right]) => left.localeCompare(right)).map(([key, count]) => ({ key, count }));
    };

    assertProperty('Property 9: Tenant aggregates equal a scoped reference model', fc.property(
      fc.array(fc.record({
        currentTenant: fc.boolean(),
        articleStatus: fc.constantFrom('active' as const, 'archived' as const, 'draft' as const),
        articleRegion: fc.integer({ min: 0, max: 3 }),
        siteRegion: fc.integer({ min: 0, max: 3 }),
        category: fc.option(fc.integer({ min: 0, max: 3 }), { nil: null }),
        publisher: fc.option(fc.integer({ min: 0, max: 3 }), { nil: null }),
        jobState: fc.constantFrom(...states),
        outcomeState: fc.constantFrom(...states),
        articleLate: fc.boolean(), jobLate: fc.boolean(), outcomeLate: fc.boolean(), nonStateEditLate: fc.boolean(),
      }), { maxLength: 40 }),
      fc.constantFrom('all' as const, 'early' as const, 'late' as const),
      (values, period) => {
        const articles = values.map((value, index) => {
          const organizationId = value.currentTenant ? ORG_ID : foreignOrganizationId;
          return { ...base(`article-${index}`), organizationId, regionId: `article-region-${value.articleRegion}`, publisherId: value.publisher === null ? null : `publisher-${value.publisher}`, categoryId: value.category === null ? null : `category-${value.category}`, authorId: null, slug: `article-${index}`, title: `Article ${index}`, body: 'Body', source: 'Source', status: value.articleStatus, publishedAt: null, archivedAt: value.articleStatus === 'archived' ? late : null, createdAt: value.articleLate ? late : early, updatedAt: value.articleLate ? late : early };
        });
        const sites = values.flatMap((value, index) => {
          const organizationId = value.currentTenant ? ORG_ID : foreignOrganizationId;
          return [
            { ...base(`target-site-${index}`), organizationId, domainId: `domain-${index}`, regionId: `site-region-${value.siteRegion}`, normalizedHostname: `target-${index}.example.test`, status: 'active' as const, activationState: 'active' as const },
            { ...base(`current-site-${index}`), organizationId, domainId: `domain-${index}`, regionId: `current-region-${value.siteRegion}`, normalizedHostname: `current-${index}.example.test`, status: 'active' as const, activationState: 'active' as const },
          ];
        });
        const articleSites = values.flatMap((value, index) => {
          const organizationId = value.currentTenant ? ORG_ID : foreignOrganizationId;
          const outcomeAt = value.outcomeLate ? late : early;
          return [
            { ...base(`target-assignment-${index}`), organizationId, articleId: `article-${index}`, siteId: `target-site-${index}`, state: value.outcomeState, stateOccurredAt: outcomeAt, publishedUrl: value.outcomeState === 'published' ? `https://target-${index}.example.test/article` : null, publishedAt: value.outcomeState === 'published' ? outcomeAt : null, active: false, updatedAt: value.nonStateEditLate ? late : outcomeAt },
            { ...base(`current-assignment-${index}`), organizationId, articleId: `article-${index}`, siteId: `current-site-${index}`, state: 'queued' as const, stateOccurredAt: outcomeAt, publishedUrl: null, publishedAt: null, active: true, updatedAt: value.nonStateEditLate ? late : outcomeAt },
          ];
        });
        const publishingJobs = values.map((value, index) => ({ id: `job-${index}`, organizationId: value.currentTenant ? ORG_ID : foreignOrganizationId, articleId: `article-${index}`, state: value.jobState, createdAt: early, occurredAt: value.jobLate ? late : early }));
        const publishingJobTargets = values.map((value, index) => ({ id: `target-${index}`, organizationId: value.currentTenant ? ORG_ID : foreignOrganizationId, jobId: `job-${index}`, articleSiteId: `target-assignment-${index}`, state: value.outcomeState, occurredAt: value.outcomeLate ? late : early }));
        const state = emptyStage3State({ articles, sites, articleSites, publishingJobs, publishingJobTargets });
        const filter = period === 'all' ? {} : period === 'early' ? { to: early } : { from: late };
        const projection = buildAnalytics(state, filter);
        const inPeriod = (isLate: boolean) => period === 'all' || (period === 'late' ? isLate : !isLate);
        const tenantValues = values.map((value, index) => ({ value, index })).filter(({ value }) => value.currentTenant);
        const periodArticles = tenantValues.filter(({ value }) => inPeriod(value.articleLate));
        const periodJobs = tenantValues.filter(({ value }) => inPeriod(value.jobLate));
        const periodOutcomes = tenantValues.filter(({ value }) => inPeriod(value.outcomeLate));
        expect(projection).toEqual({
          articlesByRegion: group(periodArticles.map(({ value }) => `article-region-${value.articleRegion}`)),
          articlesBySite: group(periodArticles.map(({ index }) => `current-site-${index}`)),
          articlesByCategory: group(periodArticles.flatMap(({ value }) => value.category === null ? [] : [`category-${value.category}`])),
          articlesByPublisher: group(periodArticles.flatMap(({ value }) => value.publisher === null ? [] : [`publisher-${value.publisher}`])),
          jobsByState: group(periodJobs.map(({ value }) => value.jobState)),
          jobsBySiteRegionAndState: group(periodJobs.map(({ value, index }) => `target-site-${index}:site-region-${value.siteRegion}:${value.jobState}`)),
          outcomesBySiteAndState: group(periodOutcomes.flatMap(({ value, index }) => [`target-site-${index}:${value.outcomeState}`, `current-site-${index}:queued`])),
          outcomesBySiteRegionAndState: group(periodOutcomes.flatMap(({ value, index }) => [`target-site-${index}:site-region-${value.siteRegion}:${value.outcomeState}`, `current-site-${index}:current-region-${value.siteRegion}:queued`])),
        });

        const dashboard = buildDashboard(state);
        expect(dashboard.activeArticles).toBe(tenantValues.filter(({ value }) => value.articleStatus === 'active').length);
        expect(dashboard.archivedArticles).toBe(tenantValues.filter(({ value }) => value.articleStatus === 'archived').length);
        expect((states as readonly PublishingState[]).reduce((total, jobState) => total + dashboard.jobsByState[jobState], 0)).toBe(tenantValues.length);
        expect(dashboard.successfulSiteOutcomes).toBe(tenantValues.filter(({ value }) => value.outcomeState === 'published').length);
      },
    ));
  });
});
