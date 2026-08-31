import { describe, expect, it } from 'vitest';
import { createCacheIdentity } from '@/application/stage5/cache-identity';
import { PublicContentService } from '@/application/stage5/public-content-service';
import { createStage5E2eRepository } from '@/infrastructure/testing/stage5-fixture';
import { stage7RuntimeConfig } from '../helpers/stage7';

const config = stage7RuntimeConfig();

describe('Stage 5 serving-path cache safety', () => {
  it('discards a cached entry whose embedded Site context differs from current exact-host discovery', async () => {
    const repository = createStage5E2eRepository(config); const context = (await repository.findActiveSitesByExactHostname('alpha.example.web.id'))[0]!; const expected = await repository.loadPublicSite(context, {});
    const foreignContext = { ...context, siteId: '00000000-0000-4000-8000-000000000999' };
    const foreignIdentity = createCacheIdentity({ context: foreignContext, locale: 'id-ID', path: '/', query: {}, preview: false, authClass: 'anonymous' })!;
    const service = new PublicContentService(repository, { read: async () => ({ identity: foreignIdentity, data: expected }) });
    await expect(service.load(context, {}, { path: '/', locale: 'id-ID' })).resolves.toMatchObject({ context });
  });

  it('consults durable Site bypass before any cache read', async () => {
    const repository = createStage5E2eRepository(config); const context = (await repository.findActiveSitesByExactHostname('alpha.example.web.id'))[0]!;
    const plan = { organizationId: context.organizationId, siteId: context.siteId, previousHostname: null, currentHostname: context.normalizedHostname, tags: [], paths: ['/'], urls: [`https://${context.normalizedHostname}/`], reason: 'test' };
    await repository.createInvalidation(plan, '2026-01-01T00:00:00.000Z'); const [claim] = await repository.claimInvalidations('2026-01-01T00:00:00.000Z', 1); await repository.failInvalidation(claim!, { code: 'offline' }, '2026-01-01T00:01:00.000Z', false, '2026-01-01T00:00:00.000Z');
    let cacheReads = 0; const service = new PublicContentService(repository, { read: async () => { cacheReads += 1; throw new Error('cache must be bypassed'); } });
    await expect(service.load(context, {}, { path: '/', locale: 'id-ID' })).resolves.not.toBeNull(); expect(cacheReads).toBe(0);
  });
});
