import { describe, expect, it } from 'vitest';
import { MediaService } from '@/application/stage4/media-service';
import { PublicationService } from '@/application/stage4/publication-service';
import { PublicationWorker } from '@/application/stage4/publication-worker';
import { InMemoryStage4Repository } from '@/infrastructure/testing/stage4-memory';
import { DeterministicPublicationTargetPublisher, InMemoryObjectStorage, InMemoryRedisCoordination } from '@/infrastructure/testing/stage4-providers';
import { createStage4Actor, createStage4RepositoryFixture } from '@/infrastructure/testing/stage4-fixture';
import { ALPHA_ARTICLE_ID, ALPHA_ORGANIZATION_ID, ALPHA_SITE_ID, BETA_ORGANIZATION_ID } from '@/infrastructure/testing/stage3-fixture';
import { SequenceIdentifierGenerator } from '../helpers/stage3';
import { stage4State, TEST_ARTICLE, TEST_ORG, TEST_SITE, TEST_SITE_B } from '../helpers/stage4';

class MutableClock { constructor(private value = new Date('2026-08-30T00:00:00.000Z')) {} now() { return new Date(this.value); } advance(seconds: number) { this.value = new Date(this.value.getTime() + seconds * 1_000); } }
const mediaPolicy = { maxBytes: 1_000_000, allowedTypes: ['image/jpeg', 'image/png'], uploadTtlSeconds: 600, readTtlSeconds: 300 };
const CHECKSUM = '47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=';
const OTHER_CHECKSUM = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';

describe('Stage 4 media integration', () => {
  it('reserves, uploads, verifies, atomically activates and authorizes exact-key tenant media', async () => {
    const { repository, storage } = createStage4RepositoryFixture(); const actor = createStage4Actor(); const service = new MediaService(repository, storage, new SequenceIdentifierGenerator(), mediaPolicy);
    const reserved = await service.reserveUpload(actor, { filename: '../Lead Photo.JPG', mediaType: 'image/jpeg', sizeBytes: 100, checksum: CHECKSUM, purpose: 'article-lead', owner: { kind: 'article', articleId: ALPHA_ARTICLE_ID } });
    expect(reserved.ok).toBe(true); if (!reserved.ok) return; expect(reserved.value.objectKey).toMatch(new RegExp(`^articles/${ALPHA_ARTICLE_ID}/`));
    storage.putObject({ key: reserved.value.objectKey, contentType: 'image/jpeg', contentLength: 100, checksum: CHECKSUM });
    const completed = await service.completeUpload(actor, { reservationId: reserved.value.reservationId }); expect(completed).toMatchObject({ ok: true, value: { state: 'active', purpose: 'article-lead' } }); if (!completed.ok) return;
    const authorized = await service.authorizeTenantRead(actor, { mediaId: completed.value.id }); expect(authorized).toMatchObject({ ok: true, value: { key: reserved.value.objectKey } });
    const publicContext = { normalizedHostname: 'primary.0001.example.test', organizationId: ALPHA_ORGANIZATION_ID, domainId: crypto.randomUUID(), siteId: ALPHA_SITE_ID, regionId: null, routingVersion: 1 };
    await expect(service.authorizePublicRead(publicContext, completed.value.id, 'public-request')).resolves.toMatchObject({ ok: true });
    const foreign = await service.authorizeTenantRead(createStage4Actor(BETA_ORGANIZATION_ID), { mediaId: completed.value.id }); expect(foreign).toMatchObject({ ok: false, error: { error: { code: 'RESOURCE_UNAVAILABLE' } } });
    const snapshot = await repository.snapshot(ALPHA_ORGANIZATION_ID); expect(snapshot?.auditLogs.map(({ action }) => action).sort()).toEqual(expect.arrayContaining(['media.access.authorize', 'media.activate', 'media.upload.reserve'])); expect(snapshot?.auditLogs.filter(({ action }) => action === 'media.access.authorize')).toHaveLength(2); expect(snapshot?.invalidationIntents).toHaveLength(1);
  });

  it('rejects metadata mismatch, queues exact cleanup, validates policy bounds, and rolls back on audit failure', async () => {
    const repository = new InMemoryStage4Repository([stage4State()]); const storage = new InMemoryObjectStorage(); const service = new MediaService(repository, storage, new SequenceIdentifierGenerator(), mediaPolicy); const actor = createStage4Actor(TEST_ORG);
    expect(await service.reserveUpload(actor, { filename: 'bad.exe', mediaType: 'application/x-msdownload', sizeBytes: 10, checksum: null, purpose: 'bad', owner: { kind: 'organization' } })).toMatchObject({ ok: false, error: { error: { code: 'INVALID_INPUT' } } });
    const reserved = await service.reserveUpload(actor, { filename: 'photo.jpg', mediaType: 'image/jpeg', sizeBytes: 100, checksum: CHECKSUM, purpose: 'asset', owner: { kind: 'organization' } }); expect(reserved.ok).toBe(true); if (!reserved.ok) return;
    storage.putObject({ key: reserved.value.objectKey, contentType: 'image/png', contentLength: 100, checksum: OTHER_CHECKSUM }); const completed = await service.completeUpload(actor, { reservationId: reserved.value.reservationId }); expect(completed).toMatchObject({ ok: false, error: { error: { code: 'INVALID_INPUT' } } });
    expect((await repository.snapshot(TEST_ORG))?.cleanupTasks).toMatchObject([{ objectKey: reserved.value.objectKey, status: 'pending' }]);
    const before = await repository.snapshot(TEST_ORG); repository.failNextAudit = true; const failed = await service.reserveUpload(actor, { filename: 'rollback.jpg', mediaType: 'image/jpeg', sizeBytes: 5, checksum: CHECKSUM, purpose: 'asset', owner: { kind: 'organization' } }); expect(failed).toMatchObject({ ok: false, error: { error: { code: 'DEPENDENCY_UNAVAILABLE' } } }); expect(await repository.snapshot(TEST_ORG)).toEqual(before);
  });
});

describe('Stage 4 publication integration', () => {
  it('converges idempotent acceptance, preserves conflicts, recovers dispatch outage, and isolates tenants', async () => {
    const clock = new MutableClock(); const repository = new InMemoryStage4Repository([stage4State(), stage4State(BETA_ORGANIZATION_ID, TEST_ARTICLE)]); const queue = new InMemoryRedisCoordination(); const service = new PublicationService(repository, queue, new SequenceIdentifierGenerator(), { maxAttempts: 3, delaysSeconds: [5, 30] }, clock); const actor = createStage4Actor(TEST_ORG);
    const command = { articleId: TEST_ARTICLE, siteIds: [TEST_SITE_B, TEST_SITE, TEST_SITE], idempotencyKey: 'cms-request-1', options: { mode: 'immediate', notify: false } };
    const first = await service.request(actor, command); const repeated = await service.request(actor, { ...command, siteIds: [TEST_SITE, TEST_SITE_B] }); expect(first.ok).toBe(true); expect(repeated).toEqual(first);
    const conflict = await service.request(actor, { ...command, options: { mode: 'scheduled' } }); expect(conflict).toMatchObject({ ok: false, error: { error: { code: 'IDEMPOTENCY_CONFLICT' } } });
    const before = await repository.snapshot(TEST_ORG); expect((await service.request(actor, { ...command, idempotencyKey: 'foreign-target', siteIds: ['00000000-0000-4000-8000-000000000999'] })).ok).toBe(false); expect((await repository.snapshot(TEST_ORG))?.jobs).toEqual(before?.jobs);
    expect((await repository.snapshot(TEST_ORG))?.auditLogs).toEqual(expect.arrayContaining([expect.objectContaining({ action: 'publication.request.denied', outcome: 'denied', targetId: null })]));
    const outageRepository = new InMemoryStage4Repository([stage4State()]); const outageQueue = new InMemoryRedisCoordination(); const outageService = new PublicationService(outageRepository, outageQueue, new SequenceIdentifierGenerator(), { maxAttempts: 3, delaysSeconds: [5, 30] }, clock);
    outageQueue.failNextSchedule = true; const durable = await outageService.request(actor, { ...command, idempotencyKey: 'redis-outage' }); expect(durable).toMatchObject({ ok: true, value: { job: { state: 'retrying', dispatchStatus: 'pending' } } });
  });

  it('processes partial failure with bounded retry, preserves success, and derives exact final URLs', async () => {
    const clock = new MutableClock(); const repository = new InMemoryStage4Repository([stage4State()]); const queue = new InMemoryRedisCoordination(); const storage = new InMemoryObjectStorage(); const publisher = new DeterministicPublicationTargetPublisher();
    publisher.setOutcomes(TEST_SITE, [{ kind: 'published', url: 'https://one.example.test/article' }]); publisher.setOutcomes(TEST_SITE_B, [{ kind: 'retryable_failure', code: 'temporary' }, { kind: 'published', url: 'https://two.example.test/article' }]);
    const identifiers = new SequenceIdentifierGenerator(); const policy = { maxAttempts: 3, delaysSeconds: [5, 30], leaseSeconds: 30, batchSize: 10, functionDeadlineSeconds: 50 };
    const service = new PublicationService(repository, queue, identifiers, policy, clock); const worker = new PublicationWorker(repository, queue, publisher, storage, policy, clock); const actor = createStage4Actor(TEST_ORG);
    const accepted = await service.request(actor, { articleId: TEST_ARTICLE, siteIds: [TEST_SITE, TEST_SITE_B], idempotencyKey: 'partial-retry', options: {} }); expect(accepted.ok).toBe(true); if (!accepted.ok) return;
    await worker.run('worker-one'); let status = await service.status(actor, { jobId: accepted.value.job.id }); expect(status).toMatchObject({ ok: true, value: { job: { state: 'retrying' } } });
    const firstTarget = status.ok ? status.value.targets.find(({ siteId }) => siteId === TEST_SITE) : undefined; expect(firstTarget).toMatchObject({ state: 'published', attempt: 1 });
    clock.advance(5); await worker.reconcile(); await worker.run('worker-two'); status = await service.status(actor, { jobId: accepted.value.job.id });
    expect(status).toMatchObject({ ok: true, value: { job: { state: 'published' }, result: { finalState: 'published', successfulCount: 2, urls: ['https://one.example.test/article', 'https://two.example.test/article'] } } });
    if (status.ok) expect(status.value.targets.find(({ siteId }) => siteId === TEST_SITE)?.attempt).toBe(1);
  });

  it('preserves the lease at the function deadline and resumes remaining bounded batches through reconciliation', async () => {
    const clock = new MutableClock(); const repository = new InMemoryStage4Repository([stage4State()]); const queue = new InMemoryRedisCoordination(); const storage = new InMemoryObjectStorage(); let published = 0;
    const publisher = { publish: async (_claim: unknown, target: { siteId: string }) => { published += 1; if (published === 1) clock.advance(2); return { kind: 'published' as const, url: `https://${target.siteId}.example.test/article` }; } };
    const policy = { maxAttempts: 3, delaysSeconds: [1], leaseSeconds: 1, batchSize: 1, functionDeadlineSeconds: 1 };
    const service = new PublicationService(repository, queue, new SequenceIdentifierGenerator(), policy, clock); const worker = new PublicationWorker(repository, queue, publisher, storage, policy, clock); const actor = createStage4Actor(TEST_ORG);
    const accepted = await service.request(actor, { articleId: TEST_ARTICLE, siteIds: [TEST_SITE, TEST_SITE_B], idempotencyKey: 'deadline-resume', options: {} }); expect(accepted.ok).toBe(true); if (!accepted.ok) return;
    await expect(worker.run('deadline-worker')).resolves.toMatchObject({ claimed: 1, processed: 0 });
    await expect(service.status(actor, { jobId: accepted.value.job.id })).resolves.toMatchObject({ ok: true, value: { job: { state: 'processing', leaseOwner: 'deadline-worker' } } });
    await worker.reconcile(); await worker.run('recovery-worker'); await worker.run('recovery-worker-2');
    await expect(service.status(actor, { jobId: accepted.value.job.id })).resolves.toMatchObject({ ok: true, value: { job: { state: 'published' }, result: { successfulCount: 2 } } });
  });

  it('rejects stale fencing tokens after lease recovery', async () => {
    const repository = new InMemoryStage4Repository([stage4State()]); const input = { jobId: crypto.randomUUID(), organizationId: TEST_ORG, articleId: TEST_ARTICLE, siteIds: [TEST_SITE], idempotencyKey: 'fence', fingerprint: 'v1:fence', fingerprintVersion: 1, options: {}, now: '2026-08-30T00:00:00.000Z', targetIds: [crypto.randomUUID()], articleSiteIds: [crypto.randomUUID()] };
    const accepted = await repository.acceptPublication(createStage4Actor(TEST_ORG), input); expect(accepted.kind).toBe('created'); if (accepted.kind !== 'created') return;
    const first = await repository.claimJob(TEST_ORG, accepted.job.id, 'first', '2026-08-30T00:00:01.000Z', input.now); expect(first).not.toBeNull(); if (first === null) return;
    await repository.recoverExpiredLease(TEST_ORG, accepted.job.id, 3, '2026-08-30T00:00:02.000Z'); const second = await repository.claimJob(TEST_ORG, accepted.job.id, 'second', '2026-08-30T00:01:00.000Z', '2026-08-30T00:00:02.000Z'); expect(second).not.toBeNull();
    const target = (await repository.snapshot(TEST_ORG))!.targets[0]!; await expect(repository.transitionTarget(first, { targetId: target.id, toState: 'processing', now: '2026-08-30T00:00:03.000Z' })).rejects.toThrow('stale_fence');
  });
});



describe('Stage 4 confirmed-finding regressions', () => {
  it('revokes archived-Article media and atomically deduplicates all archive invalidations with same-shape denials', async () => {
    const mediaId = crypto.randomUUID(); const base = stage4State(); const referencedArticleId = crypto.randomUUID(); const referencedSiteId = crypto.randomUUID();
    const relation = { id: crypto.randomUUID(), organizationId: TEST_ORG, articleId: TEST_ARTICLE, siteId: TEST_SITE_B, active: true, state: 'published' as const, publishedUrl: 'https://two.example.test/article', publishedAt: '2026-08-30T00:00:00.000Z', version: 1 };
    const referencedRelation = { ...relation, id: crypto.randomUUID(), articleId: referencedArticleId, siteId: referencedSiteId, publishedUrl: 'https://reference.example.test/article' };
    const asset = { id: mediaId, organizationId: TEST_ORG, objectKey: `articles/${TEST_ARTICLE}/lead.jpg`, purpose: 'lead', mediaType: 'image/jpeg', sizeBytes: 100, checksum: CHECKSUM, owner: { kind: 'article' as const, articleId: TEST_ARTICLE }, state: 'active' as const, version: 1, createdAt: '2026-08-30T00:00:00.000Z', updatedAt: '2026-08-30T00:00:00.000Z' };
    const state = {
      ...base,
      articles: [...base.articles, { id: referencedArticleId, organizationId: TEST_ORG, active: true, leadMediaId: mediaId }],
      sites: [...base.sites.map((site) => site.id === TEST_SITE ? { ...site, settingsMediaIds: [mediaId, mediaId] } : site), { id: referencedSiteId, organizationId: TEST_ORG, active: true, normalizedHostname: 'reference.example.test', settingsMediaIds: [] }],
      articleSites: [relation, referencedRelation],
      media: [asset],
    };
    const repository = new InMemoryStage4Repository([state, stage4State(BETA_ORGANIZATION_ID, crypto.randomUUID())]); const storage = new InMemoryObjectStorage(); const service = new MediaService(repository, storage, new SequenceIdentifierGenerator(), mediaPolicy);
    const context = { normalizedHostname: '0002.example.test', organizationId: TEST_ORG, domainId: crypto.randomUUID(), siteId: TEST_SITE_B, regionId: null, routingVersion: 1 };
    await expect(service.authorizePublicRead(context, mediaId, 'before-archive')).resolves.toMatchObject({ ok: true });
    const archivedArticleRepository = new InMemoryStage4Repository([{ ...state, articles: [{ ...state.articles[0]!, active: false }] }]);
    const archivedArticleService = new MediaService(archivedArticleRepository, storage, new SequenceIdentifierGenerator(), mediaPolicy);
    await expect(archivedArticleService.authorizePublicRead(context, mediaId, 'archived-article')).resolves.toMatchObject({ ok: false, error: { error: { code: 'RESOURCE_UNAVAILABLE' } } });
    await expect(service.archive(createStage4Actor(TEST_ORG), { mediaId, expectedVersion: 99 })).resolves.toMatchObject({ ok: false, error: { error: { code: 'CONFLICT' } } });
    await expect(service.archive(createStage4Actor(BETA_ORGANIZATION_ID), { mediaId, expectedVersion: 1 })).resolves.toMatchObject({ ok: false, error: { error: { code: 'RESOURCE_UNAVAILABLE' } } });
    await expect(service.archive(createStage4Actor(TEST_ORG), { mediaId, expectedVersion: 1 })).resolves.toMatchObject({ ok: true, value: { state: 'archived' } });
    const snapshot = await repository.snapshot(TEST_ORG); expect(snapshot?.invalidationIntents.map(({ siteId }) => siteId).sort()).toEqual([TEST_SITE, TEST_SITE_B, referencedSiteId].sort());
    const denial = (await repository.snapshot(BETA_ORGANIZATION_ID))?.auditLogs.find(({ action }) => action === 'media.archive.denied');
    expect(denial).toMatchObject({ outcome: 'denied', targetId: null, after: { reason: 'authorization_denied' } });
  });

  it('keeps prior job outcomes immutable across republish while Article Site remains the guarded current projection', async () => {
    const clock = new MutableClock(); const repository = new InMemoryStage4Repository([stage4State(TEST_ORG, TEST_ARTICLE, [TEST_SITE])]); const queue = new InMemoryRedisCoordination(); const publisher = new DeterministicPublicationTargetPublisher(); const storage = new InMemoryObjectStorage();
    const policy = { maxAttempts: 3, delaysSeconds: [1], leaseSeconds: 30, batchSize: 10, functionDeadlineSeconds: 20 };
    const service = new PublicationService(repository, queue, new SequenceIdentifierGenerator(), policy, clock); const worker = new PublicationWorker(repository, queue, publisher, storage, policy, clock); const actor = createStage4Actor(TEST_ORG);
    publisher.setOutcomes(TEST_SITE, [{ kind: 'published', url: 'https://one.example.test/job-a' }, { kind: 'published', url: 'https://one.example.test/job-b' }]);
    const first = await service.request(actor, { articleId: TEST_ARTICLE, siteIds: [TEST_SITE], idempotencyKey: 'history-a', options: {} }); expect(first.ok).toBe(true); if (!first.ok) return;
    await worker.run('history-a');
    const second = await service.request(actor, { articleId: TEST_ARTICLE, siteIds: [TEST_SITE], idempotencyKey: 'history-b', options: {} }); expect(second.ok).toBe(true); if (!second.ok) return;
    const whileQueued = await service.status(actor, { jobId: first.value.job.id }); expect(whileQueued).toMatchObject({ ok: true, value: { result: { urls: ['https://one.example.test/job-a'] }, targets: [{ publishedUrl: 'https://one.example.test/job-a' }] } });
    await worker.run('history-b');
    await expect(service.status(actor, { jobId: first.value.job.id })).resolves.toMatchObject({ ok: true, value: { result: { urls: ['https://one.example.test/job-a'] } } });
    await expect(service.status(actor, { jobId: second.value.job.id })).resolves.toMatchObject({ ok: true, value: { result: { urls: ['https://one.example.test/job-b'] } } });
  });

  it('returns coherent readable failed targets and result when first dispatch exhausts policy', async () => {
    const repository = new InMemoryStage4Repository([stage4State(TEST_ORG, TEST_ARTICLE, [TEST_SITE])]); const queue = new InMemoryRedisCoordination(); queue.failNextSchedule = true;
    const service = new PublicationService(repository, queue, new SequenceIdentifierGenerator(), { maxAttempts: 1, delaysSeconds: [] }); const actor = createStage4Actor(TEST_ORG);
    const accepted = await service.request(actor, { articleId: TEST_ARTICLE, siteIds: [TEST_SITE], idempotencyKey: 'dispatch-terminal', options: {} });
    expect(accepted).toMatchObject({ ok: true, value: { job: { state: 'failed', dispatchStatus: 'failed' }, targets: [{ state: 'failed', sanitizedError: { code: 'dispatch_exhausted' } }], result: { finalState: 'failed', successfulCount: 0, urls: [] } } });
  });

  it('revokes expired leases before reconciliation and fails exhausted targets during bounded recovery', async () => {
    const repository = new InMemoryStage4Repository([stage4State(TEST_ORG, TEST_ARTICLE, [TEST_SITE])]); const actor = createStage4Actor(TEST_ORG);
    const input = { jobId: crypto.randomUUID(), organizationId: TEST_ORG, articleId: TEST_ARTICLE, siteIds: [TEST_SITE], idempotencyKey: 'lease-bound', fingerprint: 'v1:lease-bound', fingerprintVersion: 1, options: {}, now: '2026-08-30T00:00:00.000Z', targetIds: [crypto.randomUUID()], articleSiteIds: [crypto.randomUUID()] };
    const accepted = await repository.acceptPublication(actor, input); expect(accepted.kind).toBe('created'); if (accepted.kind !== 'created') return;
    const claim = await repository.claimJob(TEST_ORG, accepted.job.id, 'lease-owner', '2026-08-30T00:00:01.000Z', input.now); expect(claim).not.toBeNull(); if (claim === null) return;
    const target = (await repository.snapshot(TEST_ORG))!.targets[0]!; const processing = await repository.transitionTarget(claim, { targetId: target.id, toState: 'processing', now: input.now });
    await repository.acknowledgeTransitionReceipt(TEST_ORG, processing.receiptId, input.now);
    await expect(repository.transitionTarget(claim, { targetId: target.id, toState: 'published', publishedUrl: 'https://late.example.test/article', now: '2026-08-30T00:00:02.000Z' })).rejects.toThrow('stale_fence');
    await expect(repository.releaseJob(claim, '2026-08-30T00:00:02.000Z')).rejects.toThrow('stale_fence');
    await repository.recoverExpiredLease(TEST_ORG, accepted.job.id, 1, '2026-08-30T00:00:02.000Z');
    await expect(repository.getPublication(actor, accepted.job.id)).resolves.toMatchObject({ job: { state: 'failed' }, targets: [{ state: 'failed', attempt: 1 }], result: { finalState: 'failed' } });
  });

  it('enforces one invocation-wide target budget and resumes remaining targets', async () => {
    const clock = new MutableClock(); const repository = new InMemoryStage4Repository([stage4State()]); const queue = new InMemoryRedisCoordination(); const policy = { maxAttempts: 3, delaysSeconds: [1], leaseSeconds: 30, batchSize: 1, functionDeadlineSeconds: 20 };
    const service = new PublicationService(repository, queue, new SequenceIdentifierGenerator(), policy, clock); const worker = new PublicationWorker(repository, queue, new DeterministicPublicationTargetPublisher(), new InMemoryObjectStorage(), policy, clock); const actor = createStage4Actor(TEST_ORG);
    const accepted = await service.request(actor, { articleId: TEST_ARTICLE, siteIds: [TEST_SITE, TEST_SITE_B], idempotencyKey: 'run-budget', options: {} }); expect(accepted.ok).toBe(true); if (!accepted.ok) return;
    await expect(worker.run('budget-one')).resolves.toMatchObject({ processed: 1 });
    await expect(service.status(actor, { jobId: accepted.value.job.id })).resolves.toMatchObject({ ok: true, value: { job: { state: 'retrying' } } });
    await expect(worker.run('budget-two')).resolves.toMatchObject({ processed: 1 });
    await expect(service.status(actor, { jobId: accepted.value.job.id })).resolves.toMatchObject({ ok: true, value: { job: { state: 'published' }, result: { successfulCount: 2 } } });
  });

  it('recovers committed but unacknowledged transition receipts and atomically claims reconciliation work', async () => {
    const clock = new MutableClock(); const repository = new InMemoryStage4Repository([stage4State(TEST_ORG, TEST_ARTICLE, [TEST_SITE])]); const actor = createStage4Actor(TEST_ORG);
    const input = { jobId: crypto.randomUUID(), organizationId: TEST_ORG, articleId: TEST_ARTICLE, siteIds: [TEST_SITE], idempotencyKey: 'receipt-crash', fingerprint: 'v1:receipt-crash', fingerprintVersion: 1, options: {}, now: clock.now().toISOString(), targetIds: [crypto.randomUUID()], articleSiteIds: [crypto.randomUUID()] };
    const accepted = await repository.acceptPublication(actor, input); expect(accepted.kind).toBe('created'); if (accepted.kind !== 'created') return;
    const [dispatchA, dispatchB] = await Promise.all([
      repository.claimDispatchGaps(input.now, 10, crypto.randomUUID(), '2026-08-30T00:01:00.000Z'),
      repository.claimDispatchGaps(input.now, 10, crypto.randomUUID(), '2026-08-30T00:01:00.000Z'),
    ]); expect(dispatchA.length + dispatchB.length).toBe(1);
    const claimedJob = [...dispatchA, ...dispatchB][0]!; await repository.recordDispatchScheduled(TEST_ORG, claimedJob.id, input.now);
    const claim = await repository.claimJob(TEST_ORG, accepted.job.id, 'receipt-worker', '2026-08-30T00:01:00.000Z', input.now); expect(claim).not.toBeNull(); if (claim === null) return;
    const target = (await repository.snapshot(TEST_ORG))!.targets[0]!;
    const processing = await repository.transitionTarget(claim, { targetId: target.id, toState: 'processing', now: input.now });
    await repository.acknowledgeTransitionReceipt(TEST_ORG, processing.receiptId, input.now);
    const retrying = await repository.transitionTarget(claim, { targetId: target.id, toState: 'retrying', nextAttemptAt: input.now, sanitizedError: { code: 'temporary' }, now: input.now });
    const resumed = await repository.transitionTarget(claim, { targetId: target.id, toState: 'processing', now: input.now });
    await repository.acknowledgeTransitionReceipt(TEST_ORG, resumed.receiptId, input.now);
    expect((await repository.snapshot(TEST_ORG))?.transitionReceipts).toEqual(expect.arrayContaining([expect.objectContaining({ id: retrying.receiptId, fromState: 'processing', toState: 'retrying', acknowledgedAt: null })]));
    const worker = new PublicationWorker(repository, new InMemoryRedisCoordination(), new DeterministicPublicationTargetPublisher(), new InMemoryObjectStorage(), { maxAttempts: 3, delaysSeconds: [1], leaseSeconds: 30, batchSize: 10, functionDeadlineSeconds: 20 }, clock);
    await worker.reconcile(); expect((await repository.snapshot(TEST_ORG))?.transitionReceipts.filter(({ acknowledgedAt }) => acknowledgedAt === null)).toHaveLength(0);
  });

  it('claims cleanup once and terminates cleanup after the configured retry bound', async () => {
    const clock = new MutableClock(); const base = stage4State(); const task = { id: crypto.randomUUID(), organizationId: TEST_ORG, objectKey: 'assets/orphan.jpg', reason: 'rejected', status: 'pending' as const, attempts: 0, nextAttemptAt: clock.now().toISOString(), sanitizedFailure: null };
    const claimRepository = new InMemoryStage4Repository([{ ...base, cleanupTasks: [task] }]);
    const [claimA, claimB] = await Promise.all([
      claimRepository.claimCleanupTasks(clock.now().toISOString(), 10, crypto.randomUUID(), '2026-08-30T00:01:00.000Z'),
      claimRepository.claimCleanupTasks(clock.now().toISOString(), 10, crypto.randomUUID(), '2026-08-30T00:01:00.000Z'),
    ]); expect(claimA.length + claimB.length).toBe(1);
    const repository = new InMemoryStage4Repository([{ ...base, cleanupTasks: [task] }]); const storage = new InMemoryObjectStorage(); storage.deleteExact = async () => { throw new Error('delete unavailable'); };
    const worker = new PublicationWorker(repository, new InMemoryRedisCoordination(), new DeterministicPublicationTargetPublisher(), storage, { maxAttempts: 2, delaysSeconds: [1], leaseSeconds: 30, batchSize: 10, functionDeadlineSeconds: 20 }, clock);
    await worker.reconcile(); expect((await repository.snapshot(TEST_ORG))?.cleanupTasks[0]).toMatchObject({ status: 'pending', attempts: 1 });
    clock.advance(1); await worker.reconcile(); expect((await repository.snapshot(TEST_ORG))?.cleanupTasks[0]).toMatchObject({ status: 'failed', attempts: 2 });
  });
});
