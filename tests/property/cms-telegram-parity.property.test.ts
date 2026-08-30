import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { TenantBusinessService } from '@/application/stage3/tenant-business-service';
import { MediaService } from '@/application/stage4/media-service';
import { PublicationService } from '@/application/stage4/publication-service';
import { TelegramWorkflowService } from '@/application/stage6/telegram-workflow-service';
import { InMemoryStage6Repository } from '@/infrastructure/testing/stage6-memory';
import { createStage3Actor, createStage3RepositoryFixture, ALPHA_ORGANIZATION_ID, ALPHA_REGION_ID } from '@/infrastructure/testing/stage3-fixture';
import { createStage4RepositoryFixture } from '@/infrastructure/testing/stage4-fixture';
import { SequenceIdentifierGenerator } from '../helpers/stage3';
import { assertAsyncProperty } from '../helpers/property';

// Feature: indicate-mvp, Property 27: CMS and Telegram commands are behaviorally equivalent
// **Validates: Requirements 13.3, 13.4, 13.5, 13.6, 13.7, 13.8, 13.9, 13.10, 13.11, 13.12, 13.13, 21.24**
describe('Property 27: CMS and Telegram behavioral parity', () => {
  it('maps generated authorized Article conversations to the exact shared service outcome', async () => {
    await assertAsyncProperty('Property 27: CMS and Telegram commands are behaviorally equivalent', fc.asyncProperty(
      fc.record({
        suffix: fc.stringMatching(/^[a-z0-9]{1,12}$/),
        title: fc.string({ minLength: 1, maxLength: 60 }).filter((value) => value.trim().length > 0 && !value.startsWith('/')),
        body: fc.string({ minLength: 1, maxLength: 100 }).filter((value) => value.trim().length > 0 && !value.startsWith('/')),
        source: fc.string({ minLength: 1, maxLength: 40 }).filter((value) => value.trim().length > 0 && !value.startsWith('/')),
      }),
      async ({ suffix, title, body, source }) => {
        const cmsFixture = createStage3RepositoryFixture(); const telegramFixture = createStage3RepositoryFixture(); const stage4 = createStage4RepositoryFixture();
        const cms = new TenantBusinessService(cmsFixture.repository, new SequenceIdentifierGenerator());
        const telegramArticles = new TenantBusinessService(telegramFixture.repository, new SequenceIdentifierGenerator());
        const actor = createStage3Actor(); const repository = new InMemoryStage6Repository();
        const identity = { mappingId: '00000000-0000-4000-8000-000000006010', organizationId: ALPHA_ORGANIZATION_ID, userId: actor.actorId, roleId: '00000000-0000-4000-8000-000000000020', telegramUserId: '6001', telegramChatId: '6002', permissions: actor.permissionSet };
        repository.seedTelegram(identity); const replies: string[] = []; const telegram = { check: async () => ({ service: 'test', status: 'healthy' as const }), send: async ({ text }: { text: string }) => { replies.push(text); } };
        const transfer = { prepare: async ({ expectedSize }: { expectedSize: number }) => ({ bytes: new ArrayBuffer(expectedSize), sizeBytes: expectedSize, checksumSha256: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=' }), transfer: async () => undefined }; const clock = { now: () => new Date('2026-08-30T00:00:00.000Z') };
        const workflow = new TelegramWorkflowService(repository, { create: () => ({ articles: telegramArticles, media: new MediaService(stage4.repository, stage4.storage, new SequenceIdentifierGenerator(), { maxBytes: 1024, allowedTypes: ['image/png'], uploadTtlSeconds: 60, readTtlSeconds: 60 }, clock), publication: new PublicationService(stage4.repository, stage4.queue, new SequenceIdentifierGenerator(), { maxAttempts: 2, delaysSeconds: [1] }, clock) }) }, transfer, telegram, 'telegram-secret', 300, 900, clock);
        const slug = `telegram-${suffix}`; const command = { regionId: ALPHA_REGION_ID, publisherId: null, categoryId: null, authorId: null, slug, title: title.trim(), body: body.trim(), source: source.trim(), status: 'draft' as const };
        const cmsResult = await cms.createArticle(actor, command); expect(cmsResult.ok).toBe(true); if (!cmsResult.ok) return;
        const texts = ['/article', ALPHA_REGION_ID, title.trim(), body.trim(), source.trim(), slug];
        for (let index = 0; index < texts.length; index += 1) {
          const result = await workflow.handle('telegram-secret', { update_id: index + 1, message: { date: 1788048000, from: { id: 6001 }, chat: { id: 6002 }, text: texts[index] } }, `request-${index}`);
          expect(result.ok).toBe(true);
        }
        const snapshot = telegramFixture.repository.snapshot(ALPHA_ORGANIZATION_ID)!; const telegramArticle = snapshot.articles.find((article) => article.slug === slug);
        expect(telegramArticle).toBeDefined();
        expect(telegramArticle).toMatchObject({ regionId: cmsResult.value.regionId, publisherId: cmsResult.value.publisherId, categoryId: cmsResult.value.categoryId, authorId: cmsResult.value.authorId, slug: cmsResult.value.slug, title: cmsResult.value.title, body: cmsResult.value.body, source: cmsResult.value.source, status: cmsResult.value.status });
        expect(replies.at(-1)).toContain('Article created:');
      },
    ));
  });
});
