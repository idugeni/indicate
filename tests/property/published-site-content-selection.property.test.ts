import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { selectPublicArticles } from '@/domain/stage3/policies';
import { assertProperty } from '../helpers/property';
import { base, emptyStage3State, ORG_ID } from '../helpers/stage3';

// Feature: indicate-mvp, Property 13: Public content selection requires a published Site relation
// **Validates: Requirements 10.1, 10.2, 10.3, 10.5, 10.6, 10.7, 10.8, 10.9, 10.10, 10.11, 21.23**
describe('Property 13: published Site content selection', () => {
  it('matches the scoped eligibility model across activation, publication, category, and search filters', () => {
    assertProperty('Property 13: Public content selection requires a published Site relation', fc.property(
      fc.constantFrom('inactive' as const, 'pending' as const, 'active' as const, 'failed' as const),
      fc.boolean(),
      fc.boolean(),
      fc.boolean(),
      fc.array(fc.record({
        currentTenant: fc.boolean(), articleActive: fc.boolean(), assignmentActive: fc.boolean(),
        published: fc.boolean(), matchingSite: fc.boolean(), matchingRegion: fc.boolean(),
        matchingCategory: fc.boolean(), matchingSearch: fc.boolean(), regionActive: fc.boolean(),
      }), { maxLength: 50 }),
      (activationState, selectedRegionActive, useCategoryFilter, useSearchFilter, values) => {
        const siteId = 'site'; const regionId = 'region'; const categoryId = 'category';
        const foreignOrganizationId = '00000000-0000-4000-8000-000000000002';
        const articles = values.map((value, index) => ({
          ...base(`article-${index}`),
          organizationId: value.currentTenant ? ORG_ID : foreignOrganizationId,
          regionId: value.matchingRegion ? regionId : `other-region-${index}`,
          publisherId: null,
          categoryId: value.matchingCategory ? categoryId : `other-category-${index}`,
          authorId: null,
          slug: `article-${index}`,
          title: value.matchingSearch ? `Needle Article ${index}` : `Other Article ${index}`,
          body: 'Body', source: 'Source',
          status: value.articleActive ? 'active' as const : 'archived' as const,
          publishedAt: null,
          archivedAt: value.articleActive ? null : '2026-08-30T00:00:00.000Z',
        }));
        const articleSites = values.map((value, index) => ({
          ...base(`assignment-${index}`),
          organizationId: value.currentTenant ? ORG_ID : foreignOrganizationId,
          articleId: `article-${index}`,
          siteId: value.matchingSite ? siteId : `other-site-${index}`,
          state: value.published ? 'published' as const : 'queued' as const,
          stateOccurredAt: '2026-08-30T00:00:00.000Z',
          publishedUrl: value.published ? 'https://site.example/article' : null,
          publishedAt: value.published ? '2026-08-30T00:00:00.000Z' : null,
          active: value.assignmentActive,
        }));
        const regions = [
          { ...base(regionId), externalKey: regionId, name: 'Selected Region', slug: regionId, status: selectedRegionActive ? 'active' as const : 'inactive' as const },
          ...values.map((value, index) => ({ ...base(`other-region-${index}`), organizationId: value.currentTenant ? ORG_ID : foreignOrganizationId, externalKey: `other-${index}`, name: `Other ${index}`, slug: `other-${index}`, status: value.regionActive ? 'active' as const : 'inactive' as const })),
        ];
        const state = emptyStage3State({
          regions,
          categories: [{ ...base(categoryId), name: 'Selected', slug: 'selected', status: 'active' }],
          sites: [{ ...base(siteId), domainId: 'domain', regionId, normalizedHostname: 'site.example.test', status: 'active', activationState }],
          articles,
          articleSites,
        });
        const filter = {
          ...(useCategoryFilter ? { categoryId } : {}),
          ...(useSearchFilter ? { search: 'needle' } : {}),
        };
        const result = selectPublicArticles(state, siteId, filter);
        const eligibleSite = activationState === 'active' && selectedRegionActive;
        const expected = articles.filter((_, index) => {
          const value = values[index]!;
          return eligibleSite
            && value.currentTenant
            && value.articleActive
            && value.assignmentActive
            && value.published
            && value.matchingSite
            && value.matchingRegion
            && (!useCategoryFilter || value.matchingCategory)
            && (!useSearchFilter || value.matchingSearch);
        });
        expect(result.map(({ id }) => id)).toEqual(expected.map(({ id }) => id));
      },
    ));
  });
});
