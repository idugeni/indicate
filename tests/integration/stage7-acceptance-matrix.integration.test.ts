import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { describe, expect, it } from 'vitest';

import { verifyStage7AcceptanceMatrix } from '@/application/stage7/acceptance-matrix';
import { createCacheIdentity } from '@/application/stage5/cache-identity';
import { PublicContentService } from '@/application/stage5/public-content-service';
import { buildSeoDocument } from '@/application/stage5/seo';
import { MediaService } from '@/application/stage4/media-service';
import { PublicationService } from '@/application/stage4/publication-service';
import { PublicationWorker } from '@/application/stage4/publication-worker';
import { TenantBusinessService } from '@/application/stage3/tenant-business-service';
import { ApiKeyService, type ApiKeyHasher } from '@/application/stage6/api-key-service';
import { TelegramWorkflowService } from '@/application/stage6/telegram-workflow-service';
import { createStage7ReadinessFixture } from '@/domain/stage7/readiness-fixtures';
import type { AuthorizedTenantActorContext, HostnameContext } from '@/domain/context/operation-context';
import { buildAnalytics } from '@/domain/stage3/policies';
import { STAGE6_PERMISSIONS } from '@/domain/stage6/permissions';
import type { Stage3TenantState } from '@/domain/stage3/models';
import type { Stage4TenantSnapshot } from '@/domain/stage4/models';
import type { Stage7AcceptanceObservation } from '@/domain/stage7/models';
import type { PublicSiteCachePort } from '@/ports/public-site-cache';
import { InMemoryStage3Repository } from '@/infrastructure/testing/stage3-memory';
import { InMemoryStage4Repository } from '@/infrastructure/testing/stage4-memory';
import { InMemoryObjectStorage, InMemoryRedisCoordination, DeterministicPublicationTargetPublisher } from '@/infrastructure/testing/stage4-providers';
import { createStage7SharedJourneyRepository } from '@/infrastructure/testing/stage5-fixture';
import { InMemoryStage6Repository } from '@/infrastructure/testing/stage6-memory';
import { UuidGenerator } from '@/infrastructure/system/uuid-generator';
import { stage7RuntimeConfig } from '../helpers/stage7';

const NOW = new Date('2026-08-30T08:00:00.000Z');
const permissions = new Set(['publishing.request', 'publishing.read', 'media.read']);
const actor = (organizationId: string): AuthorizedTenantActorContext => Object.freeze({
  actorType: 'user', actorId: `actor-${organizationId}`, verifiedAuthUserId: `auth-${organizationId}`, organizationId, permissionSet: permissions,
  entryPoint: 'cms', requestId: `stage7-${organizationId}`,
});
const idFor = (value: string, suffix: string) => `${value.slice(0, -suffix.length)}${suffix}`;

function stage3State(fixture: ReturnType<typeof createStage7ReadinessFixture>['roots'][number], snapshot: Stage4TenantSnapshot): Stage3TenantState {
  const regions = fixture.regions.map((region) => ({ id: region.id, organizationId: fixture.organizationId, externalKey: region.externalKey, name: region.name, slug: region.slug, status: 'active' as const, version: 1, createdAt: NOW.toISOString(), updatedAt: NOW.toISOString() }));
  const articles = fixture.regionalSites.map((site, index) => ({
    id: idFor(site.id, '700000000001'), organizationId: fixture.organizationId, regionId: fixture.regions[index]!.id,
    publisherId: null, categoryId: null, authorId: null, slug: `stage7-${fixture.regions[index]!.slug}`, title: `Stage 7 ${fixture.regions[index]!.name}`,
    body: 'Production readiness matrix article.', source: 'Indicate', status: 'active' as const, publishedAt: NOW.toISOString(), archivedAt: null,
    version: 1, createdAt: NOW.toISOString(), updatedAt: NOW.toISOString(),
  }));
  return {
    organizationId: fixture.organizationId, organizationName: `Stage 7 Organization ${fixture.ordinal}`,
    domains: [{ id: fixture.domainId, organizationId: fixture.organizationId, normalizedHostname: fixture.normalizedHostname, status: 'active', version: 1, createdAt: NOW.toISOString(), updatedAt: NOW.toISOString() }],
    regions,
    sites: fixture.regionalSites.map((site) => ({ id: site.id, organizationId: fixture.organizationId, domainId: fixture.domainId, regionId: site.regionId, normalizedHostname: site.normalizedHostname, status: 'active', activationState: 'active', version: 1, createdAt: NOW.toISOString(), updatedAt: NOW.toISOString() })),
    siteSettings: [], roles: [], memberships: [], telegramMappings: [], publishers: [], affiliations: [], categories: [], authors: [], articles,
    articleSites: snapshot.articleSites.map((relation) => ({ ...relation, stateOccurredAt: relation.publishedAt ?? NOW.toISOString(), createdAt: NOW.toISOString(), updatedAt: NOW.toISOString() })),
    media: snapshot.media.map(({ id, organizationId, state }) => ({ id, organizationId, state })),
    publishingJobs: snapshot.jobs.map((job) => ({ id: job.id, organizationId: job.organizationId, articleId: job.articleId, state: job.state, createdAt: job.createdAt, occurredAt: job.updatedAt })),
    publishingJobTargets: snapshot.targets.map((target) => ({ id: target.id, organizationId: target.organizationId, jobId: target.jobId, articleSiteId: target.articleSiteId, state: target.state, occurredAt: target.finishedAt ?? target.startedAt ?? NOW.toISOString() })),
    auditLogs: snapshot.auditLogs,
  };
}

function stage4State(root: ReturnType<typeof createStage7ReadinessFixture>['roots'][number]): Stage4TenantSnapshot {
  return {
    organizationId: root.organizationId,
    articles: root.regionalSites.map((site) => ({ id: idFor(site.id, '700000000001'), organizationId: root.organizationId, active: true, leadMediaId: idFor(site.id, '700000000002') })),
    sites: root.regionalSites.map((site) => ({ id: site.id, organizationId: root.organizationId, active: true, normalizedHostname: site.normalizedHostname, settingsMediaIds: [] })),
    articleSites: [], reservations: [],
    media: root.regionalSites.map((site) => ({ id: idFor(site.id, '700000000002'), organizationId: root.organizationId, objectKey: `articles/${idFor(site.id, '700000000001')}/stage7-${site.id}.png`, purpose: 'article-image', mediaType: 'image/png', sizeBytes: 10, checksum: 'stage7-checksum', owner: { kind: 'article', articleId: idFor(site.id, '700000000001') }, state: 'active', version: 1, createdAt: NOW.toISOString(), updatedAt: NOW.toISOString() })),
    cleanupTasks: [], invalidationIntents: [], jobs: [], targets: [], transitionReceipts: [], auditLogs: [],
  };
}

function denialShape(value: { readonly error: { readonly code: string; readonly message: string } }): string {
  return `${value.error.code}:${value.error.message}`;
}

class MatrixApiKeyHasher implements ApiKeyHasher {
  async hash(secret: string, salt: string): Promise<string> { return createHash('sha256').update(`${salt}:${secret}`).digest('base64'); }
  async verify(secret: string, salt: string, expectedHash: string): Promise<boolean> { return (await this.hash(secret, salt)) === expectedHash; }
}

function matrixCredential(ordinal: number): { lookupId: string; secret: string; plaintext: string; salt: string } {
  const lookupId = `s7key${String(ordinal).padStart(11, '0')}`;
  const secret = `${String(ordinal)}${'x'.repeat(42)}`;
  return { lookupId, secret, plaintext: `ind_live_${lookupId}.${secret}`, salt: Buffer.from(`stage7-salt-${ordinal}`).toString('base64') };
}

describe('Stage 7 three-domain by three-region acceptance matrix', () => {
  it('exercises publication, public selection, media, SEO, cache, denial, analytics, Telegram, and audit without tenant leakage', async () => {
    const config = stage7RuntimeConfig();
    const fixture = createStage7ReadinessFixture(config);
    const repository = new InMemoryStage4Repository(fixture.roots.map(stage4State));
    const publicRepository = createStage7SharedJourneyRepository(config, repository);
    const publicContent = new PublicContentService(publicRepository);
    const queue = new InMemoryRedisCoordination();
    const storage = new InMemoryObjectStorage(() => NOW);
    const publisher = new DeterministicPublicationTargetPublisher();
    const identifiers = new UuidGenerator();
    const clock = { now: () => NOW };
    const publication = new PublicationService(repository, queue, identifiers, { maxAttempts: 3, delaysSeconds: [1, 2] }, clock);
    const media = new MediaService(repository, storage, identifiers, { maxBytes: 1_024, allowedTypes: ['image/png'], uploadTtlSeconds: 60, readTtlSeconds: 60 }, clock);
    const jobs = new Map<string, string>();

    for (const site of fixture.regionalMatrix) {
      const candidate = (await publicRepository.findActiveSitesByExactHostname(site.normalizedHostname))[0]!;
      await expect(publicContent.load(candidate, {}, { path: '/', locale: 'id-ID' })).resolves.toMatchObject({ articles: [] });
    }

    for (const root of fixture.roots) for (const [index, site] of root.regionalSites.entries()) {
      const articleId = idFor(site.id, '700000000001');
      publisher.setOutcomes(site.id, [{ kind: 'published', url: `https://${site.normalizedHostname}/articles/stage7-${root.regions[index]!.slug}` }]);
      const result = await publication.request(actor(root.organizationId), { articleId, siteIds: [site.id], idempotencyKey: `stage7-${root.ordinal}-${index}`, options: { readiness: true } });
      expect(result.ok).toBe(true);
      if (result.ok) jobs.set(site.id, result.value.job.id);
    }

    const worker = new PublicationWorker(repository, queue, publisher, storage, { maxAttempts: 3, delaysSeconds: [1, 2], leaseSeconds: 30, batchSize: 20, functionDeadlineSeconds: 60 }, clock);
    await expect(worker.run('stage7-worker')).resolves.toMatchObject({ claimed: 9, processed: 9 });

    const stage6 = new InMemoryStage6Repository();
    const keyHasher = new MatrixApiKeyHasher();
    const credentialsByOrganization = new Map<string, string>();
    for (const root of fixture.roots) {
      const credential = matrixCredential(root.ordinal);
      credentialsByOrganization.set(root.organizationId, credential.plaintext);
      stage6.seedApiKey({
        id: idFor(root.organizationId, '700000000020'), organizationId: root.organizationId,
        lookupId: credential.lookupId, name: `Stage 7 root ${root.ordinal}`, salt: credential.salt,
        verificationHash: await keyHasher.hash(credential.secret, credential.salt), scopes: [STAGE6_PERMISSIONS.apiKeyRead, 'publishing.read'],
        status: 'active', predecessorId: null, expiresAt: null, lastUsedAt: null, version: 1,
        createdAt: NOW.toISOString(), updatedAt: NOW.toISOString(),
      });
    }
    const apiKeys = new ApiKeyService(stage6, identifiers, undefined, clock, keyHasher);
    const dummyArticles = new TenantBusinessService(new InMemoryStage3Repository([]), identifiers, clock);
    const telegramMessages: string[] = [];
    const telegramPort = { check: async () => ({ service: 'telegram-test', status: 'healthy' as const }), send: async ({ text }: { readonly chatId: string; readonly text: string }) => { telegramMessages.push(text); } };
    const mediaTransfer = { prepare: async () => { throw new Error('not_used'); }, transfer: async () => { throw new Error('not_used'); } };
    const telegram = new TelegramWorkflowService(stage6, { create: () => ({ articles: dummyArticles, media, publication }) }, mediaTransfer, telegramPort, 'stage7-telegram-secret', 300, 900, clock);
    const observations: Stage7AcceptanceObservation[] = [];

    for (const root of fixture.roots) {
      stage6.seedTelegram({ mappingId: idFor(root.organizationId, '700000000010'), organizationId: root.organizationId, userId: idFor(root.organizationId, '700000000011'), roleId: idFor(root.organizationId, '700000000012'), telegramUserId: String(7_000 + root.ordinal), telegramChatId: String(8_000 + root.ordinal), permissions: new Set(['publishing.read']) });
      const snapshot = await repository.snapshot(root.organizationId);
      expect(snapshot).not.toBeNull();
      if (snapshot === null) continue;
      const analyticsState = stage3State(root, snapshot);
      const analytics = buildAnalytics(analyticsState);

      for (const [index, site] of root.regionalSites.entries()) {
        const jobId = jobs.get(site.id)!;
        const status = await publication.status(actor(root.organizationId), { jobId });
        expect(status.ok).toBe(true);
        if (!status.ok || status.value.result === null) continue;
        const candidate = (await publicRepository.findActiveSitesByExactHostname(site.normalizedHostname))[0]!;
        const foreignRoot = fixture.roots.find(({ organizationId }) => organizationId !== root.organizationId)!;
        const foreignSite = foreignRoot.regionalSites[index]!;
        const foreignCandidate = (await publicRepository.findActiveSitesByExactHostname(foreignSite.normalizedHostname))[0]!;
        const foreignData = await publicContent.load(foreignCandidate, {}, { path: '/', locale: 'id-ID' });
        expect(foreignData).not.toBeNull();
        if (foreignData === null) continue;
        const foreignIdentity = createCacheIdentity({ context: foreignCandidate, locale: 'id-ID', path: '/', query: {}, preview: false, authClass: 'anonymous' })!;
        const foreignCache: PublicSiteCachePort = {
          read: async () => ({ identity: foreignIdentity, data: foreignData }),
        };
        const publicData = await new PublicContentService(publicRepository, foreignCache).load(candidate, {}, { path: '/', locale: 'id-ID' });
        expect(publicData).not.toBeNull();
        if (publicData === null) continue;
        const foreignCacheRejected = publicData.context.organizationId === root.organizationId
          && publicData.context.siteId === site.id
          && publicData.articles.every(({ id }) => !foreignData.articles.some((foreignArticle) => foreignArticle.id === id));
        const foreignArticleIds = new Set<string>();
        for (const otherRoot of fixture.roots.filter(({ organizationId }) => organizationId !== root.organizationId)) {
          for (const otherSite of otherRoot.regionalSites) {
            const otherCandidate = (await publicRepository.findActiveSitesByExactHostname(otherSite.normalizedHostname))[0];
            if (otherCandidate === undefined) continue;
            const otherData = await publicContent.load(otherCandidate, {}, { path: '/', locale: 'id-ID' });
            for (const article of otherData?.articles ?? []) foreignArticleIds.add(article.id);
          }
        }
        const publicSelectionIsIsolated = publicData.articles.length > 0
          && publicData.articles.every(({ id }) => !foreignArticleIds.has(id));
        const mediaId = idFor(site.id, '700000000002');
        const context: HostnameContext = candidate;
        const mediaAccess = await media.authorizePublicRead(context, mediaId, `media-${site.id}`);
        const foreignContext: HostnameContext = { normalizedHostname: foreignSite.normalizedHostname, organizationId: foreignSite.organizationId, domainId: foreignSite.domainId, siteId: foreignSite.id, regionId: foreignSite.regionId, routingVersion: 1 };
        const crossMedia = await media.authorizePublicRead(foreignContext, mediaId, `cross-${site.id}`);
        expect(mediaAccess, `authorized media for ${site.normalizedHostname}`).toMatchObject({ ok: true });
        expect(crossMedia, `cross-tenant media for ${site.normalizedHostname}`).toMatchObject({ ok: false });
        const seo = buildSeoDocument(publicData, { path: '/' });
        const cache = createCacheIdentity({ context: candidate, locale: 'id-ID', path: '/', query: {}, preview: false, authClass: 'anonymous' })!;
        const ownCredential = await apiKeys.authenticate(credentialsByOrganization.get(root.organizationId)!, 'publishing.read', `api-own-${site.id}`);
        const foreignCredential = await apiKeys.authenticate(credentialsByOrganization.get(foreignRoot.organizationId)!, 'publishing.read', `api-foreign-${site.id}`);
        expect(ownCredential.ok).toBe(true); expect(foreignCredential.ok).toBe(true);
        if (!ownCredential.ok || !foreignCredential.ok) continue;
        const ownCredentialStatus = await publication.status(ownCredential.value, { jobId });
        const crossStatus = await publication.status(foreignCredential.value, { jobId });
        const absentStatus = await publication.status(foreignCredential.value, { jobId: crypto.randomUUID() });
        expect(ownCredentialStatus.ok).toBe(true); expect(crossStatus.ok).toBe(false); expect(absentStatus.ok).toBe(false);
        if (!ownCredentialStatus.ok || crossStatus.ok || absentStatus.ok) continue;
        const credentialCrossTenantDenied = denialShape(crossStatus.error) === denialShape(absentStatus.error);
        expect(credentialCrossTenantDenied).toBe(true);
        const updateBase = 90_000 + root.ordinal * 100 + index * 2;
        const telegramMessageOffset = telegramMessages.length;
        const telegramStatus = await telegram.handle('stage7-telegram-secret', { update_id: updateBase, message: { date: Math.floor(NOW.getTime() / 1_000), from: { id: 7_000 + root.ordinal }, chat: { id: 8_000 + root.ordinal }, text: `/status ${jobId}` } }, `telegram-status-${site.id}`);
        const telegramLinks = await telegram.handle('stage7-telegram-secret', { update_id: updateBase + 1, message: { date: Math.floor(NOW.getTime() / 1_000), from: { id: 7_000 + root.ordinal }, chat: { id: 8_000 + root.ordinal }, text: `/links ${jobId}` } }, `telegram-links-${site.id}`);
        expect(telegramStatus.ok).toBe(true); expect(telegramLinks.ok).toBe(true);
        const actualTelegramMessages = telegramMessages.slice(telegramMessageOffset);
        expect(actualTelegramMessages).toHaveLength(2);
        const telegramState = actualTelegramMessages[0]?.includes(status.value.job.state) === true
          ? status.value.job.state : 'unexpected';
        const telegramUrls = status.value.result.urls.filter((url) => actualTelegramMessages.some((message) => message.includes(url)));
        const articleCount = analytics.articlesByRegion.find(({ key }) => key === root.regions[index]!.id)?.count ?? 0;
        observations.push({
          organizationId: root.organizationId, siteId: site.id, hostname: site.normalizedHostname, regionSlug: root.regions[index]!.slug,
          publication: { state: status.value.result.finalState, successfulCount: status.value.result.successfulCount, urls: status.value.result.urls },
          publicSelectionIsIsolated,
          publicArticleRegionIds: publicData.articles.map(({ regionId }) => regionId),
          media: { authorizedKey: mediaAccess.ok ? mediaAccess.value.key : null, crossTenantDenied: !crossMedia.ok },
          seoUrls: [seo.canonical!, seo.openGraph!.url], cacheIdentity: cache.key, foreignCacheRejected,
          denialShape: denialShape(crossStatus.error), credentialCrossTenantDenied,
          analyticsOrganizationId: analyticsState.organizationId, analyticsArticleCount: articleCount,
          telegram: { state: telegramState, urls: telegramUrls },
          auditOrganizationIds: snapshot.auditLogs.map(({ organizationId }) => organizationId),
        });
      }
    }

    expect(telegramMessages.length).toBe(18);
    const report = verifyStage7AcceptanceMatrix(fixture, observations);
    expect(report).toEqual({ accepted: true, scenarioCount: 9, failures: [] });
    const evidencePath = process.env.STAGE7_ACCEPTANCE_EVIDENCE_PATH;
    if (evidencePath !== undefined) {
      await mkdir(dirname(evidencePath), { recursive: true });
      await writeFile(evidencePath, `${JSON.stringify(report)}\n`, { encoding: 'utf8', mode: 0o600 });
    }
  });

  it('fails deterministically when a cross-tenant result is introduced', () => {
    const config = stage7RuntimeConfig(); const fixture = createStage7ReadinessFixture(config); const site = fixture.regionalMatrix[0]!;
    const report = verifyStage7AcceptanceMatrix(fixture, [{
      organizationId: site.organizationId, siteId: site.id, hostname: site.normalizedHostname, regionSlug: 'wonosobo',
      publication: { state: 'published', successfulCount: 1, urls: [`https://${site.normalizedHostname}/article`] },
      publicSelectionIsIsolated: false, publicArticleRegionIds: ['sibling-region'], media: { authorizedKey: 'assets/item', crossTenantDenied: false },
      seoUrls: [`https://${site.normalizedHostname}/`], cacheIdentity: 'shared', foreignCacheRejected: false,
      denialShape: 'different', credentialCrossTenantDenied: false, analyticsOrganizationId: 'foreign', analyticsArticleCount: 1,
      telegram: { state: 'published', urls: [] }, auditOrganizationIds: ['foreign'],
    }]);
    expect(report.accepted).toBe(false);
    expect(report.failures).toEqual(expect.arrayContaining(['matrix_cardinality', 'public_selection', 'media_authorization', 'cache_partition', 'credential_isolation', 'analytics_scope', 'telegram_projection', 'audit_scope']));
  });
});
