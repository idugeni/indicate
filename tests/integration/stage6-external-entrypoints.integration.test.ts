import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { TenantBusinessService } from '@/application/stage3/tenant-business-service';
import { MediaService } from '@/application/stage4/media-service';
import { PublicationService } from '@/application/stage4/publication-service';
import { ApiKeyService, type ApiKeyHasher, type CredentialGenerator } from '@/application/stage6/api-key-service';
import { CustomerService } from '@/application/stage6/customer-service';
import { RateLimitService } from '@/application/stage6/rate-limit-service';
import { TelegramMappingService } from '@/application/stage6/telegram-mapping-service';
import { TelegramWorkflowService } from '@/application/stage6/telegram-workflow-service';
import { signWebhook, WebhookService } from '@/application/stage6/webhook-service';
import { STAGE6_PERMISSIONS } from '@/domain/stage6/permissions';
import { InMemoryRateLimitAdapter } from '@/infrastructure/testing/rate-limit-memory';
import { ALPHA_ARTICLE_ID, ALPHA_ORGANIZATION_ID, ALPHA_REGION_ID, ALPHA_SITE_ID, createStage3Actor, createStage3RepositoryFixture, STAGE3_USER_ID } from '@/infrastructure/testing/stage3-fixture';
import { createStage4RepositoryFixture } from '@/infrastructure/testing/stage4-fixture';
import { InMemoryStage6Repository } from '@/infrastructure/testing/stage6-memory';
import { SequenceIdentifierGenerator } from '../helpers/stage3';

const NOW = new Date('2026-08-30T00:00:00.000Z');
const TELEGRAM_DATE = Math.floor(NOW.getTime() / 1_000);
const TELEGRAM_SECRET = 'stage6-telegram-secret';
const identity = {
  mappingId: '00000000-0000-4000-8000-000000006010', organizationId: ALPHA_ORGANIZATION_ID,
  userId: STAGE3_USER_ID, roleId: '00000000-0000-4000-8000-000000000020', telegramUserId: '6001', telegramChatId: '6002',
  permissions: createStage3Actor().permissionSet,
};

function createTelegramHarness(repository = new InMemoryStage6Repository()) {
  repository.seedTelegram(identity);
  const stage3 = createStage3RepositoryFixture(); const stage4 = createStage4RepositoryFixture(); const identifiers = new SequenceIdentifierGenerator();
  const messages: string[] = []; let serviceCreations = 0;
  const telegram = { check: async () => ({ service: 'test', status: 'healthy' as const }), send: async ({ text }: { text: string }) => { messages.push(text); } };
  const transfer = {
    prepare: async ({ expectedSize }: { expectedSize: number }) => {
      const bytes = new Uint8Array(expectedSize).fill(7).buffer;
      return { bytes, sizeBytes: expectedSize, checksumSha256: createHash('sha256').update(Buffer.from(bytes)).digest('base64') };
    },
    transfer: async ({ media, authorization, mediaType }: { media: { sizeBytes: number; checksumSha256: string }; authorization: { key: string }; mediaType: string }) => {
      stage4.storage.putObject({ key: authorization.key, contentType: mediaType, contentLength: media.sizeBytes, checksum: media.checksumSha256 });
    },
  };
  const services = { create: () => {
    serviceCreations += 1;
    return {
      articles: new TenantBusinessService(stage3.repository, identifiers),
      media: new MediaService(stage4.repository, stage4.storage, identifiers, { maxBytes: 1024, allowedTypes: ['image/png'], uploadTtlSeconds: 60, readTtlSeconds: 60 }, { now: () => NOW }),
      publication: new PublicationService(stage4.repository, stage4.queue, identifiers, { maxAttempts: 2, delaysSeconds: [1] }, { now: () => NOW }),
    };
  } };
  const workflow = new TelegramWorkflowService(repository, services, transfer, telegram, TELEGRAM_SECRET, 300, 900, { now: () => NOW });
  const send = (updateId: number, message: Record<string, unknown>, secret: string | null = TELEGRAM_SECRET) => workflow.handle(secret, { update_id: updateId, message: { date: TELEGRAM_DATE, from: { id: 6001 }, chat: { id: 6002 }, ...message } }, `telegram-${updateId}`);
  return { repository, stage3, stage4, messages, workflow, send, serviceCreations: () => serviceCreations };
}

class QuickHasher implements ApiKeyHasher {
  async hash(secret: string, salt: string) { return createHash('sha256').update(`${salt}:${secret}`).digest('base64'); }
  async verify(secret: string, salt: string, expectedHash: string) { return (await this.hash(secret, salt)) === expectedHash; }
}
class Credentials implements CredentialGenerator {
  private index = 0;
  create() { this.index += 1; const lookupId = String(this.index).padStart(16, '0'); const secret = Buffer.from(`stage6-secret-${this.index}`.padEnd(32, 'x')).toString('base64url').slice(0, 43).padEnd(43, 'x'); return { lookupId, salt: Buffer.from(`salt-${this.index}`).toString('base64'), verificationHash: '', plaintext: `ind_live_${lookupId}.${secret}` }; }
}

describe('Stage 6 Telegram, API, webhook, customer, and subscription integration', () => {
  it('authenticates Telegram and completes Article, Region, Site, image, publication, status, link, and replay flows through shared services', async () => {
    const harness = createTelegramHarness();
    await expect(harness.send(1, { text: '/regions' }, 'wrong-secret')).resolves.toMatchObject({ ok: false, error: { error: { code: 'RESOURCE_UNAVAILABLE' } } });
    await expect(harness.send(2, { text: '/regions' })).resolves.toMatchObject({ ok: true });
    expect(harness.messages.at(-1)).toContain(ALPHA_REGION_ID);

    const articleSteps = ['/article', ALPHA_REGION_ID, 'Telegram title', 'Telegram body', 'Telegram source', 'telegram-stage6'];
    for (let index = 0; index < articleSteps.length; index += 1) expect((await harness.send(10 + index, { text: articleSteps[index] })).ok).toBe(true);
    expect(harness.stage3.repository.snapshot(ALPHA_ORGANIZATION_ID)?.articles.some(({ slug }) => slug === 'telegram-stage6')).toBe(true);

    expect((await harness.send(20, { text: `/sites ${ALPHA_ARTICLE_ID}` })).ok).toBe(true);
    expect(harness.messages.at(-1)).toContain(ALPHA_REGION_ID);
    expect((await harness.send(21, { text: ALPHA_SITE_ID })).ok).toBe(true);
    expect((await harness.send(30, { text: `/image ${ALPHA_ARTICLE_ID}` })).ok).toBe(true);
    expect((await harness.send(31, { document: { file_id: 'file-1', file_unique_id: 'unique-1', file_name: 'lead.png', mime_type: 'image/png', file_size: 4 } })).ok).toBe(true);
    expect((await harness.stage4.repository.snapshot(ALPHA_ORGANIZATION_ID))?.media).toHaveLength(1);

    const published = await harness.send(40, { text: `/publish ${ALPHA_ARTICLE_ID} ${ALPHA_SITE_ID} telegram-stage6-key` });
    expect(published).toMatchObject({ ok: true, value: { businessResult: { job: { state: 'queued' } } } });
    if (!published.ok) return;
    const jobId = (published.value.businessResult as { job: { id: string } }).job.id;
    expect((await harness.send(41, { text: `/status ${jobId}` })).ok).toBe(true);
    expect((await harness.send(42, { text: `/links ${jobId}` })).ok).toBe(true);

    const firstMessageCount = harness.messages.length;
    const duplicate = await harness.send(42, { text: `/links ${jobId}` });
    expect(duplicate.ok).toBe(true);
    expect(harness.messages).toHaveLength(firstMessageCount + 1);
    expect((await harness.workflow.handle(TELEGRAM_SECRET, { update_id: 99, message: { date: TELEGRAM_DATE - 301, from: { id: 6001 }, chat: { id: 6002 }, text: '/regions' } }, 'stale')).ok).toBe(false);
  });

  it('claims authenticated Telegram updates before identity mapping and replays rejected guidance without rerunning services', async () => {
    const order: string[] = [];
    class OrderedRepository extends InMemoryStage6Repository {
      override async claimReplay(input: Parameters<InMemoryStage6Repository['claimReplay']>[0]) { order.push('claim'); return super.claimReplay(input); }
      override async resolveTelegramIdentity(user: string, chat: string) { order.push('resolve'); return super.resolveTelegramIdentity(user, chat); }
      override async bindReplayIdentity(source: string, replayId: string, bodyDigest: string, claimToken: string, organizationId: string, identityDigest: string) { order.push('bind'); return super.bindReplayIdentity(source, replayId, bodyDigest, claimToken, organizationId, identityDigest); }
    }
    const repository = new OrderedRepository(); const harness = createTelegramHarness(repository);
    expect((await harness.send(70, { text: `/sites ${ALPHA_ARTICLE_ID}` })).ok).toBe(true);
    expect(order.slice(0, 3)).toEqual(['claim', 'resolve', 'bind']);
    const rejected = await harness.send(71, { text: 'not-a-listed-site' });
    expect(rejected).toMatchObject({ ok: false, error: { error: { code: 'INVALID_INPUT' } } });
    expect(harness.messages.at(-1)).toContain('Choose only active Sites');
    const creations = harness.serviceCreations();
    const duplicate = await harness.send(71, { text: 'not-a-listed-site' });
    expect(duplicate).toMatchObject({ ok: false, error: { error: { code: 'INVALID_INPUT' } } });
    expect(harness.messages.at(-1)).toContain('Choose only active Sites');
    expect(harness.serviceCreations()).toBe(creations);
  });

  it('recovers an atomically receipted Telegram mutation after outcome preparation fails without rerunning services', async () => {
    const repository = new InMemoryStage6Repository(); const harness = createTelegramHarness(repository);
    expect((await harness.send(72, { text: `/sites ${ALPHA_ARTICLE_ID}` })).ok).toBe(true);
    repository.failNextReplayPrepare = true;
    repository.replayBusinessReceiptOnPrepareFailure = { action: 'article.sites.assign', targetId: ALPHA_ARTICLE_ID, after: { siteIds: [ALPHA_SITE_ID] } };
    const first = await harness.send(73, { text: ALPHA_SITE_ID });
    expect(first).toMatchObject({ ok: false, error: { error: { code: 'DEPENDENCY_UNAVAILABLE' } } });
    expect(harness.stage3.repository.snapshot(ALPHA_ORGANIZATION_ID)?.articleSites.filter(({ articleId, active }) => articleId === ALPHA_ARTICLE_ID && active).map(({ siteId }) => siteId)).toEqual([ALPHA_SITE_ID]);
    const creations = harness.serviceCreations();
    await expect(harness.send(73, { text: ALPHA_SITE_ID })).resolves.toEqual({ ok: true, value: { reply: 'Assigned 1 Site(s).' } });
    expect(harness.serviceCreations()).toBe(creations);
  });

  it('reconciles a prepared webhook outcome after finalization failure without rerunning committed work', async () => {
    const repository = new InMemoryStage6Repository(); const secret = 'generic-stage6-secret';
    const webhook = new WebhookService(repository, { generic: secret }, 300, 900, { now: () => NOW });
    const body = JSON.stringify({ event: 'committed' }); const timestamp = Math.floor(NOW.getTime() / 1_000);
    const headers = { source: 'generic', replayId: 'completion-failure', timestamp, signature: signWebhook(secret, timestamp, body) };
    const outcome = { accepted: true, payloadDigest: createHash('sha256').update(body).digest('hex') }; repository.failNextReplayFinalize = true;
    await expect(webhook.process(body, headers, ALPHA_ORGANIZATION_ID, 'first')).resolves.toEqual({ ok: true, value: outcome });
    await expect(webhook.process(body, headers, ALPHA_ORGANIZATION_ID, 'duplicate')).resolves.toEqual({ ok: true, value: outcome });
  });

  it('rotates replay fencing tokens on reclaim and rejects every stale worker write', async () => {
    const repository = new InMemoryStage6Repository();
    const firstInput = { source: 'fenced', replayId: 'overlap', organizationId: ALPHA_ORGANIZATION_ID, bodyDigest: 'f'.repeat(64), receivedAt: NOW.toISOString(), leaseExpiresAt: new Date(NOW.getTime() + 1_000).toISOString(), expiresAt: new Date(NOW.getTime() + 900_000).toISOString() };
    const first = await repository.claimReplay(firstInput); expect(first.kind).toBe('created');
    const reclaimed = await repository.claimReplay({ ...firstInput, receivedAt: new Date(NOW.getTime() + 2_000).toISOString(), leaseExpiresAt: new Date(NOW.getTime() + 32_000).toISOString() }); expect(reclaimed.kind).toBe('reclaimed');
    expect(reclaimed.claim.claimToken).not.toBe(first.claim.claimToken);
    await expect(repository.bindReplayIdentity(firstInput.source, firstInput.replayId, firstInput.bodyDigest, first.claim.claimToken, ALPHA_ORGANIZATION_ID, 'a'.repeat(64))).rejects.toBeInstanceOf(Error);
    await expect(repository.prepareReplayOutcome(firstInput.source, firstInput.replayId, firstInput.bodyDigest, first.claim.claimToken, 'processed', { stale: true })).rejects.toBeInstanceOf(Error);
    await expect(repository.prepareReplayOutcome(firstInput.source, firstInput.replayId, firstInput.bodyDigest, reclaimed.claim.claimToken, 'processed', { winner: true })).resolves.toMatchObject({ pendingStatus: 'processed', outcome: { winner: true } });
    await expect(repository.finalizeReplay(firstInput.source, firstInput.replayId, firstInput.bodyDigest, first.claim.claimToken)).rejects.toBeInstanceOf(Error);
    await expect(repository.finalizeReplay(firstInput.source, firstInput.replayId, firstInput.bodyDigest, reclaimed.claim.claimToken)).resolves.toMatchObject({ status: 'processed', outcome: { winner: true } });
  });

  it('keeps API key plaintext out of persistence and enforces scope, rotation, revocation, and audit rollback', async () => {
    const repository = new InMemoryStage6Repository(); const actor = createStage3Actor();
    const service = new ApiKeyService(repository, new SequenceIdentifierGenerator(), new Credentials(), { now: () => NOW }, new QuickHasher());
    const issued = await service.issue(actor, { name: 'Publisher API', scopes: ['article.read'], expiresAt: null });
    expect(issued.ok).toBe(true); if (!issued.ok) return;
    expect(JSON.stringify(repository.snapshotApiKeys())).not.toContain(issued.value.plaintext);
    expect((await service.authenticate(issued.value.plaintext, 'article.read')).ok).toBe(true);
    expect((await service.authenticate(issued.value.plaintext, 'publishing.request')).ok).toBe(false);
    expect(repository.audits.some(({ action }) => action === 'api_key.authenticate.scope.denied')).toBe(true);
    const rotated = await service.rotate(actor, { apiKeyId: issued.value.key.id, expectedVersion: 1 });
    expect(rotated.ok).toBe(true); if (!rotated.ok) return;
    expect((await service.authenticate(issued.value.plaintext, 'article.read')).ok).toBe(false);
    expect((await service.revoke(actor, { apiKeyId: rotated.value.key.id, expectedVersion: 1 })).ok).toBe(true);
    expect((await service.authenticate(rotated.value.plaintext, 'article.read')).ok).toBe(false);
    const before = repository.snapshotApiKeys(); repository.failNextAudit = true;
    expect((await service.issue(actor, { name: 'Rollback', scopes: ['article.read'], expiresAt: null })).ok).toBe(false);
    expect(repository.snapshotApiKeys()).toEqual(before);
  });

  it('partitions rate limits, returns bounded excess guidance, and applies explicit dependency failure modes', async () => {
    const port = new InMemoryRateLimitAdapter(); const service = new RateLimitService(port, { now: () => NOW });
    const alpha = createStage3Actor(ALPHA_ORGANIZATION_ID); const beta = createStage3Actor('00000000-0000-4000-8000-000000000002');
    const policy = { allowance: 2, windowSeconds: 30, failureMode: 'closed' as const };
    expect((await service.enforce(service.authenticatedKey('mutation', alpha), policy, '1')).ok).toBe(true);
    expect((await service.enforce(service.authenticatedKey('mutation', alpha), policy, '2')).ok).toBe(true);
    await expect(service.enforce(service.authenticatedKey('mutation', alpha), policy, '3')).resolves.toMatchObject({ ok: false, error: { error: { code: 'RATE_LIMITED', fields: { retryAfterSeconds: ['30'] } } } });
    expect((await service.enforce(service.authenticatedKey('mutation', beta), policy, '4')).ok).toBe(true);
    port.failNext = true; expect((await service.enforce('protected', policy, '5')).ok).toBe(false);
    port.failNext = true; expect((await service.enforce('public', { ...policy, failureMode: 'open_low_risk' }, '6')).ok).toBe(true);
  });

  it('persists one generic webhook outcome and platform-protects atomic customer/subscription administration', async () => {
    const repository = new InMemoryStage6Repository(); const secret = 'generic-stage6-secret'; const webhook = new WebhookService(repository, { generic: secret }, 300, 900, { now: () => NOW });
    const body = JSON.stringify({ event: 'publication.ready' }); const timestamp = Math.floor(NOW.getTime() / 1_000);
    const headers = { source: 'generic', replayId: 'event-1', timestamp, signature: signWebhook(secret, timestamp, body) };
    const outcome = { accepted: true, payloadDigest: createHash('sha256').update(body).digest('hex') };
    await expect(webhook.process(body, headers, ALPHA_ORGANIZATION_ID, 'webhook-1')).resolves.toEqual({ ok: true, value: outcome });
    await expect(webhook.process(body, headers, ALPHA_ORGANIZATION_ID, 'webhook-2')).resolves.toEqual({ ok: true, value: outcome });

    const invalidBody = '{';
    const invalidHeaders = { source: 'generic', replayId: 'event-invalid', timestamp, signature: signWebhook(secret, timestamp, invalidBody) };
    const invalidFirst = await webhook.process(invalidBody, invalidHeaders, ALPHA_ORGANIZATION_ID, 'webhook-invalid-1');
    const invalidDuplicate = await webhook.process(invalidBody, invalidHeaders, ALPHA_ORGANIZATION_ID, 'webhook-invalid-2');
    expect(invalidFirst).toMatchObject({ ok: false, error: { error: { code: 'INVALID_INPUT' } } });
    expect(invalidDuplicate).toMatchObject({ ok: false, error: { error: { code: 'INVALID_INPUT' } } });

    const customer = new CustomerService(repository, new SequenceIdentifierGenerator(), { now: () => NOW }); const platformActor = createStage3Actor();
    const created = await customer.create(platformActor, { name: 'Stage 6 Customer', slug: 'stage-6-customer', customerMetadata: { source: 'test' }, subscription: { plan: 'starter', status: 'trialing', periodStartsAt: null, periodEndsAt: null } });
    expect(created.ok).toBe(true); if (!created.ok) return;
    const deniedActor = { ...platformActor, permissionSet: new Set([STAGE6_PERMISSIONS.subscriptionRead]) };
    expect((await customer.list(deniedActor)).ok).toBe(false);
    expect(repository.audits.some(({ action }) => action === 'customer.list.denied')).toBe(true);
    expect((await customer.updateSubscription(deniedActor, { organizationId: created.value.customer.id, expectedVersion: 1, plan: 'pro', status: 'active', periodStartsAt: null, periodEndsAt: null })).ok).toBe(false);
    const mappings = new TelegramMappingService(repository, new SequenceIdentifierGenerator(), { now: () => NOW });
    expect((await mappings.list(deniedActor)).ok).toBe(false);
    expect(repository.audits.some(({ action }) => action === 'telegram_mapping.list.denied')).toBe(true);
    const mapping = await mappings.create(platformActor, { userId: STAGE3_USER_ID, roleId: identity.roleId, telegramUserId: '7001', telegramChatId: '7002' });
    expect(mapping).toMatchObject({ ok: true, value: { status: 'active', telegramUserId: '7001' } });
    if (mapping.ok) expect(await mappings.update(platformActor, { mappingId: mapping.value.id, expectedVersion: 1, userId: STAGE3_USER_ID, roleId: identity.roleId, telegramUserId: '7001', telegramChatId: '7002', status: 'inactive' })).toMatchObject({ ok: true, value: { status: 'inactive', version: 2 } });

    const prior = repository.snapshotCustomers(); repository.failNextAudit = true;
    expect((await customer.updateSubscription(platformActor, { organizationId: created.value.customer.id, expectedVersion: 1, plan: 'pro', status: 'active', periodStartsAt: null, periodEndsAt: null })).ok).toBe(false);
    expect(repository.snapshotCustomers()).toEqual(prior);
  });

  it('denies an ambiguous Telegram identity instead of selecting an arbitrary Organization', async () => {
    const repository = new InMemoryStage6Repository();
    repository.seedTelegram(identity);
    repository.seedTelegram({ ...identity, mappingId: '00000000-0000-4000-8000-000000006011', organizationId: '00000000-0000-4000-8000-000000000002' });
    await expect(repository.resolveTelegramIdentity(identity.telegramUserId, identity.telegramChatId)).resolves.toBeNull();
  });
});
