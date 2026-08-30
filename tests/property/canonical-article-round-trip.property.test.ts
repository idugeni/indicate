import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { TenantBusinessService } from '@/application/stage3/tenant-business-service';
import { InMemoryStage3Repository } from '@/infrastructure/testing/stage3-memory';
import { assertAsyncProperty } from '../helpers/property';
import { base, emptyStage3State, ORG_ID, SequenceIdentifierGenerator, stage3Actor } from '../helpers/stage3';

// Feature: indicate-mvp, Property 11: Canonical Article round trips preserve identity and ownership
// **Validates: Requirements 9.2, 9.5, 9.6, 21.1, 21.2**
describe('Property 11: canonical article round trips', () => {
  it('create-then-read is equivalent and update/archive/restore preserve identity, ownership, and history', async () => {
    await assertAsyncProperty('Property 11: Canonical Article round trips preserve identity and ownership', fc.asyncProperty(
      fc.record({
        slugSuffix: fc.stringMatching(/^[a-z0-9]{1,20}$/),
        title: fc.string({ minLength: 1, maxLength: 60 }).filter((value) => value.trim().length > 0),
        body: fc.string({ minLength: 1, maxLength: 120 }).filter((value) => value.trim().length > 0),
        source: fc.string({ minLength: 1, maxLength: 40 }).filter((value) => value.trim().length > 0),
        withPublisher: fc.boolean(), withCategory: fc.boolean(), withAuthor: fc.boolean(),
      }),
      async (input) => {
        const regionId = '00000000-0000-4000-8000-000000000030';
        const publisherId = '00000000-0000-4000-8000-000000000031';
        const categoryId = '00000000-0000-4000-8000-000000000032';
        const authorId = '00000000-0000-4000-8000-000000000033';
        const siteId = '00000000-0000-4000-8000-000000000034';
        const state = emptyStage3State({
          regions: [{ ...base(regionId), externalKey: 'region', name: 'Region', slug: 'region', status: 'active' }],
          publishers: [{ ...base(publisherId), name: 'Publisher', type: 'organization', attributionLabel: 'Publisher', contacts: {}, evidenceReference: null, verificationStatus: 'unverified', submittedBy: null, submittedAt: null, verifiedBy: null, verifiedAt: null, rejectionReason: null, status: 'active' }],
          categories: [{ ...base(categoryId), name: 'Category', slug: 'category', status: 'active' }],
          authors: [{ ...base(authorId), displayName: 'Author', byline: 'By Author', status: 'active' }],
          sites: [{ ...base(siteId), domainId: 'domain', regionId, normalizedHostname: 'region.example.test', status: 'active', activationState: 'active' }],
        });
        const repository = new InMemoryStage3Repository([state]);
        const service = new TenantBusinessService(repository, new SequenceIdentifierGenerator());
        const command = {
          regionId,
          publisherId: input.withPublisher ? publisherId : null,
          categoryId: input.withCategory ? categoryId : null,
          authorId: input.withAuthor ? authorId : null,
          slug: `article-${input.slugSuffix}`,
          title: input.title.trim(), body: input.body.trim(), source: input.source.trim(), status: 'draft' as const,
        };
        const created = await service.createArticle(stage3Actor(), command);
        expect(created.ok).toBe(true); if (!created.ok) return;
        const read = await service.listEditorial(stage3Actor());
        expect(read.ok).toBe(true); if (!read.ok) return;
        expect(read.value.articles.find(({ id }) => id === created.value.id)).toEqual(created.value);
        expect(created.value).toMatchObject({ ...command, organizationId: ORG_ID });

        const assigned = await service.assignArticleSites(stage3Actor(), { articleId: created.value.id, siteIds: [siteId] });
        expect(assigned.ok).toBe(true); if (!assigned.ok) return;
        const historyBefore = repository.snapshot(ORG_ID)!.articleSites;
        const updatedBody = `${created.value.body} updated`;
        const updated = await service.updateArticle(stage3Actor(), {
          ...command, id: created.value.id, expectedVersion: created.value.version,
          title: `${command.title} updated`, body: updatedBody, status: 'active',
        });
        expect(updated.ok).toBe(true); if (!updated.ok) return;
        expect(updated.value.id).toBe(created.value.id);
        expect(updated.value.organizationId).toBe(ORG_ID);
        const archived = await service.archiveArticle(stage3Actor(), { id: updated.value.id, expectedVersion: updated.value.version });
        expect(archived.ok).toBe(true); if (!archived.ok) return;
        const restored = await service.restoreArticle(stage3Actor(), { id: archived.value.id, expectedVersion: archived.value.version });
        expect(restored.ok).toBe(true); if (!restored.ok) return;
        expect(restored.value).toMatchObject({ id: created.value.id, organizationId: ORG_ID, body: updatedBody, publisherId: command.publisherId, categoryId: command.categoryId, authorId: command.authorId });
        expect(repository.snapshot(ORG_ID)!.articleSites).toEqual(historyBefore);
      },
    ));
  });
});
