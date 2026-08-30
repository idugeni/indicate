import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AuthorizedTenantActorContext } from '@/domain/context/operation-context';
import { STAGE4_PERMISSION_NAMES } from '@/domain/stage4/permissions';
import { DrizzleStage4Repository } from '@/infrastructure/db/repositories/drizzle-stage4-repository';
import * as schema from '@/infrastructure/db/schema';
import type { AcceptPublicationInput, ReserveMediaCandidate } from '@/ports/stage4-repository';

const databaseUrl = process.env.TEST_DATABASE_URL;
const runtimePassword = 'stage2-runtime-contract-password';
const ids = {
  organizationA: '00000000-0000-4000-8000-000000000401', organizationB: '00000000-0000-4000-8000-000000000402',
  userA: '00000000-0000-4000-8000-000000000410', userB: '00000000-0000-4000-8000-000000000411',
  authA: '00000000-0000-4000-8000-000000000490', authB: '00000000-0000-4000-8000-000000000491',
  roleA: '00000000-0000-4000-8000-000000000420', roleB: '00000000-0000-4000-8000-000000000421',
  domainA: '00000000-0000-4000-8000-000000000430', domainB: '00000000-0000-4000-8000-000000000431',
  regionA: '00000000-0000-4000-8000-000000000432', regionA2: '00000000-0000-4000-8000-000000000439', regionMedia: '00000000-0000-4000-8000-000000000450', regionB: '00000000-0000-4000-8000-000000000433',
  siteA: '00000000-0000-4000-8000-000000000434', siteA2: '00000000-0000-4000-8000-000000000435', siteMedia: '00000000-0000-4000-8000-000000000451', siteB: '00000000-0000-4000-8000-000000000436',
  articleA: '00000000-0000-4000-8000-000000000437', articleMedia: '00000000-0000-4000-8000-000000000452', articleDraft: '00000000-0000-4000-8000-000000000453', articleB: '00000000-0000-4000-8000-000000000438',
  mediaArchive: '00000000-0000-4000-8000-000000000454', mediaDraft: '00000000-0000-4000-8000-000000000455',
};
const permissionIds = [
  '00000000-0000-4000-8000-000000000440', '00000000-0000-4000-8000-000000000441',
  '00000000-0000-4000-8000-000000000442', '00000000-0000-4000-8000-000000000443',
  '00000000-0000-4000-8000-000000000444', '00000000-0000-4000-8000-000000000445',
  '00000000-0000-4000-8000-000000000446', '00000000-0000-4000-8000-000000000447',
  '00000000-0000-4000-8000-000000000448', '00000000-0000-4000-8000-000000000449',
];

function runtimeUrl(ownerUrl: string): string { const value = new URL(ownerUrl); value.username = 'indicate_runtime'; value.password = runtimePassword; return value.toString(); }
function actor(organizationId: string): AuthorizedTenantActorContext {
  const alpha = organizationId === ids.organizationA;
  return { actorType: 'user', actorId: alpha ? ids.userA : ids.userB, verifiedAuthUserId: alpha ? ids.authA : ids.authB, organizationId, permissionSet: new Set(STAGE4_PERMISSION_NAMES), entryPoint: 'cms', requestId: crypto.randomUUID() };
}
const LIVE_CHECKSUM = '47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=';
function reservation(objectKey: string, owner: ReserveMediaCandidate['owner'] = { kind: 'organization' }): ReserveMediaCandidate {
  const now = new Date(); return { reservationId: crypto.randomUUID(), objectKey, purpose: 'contract', owner, expectedMediaType: 'image/jpeg', expectedSizeBytes: 128, expectedChecksum: LIVE_CHECKSUM, expiresAt: new Date(now.getTime() + 60_000).toISOString(), now: now.toISOString() };
}
function publication(organizationId: string, articleId: string, siteIds: readonly string[], idempotencyKey: string, fingerprint = 'v1:stage4-live'): AcceptPublicationInput {
  return { jobId: crypto.randomUUID(), organizationId, articleId, siteIds, idempotencyKey, fingerprint, fingerprintVersion: 1, options: { mode: 'immediate' }, now: new Date().toISOString(), targetIds: siteIds.map(() => crypto.randomUUID()), articleSiteIds: siteIds.map(() => crypto.randomUUID()) };
}

const suite = databaseUrl === undefined ? describe.skip : describe;
suite('live PostgreSQL Stage 4 contract', () => {
  const ownerClient = databaseUrl === undefined ? null : postgres(databaseUrl, { max: 10, prepare: false });
  const runtimeClient = databaseUrl === undefined ? null : postgres(runtimeUrl(databaseUrl), { max: 10, prepare: false });
  const runtimeDatabase = runtimeClient === null ? null : drizzle(runtimeClient, { schema });
  const repository = runtimeDatabase === null ? null : new DrizzleStage4Repository(runtimeDatabase);

  beforeAll(async () => {
    if (ownerClient === null) return;
    const versions = await ownerClient<{ version: number }[]>`SELECT version FROM indicate_schema_migrations WHERE version = 7`;
    if (versions.length !== 1) throw new Error('Stage 4 schema migration version 7 is required before this contract.');
    await ownerClient.unsafe(`ALTER ROLE indicate_runtime PASSWORD '${runtimePassword}'`);
    await ownerClient`INSERT INTO organizations (id, name, slug) VALUES (${ids.organizationA}::uuid, 'Stage4 A', 'stage4-a'), (${ids.organizationB}::uuid, 'Stage4 B', 'stage4-b')`;
    await ownerClient`INSERT INTO users (id, auth_user_id, display_name) VALUES (${ids.userA}::uuid, ${ids.authA}::uuid, 'Stage4 A Editor'), (${ids.userB}::uuid, ${ids.authB}::uuid, 'Stage4 B Editor')`;
    await ownerClient`INSERT INTO roles (organization_id, id, name) VALUES (${ids.organizationA}::uuid, ${ids.roleA}::uuid, 'Stage4 Administrator'), (${ids.organizationB}::uuid, ${ids.roleB}::uuid, 'Stage4 Administrator')`;
    for (let organizationIndex = 0; organizationIndex < 2; organizationIndex += 1) {
      const organizationId = organizationIndex === 0 ? ids.organizationA : ids.organizationB; const roleId = organizationIndex === 0 ? ids.roleA : ids.roleB;
      for (let permissionIndex = 0; permissionIndex < STAGE4_PERMISSION_NAMES.length; permissionIndex += 1) {
        const permissionId = permissionIds[organizationIndex * STAGE4_PERMISSION_NAMES.length + permissionIndex]!; const name = STAGE4_PERMISSION_NAMES[permissionIndex]!;
        await ownerClient`INSERT INTO permissions (id, organization_id, name, scope, description) VALUES (${permissionId}::uuid, ${organizationId}::uuid, ${name}, 'organization', 'Stage 4 contract')`;
        await ownerClient`INSERT INTO role_permissions (organization_id, role_id, permission_id) VALUES (${organizationId}::uuid, ${roleId}::uuid, ${permissionId}::uuid)`;
      }
    }
    await ownerClient`INSERT INTO memberships (organization_id, user_id, role_id) VALUES (${ids.organizationA}::uuid, ${ids.userA}::uuid, ${ids.roleA}::uuid), (${ids.organizationB}::uuid, ${ids.userB}::uuid, ${ids.roleB}::uuid)`;
    await ownerClient`INSERT INTO domains (organization_id, id, normalized_hostname, status) VALUES (${ids.organizationA}::uuid, ${ids.domainA}::uuid, 'stage4-a.example.test', 'active'), (${ids.organizationB}::uuid, ${ids.domainB}::uuid, 'stage4-b.example.test', 'active')`;
    await ownerClient`INSERT INTO regions (organization_id, id, external_key, name, slug) VALUES
      (${ids.organizationA}::uuid, ${ids.regionA}::uuid, 'stage4-a', 'Stage4 A', 'stage4-a'),
      (${ids.organizationA}::uuid, ${ids.regionA2}::uuid, 'stage4-a-two', 'Stage4 A Two', 'stage4-a-two'),
      (${ids.organizationA}::uuid, ${ids.regionMedia}::uuid, 'stage4-media', 'Stage4 Media', 'stage4-media'),
      (${ids.organizationB}::uuid, ${ids.regionB}::uuid, 'stage4-b', 'Stage4 B', 'stage4-b')`;
    await ownerClient`INSERT INTO sites (organization_id, id, domain_id, region_id, normalized_hostname, status, activation_state) VALUES
      (${ids.organizationA}::uuid, ${ids.siteA}::uuid, ${ids.domainA}::uuid, ${ids.regionA}::uuid, 'stage4-a.stage4-a.example.test', 'active', 'active'),
      (${ids.organizationA}::uuid, ${ids.siteA2}::uuid, ${ids.domainA}::uuid, ${ids.regionA2}::uuid, 'stage4-a-two.stage4-a.example.test', 'active', 'active'),
      (${ids.organizationA}::uuid, ${ids.siteMedia}::uuid, ${ids.domainA}::uuid, ${ids.regionMedia}::uuid, 'stage4-media.stage4-a.example.test', 'active', 'active'),
      (${ids.organizationB}::uuid, ${ids.siteB}::uuid, ${ids.domainB}::uuid, ${ids.regionB}::uuid, 'stage4-b.stage4-b.example.test', 'active', 'active')`;
    await ownerClient`INSERT INTO articles (organization_id, id, region_id, slug, title, body, source, status) VALUES
      (${ids.organizationA}::uuid, ${ids.articleA}::uuid, ${ids.regionA}::uuid, 'stage4-a', 'Stage4 A', 'Body', 'Contract', 'active'),
      (${ids.organizationA}::uuid, ${ids.articleMedia}::uuid, ${ids.regionMedia}::uuid, 'stage4-media', 'Stage4 Media', 'Body', 'Contract', 'active'),
      (${ids.organizationA}::uuid, ${ids.articleDraft}::uuid, ${ids.regionMedia}::uuid, 'stage4-draft', 'Stage4 Draft', 'Body', 'Contract', 'draft'),
      (${ids.organizationB}::uuid, ${ids.articleB}::uuid, ${ids.regionB}::uuid, 'stage4-b', 'Stage4 B', 'Body', 'Contract', 'active')`;
  }, 30_000);

  afterAll(async () => { await Promise.all([runtimeClient?.end({ timeout: 5 }), ownerClient?.end({ timeout: 5 })]); });

  it('enforces global object-key reservation, owner prefixes, and same-tenant ownership', async () => {
    if (repository === null || ownerClient === null) return;
    const sharedKey = `assets/stage4-global-${crypto.randomUUID()}.jpg`;
    await expect(repository.reserveMediaCandidate(actor(ids.organizationA), reservation(sharedKey))).resolves.toMatchObject({ kind: 'reserved' });
    await expect(repository.reserveMediaCandidate(actor(ids.organizationB), reservation(sharedKey))).resolves.toEqual({ kind: 'occupied' });
    await expect(repository.reserveMediaCandidate(actor(ids.organizationA), reservation(`articles/${ids.articleB}/foreign.jpg`, { kind: 'article', articleId: ids.articleB }))).rejects.toThrow();
    await expect(ownerClient`INSERT INTO media_key_reservations (organization_id, id, object_key, purpose, organization_asset, expected_media_type, expected_size_bytes, expires_at) VALUES (${ids.organizationA}::uuid, ${crypto.randomUUID()}::uuid, 'articles/wrong-prefix.jpg', 'invalid', true, 'image/jpeg', 1, now() + interval '1 minute')`).rejects.toThrow();
  });

  it('converges matching concurrent acceptance, preserves conflicts, partitions tenants, and keeps targets immutable', async () => {
    if (repository === null || ownerClient === null) return;
    const key = `stage4-concurrent-${crypto.randomUUID()}`; const first = publication(ids.organizationA, ids.articleA, [ids.siteA], key); const second = { ...publication(ids.organizationA, ids.articleA, [ids.siteA], key), fingerprint: first.fingerprint };
    const results = await Promise.all([repository.acceptPublication(actor(ids.organizationA), first), repository.acceptPublication(actor(ids.organizationA), second)]);
    expect(results.map(({ kind }) => kind).sort()).toEqual(['created', 'reused']);
    const canonicalJob = results.find(({ kind }) => kind === 'created')!; if (canonicalJob.kind !== 'created') return;
    await expect(repository.acceptPublication(actor(ids.organizationA), publication(ids.organizationA, ids.articleA, [ids.siteA], key, 'v1:conflict'))).resolves.toMatchObject({ kind: 'conflict', existingJobId: canonicalJob.job.id });
    await expect(repository.acceptPublication(actor(ids.organizationB), publication(ids.organizationB, ids.articleB, [ids.siteB], key, first.fingerprint))).resolves.toMatchObject({ kind: 'created' });
    await expect(repository.acceptPublication(actor(ids.organizationA), publication(ids.organizationA, ids.articleA, [ids.siteB], `foreign-${key}`))).rejects.toThrow();
    await expect(repository.acceptPublication(actor(ids.organizationA), publication(ids.organizationA, ids.articleA, [ids.siteA], `immutable-${key}`))).rejects.toThrow();
    const jobs = await ownerClient<{ count: number }[]>`SELECT count(*)::integer AS count FROM publishing_jobs WHERE organization_id = ${ids.organizationA}::uuid AND idempotency_key = ${key}`;
    expect(jobs).toEqual([{ count: 1 }]);
  }, 30_000);

  it('rejects invalid transitions and stale fencing while recovering running targets for the next owner', async () => {
    if (repository === null || ownerClient === null) return;
    const input = publication(ids.organizationA, ids.articleA, [ids.siteA2], `stage4-fence-${crypto.randomUUID()}`); const accepted = await repository.acceptPublication(actor(ids.organizationA), input);
    expect(accepted.kind).toBe('created'); if (accepted.kind !== 'created') return;
    const target = (await repository.getPublication(actor(ids.organizationA), accepted.job.id))!.targets[0]!;
    await expect(ownerClient`UPDATE publishing_job_targets SET state = 'published' WHERE organization_id = ${ids.organizationA}::uuid AND id = ${target.id}::uuid`).rejects.toThrow();
    const start = new Date(); const firstLeaseEnd = new Date(start.getTime() + 500); const first = await repository.claimJob(ids.organizationA, accepted.job.id, 'worker-first', firstLeaseEnd.toISOString(), start.toISOString()); expect(first).not.toBeNull(); if (first === null) return;
    const processing = await repository.transitionTarget(first, { targetId: target.id, toState: 'processing', now: start.toISOString() });
    expect(processing.receiptId).toBeTruthy();
    await new Promise((resolve) => setTimeout(resolve, 650));
    const recoveredAt = new Date();
    await expect(repository.transitionTarget(first, { targetId: target.id, toState: 'published', publishedUrl: 'https://late-before-recovery.example.test/article', now: recoveredAt.toISOString() })).rejects.toThrow('stale_fence');
    await expect(repository.releaseJob(first, recoveredAt.toISOString())).rejects.toThrow('stale_fence');
    await repository.recoverExpiredLease(ids.organizationA, accepted.job.id, 3, recoveredAt.toISOString());
    const second = await repository.claimJob(ids.organizationA, accepted.job.id, 'worker-second', new Date(start.getTime() + 30_000).toISOString(), recoveredAt.toISOString()); expect(second).not.toBeNull(); if (second === null) return;
    await expect(repository.transitionTarget(first, { targetId: target.id, toState: 'published', publishedUrl: 'https://stale.example.test/article', now: recoveredAt.toISOString() })).rejects.toThrow('stale_fence');
    const runnable = await repository.runnableTargets(second, recoveredAt.toISOString(), 10); expect(runnable.map(({ id }) => id)).toContain(target.id);
    await repository.transitionTarget(second, { targetId: target.id, toState: 'processing', now: recoveredAt.toISOString() });
    const finished = await repository.transitionTarget(second, { targetId: target.id, toState: 'published', publishedUrl: 'https://stage4-a-two.stage4-a.example.test/stage4-a', now: new Date(recoveredAt.getTime() + 1).toISOString() });
    expect(finished.status).toMatchObject({ job: { state: 'published' }, result: { finalState: 'published', successfulCount: 1, urls: ['https://stage4-a-two.stage4-a.example.test/stage4-a'] } });
    await repository.acknowledgeTransitionReceipt(ids.organizationA, finished.receiptId, new Date().toISOString());
    await expect(ownerClient`UPDATE article_sites SET state = 'queued' WHERE organization_id = ${ids.organizationA}::uuid AND id = ${target.articleSiteId}::uuid`).rejects.toThrow();
    const republish = await repository.acceptPublication(actor(ids.organizationA), publication(ids.organizationA, ids.articleA, [ids.siteA2], `stage4-republish-${crypto.randomUUID()}`));
    expect(republish.kind).toBe('created');
    await expect(repository.getPublication(actor(ids.organizationA), accepted.job.id)).resolves.toMatchObject({ result: { urls: ['https://stage4-a-two.stage4-a.example.test/stage4-a'] }, targets: [{ publishedUrl: 'https://stage4-a-two.stage4-a.example.test/stage4-a' }] });
    if (republish.kind === 'created') { const terminalAt = new Date().toISOString(); await repository.recordDispatchFailure(ids.organizationA, republish.job.id, false, terminalAt, terminalAt); }
  }, 30_000);

  it('persists coherent dispatch-exhaustion targets and a readable failed result', async () => {
    if (repository === null) return;
    const input = publication(ids.organizationA, ids.articleA, [ids.siteA2], `stage4-dispatch-terminal-${crypto.randomUUID()}`);
    const accepted = await repository.acceptPublication(actor(ids.organizationA), input); expect(accepted.kind).toBe('created'); if (accepted.kind !== 'created') return;
    const now = new Date().toISOString(); await repository.recordDispatchFailure(ids.organizationA, accepted.job.id, false, now, now);
    await expect(repository.getPublication(actor(ids.organizationA), accepted.job.id)).resolves.toMatchObject({ job: { state: 'failed' }, targets: [{ state: 'failed', sanitizedError: { code: 'dispatch_exhausted' } }], result: { finalState: 'failed', successfulCount: 0, urls: [] } });
  });

  it('denies draft Article media and deduplicates archive invalidation across settings and lead-media references', async () => {
    if (repository === null || ownerClient === null) return;
    const publishedAt = new Date().toISOString();
    await ownerClient`INSERT INTO media (organization_id, id, object_key, purpose, media_type, size_bytes, checksum, state, article_id, organization_asset) VALUES
      (${ids.organizationA}::uuid, ${ids.mediaArchive}::uuid, 'assets/stage4-archive.jpg', 'lead', 'image/jpeg', 128, ${LIVE_CHECKSUM}, 'active', NULL, true),
      (${ids.organizationA}::uuid, ${ids.mediaDraft}::uuid, ${`articles/${ids.articleDraft}/draft.jpg`}, 'lead', 'image/jpeg', 128, ${LIVE_CHECKSUM}, 'active', ${ids.articleDraft}::uuid, false)`;
    await ownerClient`UPDATE articles SET lead_media_id = ${ids.mediaArchive}::uuid WHERE organization_id = ${ids.organizationA}::uuid AND id = ${ids.articleMedia}::uuid`;
    await ownerClient`INSERT INTO article_sites (organization_id, id, article_id, site_id, state, state_occurred_at, published_url, published_at, active) VALUES
      (${ids.organizationA}::uuid, ${crypto.randomUUID()}::uuid, ${ids.articleMedia}::uuid, ${ids.siteMedia}::uuid, 'published', ${publishedAt}, 'https://stage4-media.stage4-a.example.test/stage4-media', ${publishedAt}, true),
      (${ids.organizationA}::uuid, ${crypto.randomUUID()}::uuid, ${ids.articleDraft}::uuid, ${ids.siteMedia}::uuid, 'published', ${publishedAt}, 'https://stage4-media.stage4-a.example.test/stage4-draft', ${publishedAt}, true)`;
    await ownerClient`INSERT INTO site_settings (organization_id, site_id, name, description, logo_media_id) VALUES
      (${ids.organizationA}::uuid, ${ids.siteMedia}::uuid, 'Stage4 Media', 'Media contract', ${ids.mediaArchive}::uuid),
      (${ids.organizationA}::uuid, ${ids.siteA}::uuid, 'Stage4 A', 'Media contract', ${ids.mediaArchive}::uuid)`;
    const context = { normalizedHostname: 'stage4-media.stage4-a.example.test', organizationId: ids.organizationA, domainId: ids.domainA, siteId: ids.siteMedia, regionId: ids.regionMedia, routingVersion: 1 };
    await expect(repository.authorizePublicMedia(context, ids.mediaDraft, crypto.randomUUID())).resolves.toBeNull();
    await expect(repository.archiveMedia(actor(ids.organizationA), ids.mediaArchive, 1, new Date().toISOString())).resolves.toMatchObject({ state: 'archived', version: 2 });
    const invalidations = await ownerClient<{ site_id: string; count: number }[]>`SELECT site_id::text, count(*)::integer AS count FROM invalidation_tasks WHERE organization_id = ${ids.organizationA}::uuid AND reason = 'media.archived' GROUP BY site_id ORDER BY site_id`;
    expect(invalidations).toEqual([
      { site_id: ids.siteA, count: 1 },
      { site_id: ids.siteMedia, count: 1 },
    ].sort((left, right) => left.site_id.localeCompare(right.site_id)));
  });

  it('preserves retry due time and reconciles an unacknowledged receipt after cyclic target progress', async () => {
    if (repository === null || ownerClient === null) return;
    const accepted = await repository.acceptPublication(actor(ids.organizationA), publication(ids.organizationA, ids.articleMedia, [ids.siteMedia], `stage4-retry-receipt-${crypto.randomUUID()}`));
    expect(accepted.kind).toBe('created'); if (accepted.kind !== 'created') return;
    const start = new Date(); const leaseEnd = new Date(start.getTime() + 120_000); const retryAt = new Date(start.getTime() + 30_000); const first = await repository.claimJob(ids.organizationA, accepted.job.id, 'retry-receipt-first', leaseEnd.toISOString(), start.toISOString());
    expect(first).not.toBeNull(); if (first === null) return;
    const target = (await repository.getPublication(actor(ids.organizationA), accepted.job.id))!.targets[0]!;
    const processing = await repository.transitionTarget(first, { targetId: target.id, toState: 'processing', now: start.toISOString() });
    await repository.acknowledgeTransitionReceipt(ids.organizationA, processing.receiptId, start.toISOString());
    const retrying = await repository.transitionTarget(first, { targetId: target.id, toState: 'retrying', nextAttemptAt: retryAt.toISOString(), sanitizedError: { code: 'temporary' }, now: new Date(start.getTime() + 1).toISOString() });
    await repository.releaseJob(first, new Date(start.getTime() + 2).toISOString());
    await expect(repository.getPublication(actor(ids.organizationA), accepted.job.id)).resolves.toMatchObject({ job: { state: 'retrying', nextDispatchAt: retryAt.toISOString() } });
    const second = await repository.claimJob(ids.organizationA, accepted.job.id, 'retry-receipt-second', new Date(start.getTime() + 180_000).toISOString(), retryAt.toISOString());
    expect(second).not.toBeNull(); if (second === null) return;
    const resumed = await repository.transitionTarget(second, { targetId: target.id, toState: 'processing', now: new Date(retryAt.getTime() + 1).toISOString() });
    await repository.acknowledgeTransitionReceipt(ids.organizationA, resumed.receiptId, new Date(retryAt.getTime() + 1).toISOString());
    const tokenA = crypto.randomUUID(); const tokenB = crypto.randomUUID(); const claimExpiry = new Date(Date.now() + 60_000).toISOString();
    const [receiptsA, receiptsB] = await Promise.all([
      repository.claimTransitionReceipts(new Date().toISOString(), 10, tokenA, claimExpiry),
      repository.claimTransitionReceipts(new Date().toISOString(), 10, tokenB, claimExpiry),
    ]);
    const claimed = [...receiptsA.map((receipt) => ({ receipt, token: tokenA })), ...receiptsB.map((receipt) => ({ receipt, token: tokenB }))].filter(({ receipt }) => receipt.id === retrying.receiptId);
    expect(claimed).toHaveLength(1);
    await repository.reconcileTransitionReceipt(claimed[0]!.receipt, claimed[0]!.token, new Date().toISOString());
    const rows = await ownerClient<{ acknowledged_at: Date | string | null }[]>`SELECT acknowledged_at FROM publication_transition_receipts WHERE organization_id = ${ids.organizationA}::uuid AND id = ${retrying.receiptId}::uuid`;
    expect(rows[0]?.acknowledged_at).not.toBeNull();
  }, 30_000);

  it('atomically claims cleanup once and persists terminal cleanup failure', async () => {
    if (repository === null || ownerClient === null) return;
    const taskId = crypto.randomUUID(); const now = new Date(); const expires = new Date(now.getTime() + 60_000).toISOString(); const tokenA = crypto.randomUUID(); const tokenB = crypto.randomUUID();
    await ownerClient`INSERT INTO object_cleanup_tasks (organization_id, id, object_key, reason, status, attempts, next_attempt_at) VALUES (${ids.organizationA}::uuid, ${taskId}::uuid, 'assets/stage4-cleanup.jpg', 'contract', 'pending', 0, ${now.toISOString()})`;
    const [tasksA, tasksB] = await Promise.all([
      repository.claimCleanupTasks(now.toISOString(), 10, tokenA, expires),
      repository.claimCleanupTasks(now.toISOString(), 10, tokenB, expires),
    ]);
    const claimed = [...tasksA.map((task) => ({ task, token: tokenA })), ...tasksB.map((task) => ({ task, token: tokenB }))].filter(({ task }) => task.id === taskId);
    expect(claimed).toHaveLength(1);
    await repository.failCleanupTask(ids.organizationA, taskId, claimed[0]!.token, false, now.toISOString(), { name: 'provider_error', secret: 'redacted' }, now.toISOString());
    const rows = await ownerClient<{ status: string; attempts: number; reconciliation_claim_token: string | null; sanitized_failure: Record<string, unknown> }[]>`SELECT status, attempts, reconciliation_claim_token::text, sanitized_failure FROM object_cleanup_tasks WHERE organization_id = ${ids.organizationA}::uuid AND id = ${taskId}::uuid`;
    expect(rows).toEqual([{ status: 'failed', attempts: 1, reconciliation_claim_token: null, sanitized_failure: { name: 'provider_error', secret: '[REDACTED]' } }]);
  });

  it('uses bounded privileged discovery without bypassing tenant-scoped loading', async () => {
    if (repository === null) return;
    const token = crypto.randomUUID(); const expires = new Date(Date.now() + 30_000).toISOString();
    const gaps = await repository.claimDispatchGaps(new Date(Date.now() + 60_000).toISOString(), 1, token, expires); expect(gaps.length).toBeLessThanOrEqual(1);
    const none = await repository.claimDispatchGaps(new Date(Date.now() + 60_000).toISOString(), 0, crypto.randomUUID(), expires); expect(none.length).toBeLessThanOrEqual(1);
    if (gaps[0] !== undefined) expect([ids.organizationA, ids.organizationB]).toContain(gaps[0].organizationId);
  });
});
