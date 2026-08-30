import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { TenantBusinessService } from '@/application/stage3/tenant-business-service';
import { InMemoryStage3Repository } from '@/infrastructure/testing/stage3-memory';
import { assertAsyncProperty } from '../helpers/property';
import { base, emptyStage3State, ORG_ID, SequenceIdentifierGenerator, stage3Actor } from '../helpers/stage3';

// Feature: indicate-mvp, Property 12: Site assignment is a canonical distinct set
// **Validates: Requirements 9.7, 9.8, 9.9, 9.10, 9.11, 21.3, 21.4**
describe('Property 12: distinct canonical Site assignment', () => {
  it('deduplicates every valid permutation and atomically rejects absent, inactive, and foreign Sites', async () => {
    await assertAsyncProperty('Property 12: Site assignment is a canonical distinct set', fc.asyncProperty(
      fc.array(fc.integer({ min: 0, max: 5 }), { maxLength: 30 }),
      fc.constantFrom('none' as const, 'absent' as const, 'inactive' as const, 'foreign' as const),
      async (indices, invalidKind) => {
        const articleId = '00000000-0000-4000-8000-000000000040';
        const sites = Array.from({ length: 6 }, (_, index) => ({ ...base(`00000000-0000-4000-8000-${String(100 + index).padStart(12, '0')}`), domainId: 'domain', regionId: null, normalizedHostname: `site-${index}.example.test`, status: 'active' as const, activationState: 'active' as const }));
        const invalidSiteId = '00000000-0000-4000-8000-000000000999';
        const invalidSite = invalidKind === 'inactive'
          ? { ...base(invalidSiteId), domainId: 'domain', regionId: null, normalizedHostname: 'inactive.example.test', status: 'inactive' as const, activationState: 'inactive' as const }
          : invalidKind === 'foreign'
            ? { ...base(invalidSiteId), organizationId: '00000000-0000-4000-8000-000000000002', domainId: 'foreign-domain', regionId: null, normalizedHostname: 'foreign.example.test', status: 'active' as const, activationState: 'active' as const }
            : null;
        const article = { ...base(articleId), regionId: 'region', publisherId: null, categoryId: null, authorId: null, slug: 'canonical', title: 'Canonical', body: 'Only body', source: 'Source', status: 'draft' as const, publishedAt: null, archivedAt: null };
        const repository = new InMemoryStage3Repository([emptyStage3State({ sites: invalidSite === null ? sites : [...sites, invalidSite], articles: [article] })]);
        const service = new TenantBusinessService(repository, new SequenceIdentifierGenerator());
        const validIds = indices.map((index) => sites[index]!.id);
        const requestedIds = invalidKind === 'none' ? validIds : [...validIds, invalidSiteId];
        const before = repository.snapshot(ORG_ID)!;
        const result = await service.assignArticleSites(stage3Actor(), { articleId, siteIds: requestedIds });
        if (invalidKind !== 'none') {
          expect(result.ok).toBe(false);
          expect(repository.snapshot(ORG_ID)?.articles).toEqual(before.articles);
          expect(repository.snapshot(ORG_ID)?.articleSites).toEqual(before.articleSites);
          expect(repository.snapshot(ORG_ID)?.auditLogs.at(-1)).toMatchObject({ action: 'article.sites.assign', outcome: 'denied' });
          return;
        }
        expect(result.ok).toBe(true); if (!result.ok) return;
        expect(result.value.map(({ siteId }) => siteId).sort()).toEqual([...new Set(validIds)].sort());
        expect(repository.snapshot(ORG_ID)?.articles).toEqual([article]);
        expect(result.value.every((assignment) => !('title' in assignment) && !('body' in assignment))).toBe(true);
        const repeated = await service.assignArticleSites(stage3Actor(), { articleId, siteIds: [...validIds].reverse() });
        expect(repeated.ok).toBe(true); if (!repeated.ok) return;
        expect(repeated.value).toHaveLength(new Set(validIds).size);
        expect(repository.snapshot(ORG_ID)?.articles).toEqual([article]);
      },
    ));
  });
});
