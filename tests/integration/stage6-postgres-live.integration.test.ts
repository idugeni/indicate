import { createHash } from 'node:crypto';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { ApiKeyService, type ApiKeyHasher, type CredentialGenerator } from '@/application/stage6/api-key-service';
import { CustomerService } from '@/application/stage6/customer-service';
import { STAGE6_PERMISSIONS } from '@/domain/stage6/permissions';
import { DrizzleStage6Repository } from '@/infrastructure/db/repositories/drizzle-stage6-repository';
import * as schema from '@/infrastructure/db/schema';
import { SequenceIdentifierGenerator } from '../helpers/stage3';

const databaseUrl = process.env.TEST_DATABASE_URL;
const runtimePassword = 'stage6-runtime-contract-password';
const ids = {
  organization: '00000000-0000-4000-8000-000000006101', user: '00000000-0000-4000-8000-000000006102', authUser: '00000000-0000-4000-8000-000000006103', role: '00000000-0000-4000-8000-000000006104', attackerUser: '00000000-0000-4000-8000-000000006114', attackerAuthUser: '00000000-0000-4000-8000-000000006115',
  apiManage: '00000000-0000-4000-8000-000000006105', apiRead: '00000000-0000-4000-8000-000000006106', subscriptionManage: '00000000-0000-4000-8000-000000006107', subscriptionRead: '00000000-0000-4000-8000-000000006108', telegramMapping: '00000000-0000-4000-8000-000000006109', customer: '00000000-0000-4000-8000-000000006110',
  secondOrganization: '00000000-0000-4000-8000-000000006111', secondRole: '00000000-0000-4000-8000-000000006112', secondTelegramMapping: '00000000-0000-4000-8000-000000006113',
};
function runtimeUrl(ownerUrl: string): string { const value = new URL(ownerUrl); value.username = 'indicate_runtime'; value.password = runtimePassword; return value.toString(); }
const suite = databaseUrl === undefined ? describe.skip : describe;
class QuickHasher implements ApiKeyHasher {
  async hash(secret: string, salt: string) { return createHash('sha256').update(`${salt}:${secret}`).digest('base64'); }
  async verify(secret: string, salt: string, expectedHash: string) { return (await this.hash(secret, salt)) === expectedHash; }
}
class Credential implements CredentialGenerator {
  create() { const lookupId = 'stage6lookup0001'; const secret = Buffer.from('stage6-postgres-contract-secret!!').toString('base64url').slice(0, 43).padEnd(43, 'x'); return { lookupId, salt: Buffer.from('stage6-postgres-salt').toString('base64'), verificationHash: '', plaintext: `ind_live_${lookupId}.${secret}` }; }
}

suite('live PostgreSQL 17 Stage 6 runtime-role contract', () => {
  const ownerClient = databaseUrl === undefined ? null : postgres(databaseUrl, { max: 4, prepare: false });
  const runtimeClient = databaseUrl === undefined ? null : postgres(runtimeUrl(databaseUrl), { max: 8, prepare: false });
  const repository = runtimeClient === null ? null : new DrizzleStage6Repository(drizzle(runtimeClient, { schema }));
  const actor = { actorType: 'user' as const, actorId: ids.user, verifiedAuthUserId: ids.authUser, organizationId: ids.organization, permissionSet: new Set([STAGE6_PERMISSIONS.apiKeyManage, STAGE6_PERMISSIONS.apiKeyRead, STAGE6_PERMISSIONS.subscriptionManage, STAGE6_PERMISSIONS.subscriptionRead, STAGE6_PERMISSIONS.customerAdmin]), entryPoint: 'cms' as const, requestId: 'stage6-postgres' };

  beforeAll(async () => {
    const owner = ownerClient!;
    const version = await owner<{ server_version_num: string }[]>`SHOW server_version_num`.then((rows) => Number(rows[0]?.server_version_num ?? 0)); expect(version).toBeGreaterThanOrEqual(170000);
    const migration = await owner<{ found: boolean }[]>`SELECT EXISTS(SELECT 1 FROM indicate_schema_migrations WHERE version = 11) AS found`; expect(migration[0]?.found).toBe(true);
    await owner.unsafe(`ALTER ROLE indicate_runtime PASSWORD '${runtimePassword}'`);
    await owner`INSERT INTO organizations (id, name, slug) VALUES (${ids.organization}::uuid, 'Stage6 Live', 'stage6-live')`;
    await owner`INSERT INTO users (id, auth_user_id, display_name) VALUES (${ids.user}::uuid, ${ids.authUser}::uuid, 'Stage6 User'), (${ids.attackerUser}::uuid, ${ids.attackerAuthUser}::uuid, 'Stage6 Attacker')`;
    await owner`INSERT INTO roles (organization_id, id, name) VALUES (${ids.organization}::uuid, ${ids.role}::uuid, 'Stage6 Administrator')`;
    await owner`INSERT INTO memberships (organization_id, user_id, role_id) VALUES (${ids.organization}::uuid, ${ids.user}::uuid, ${ids.role}::uuid)`;
    await owner`INSERT INTO permissions (id, organization_id, name, scope, description) VALUES
      (${ids.apiManage}::uuid, ${ids.organization}::uuid, 'api_key.manage', 'organization', 'Manage API keys'),
      (${ids.apiRead}::uuid, ${ids.organization}::uuid, 'api_key.read', 'organization', 'Read API keys'),
      (${ids.subscriptionManage}::uuid, ${ids.organization}::uuid, 'subscription.manage', 'organization', 'Manage subscription'),
      (${ids.subscriptionRead}::uuid, ${ids.organization}::uuid, 'subscription.read', 'organization', 'Read subscription')`;
    await owner`INSERT INTO role_permissions (organization_id, role_id, permission_id) VALUES
      (${ids.organization}::uuid, ${ids.role}::uuid, ${ids.apiManage}::uuid), (${ids.organization}::uuid, ${ids.role}::uuid, ${ids.apiRead}::uuid),
      (${ids.organization}::uuid, ${ids.role}::uuid, ${ids.subscriptionManage}::uuid), (${ids.organization}::uuid, ${ids.role}::uuid, ${ids.subscriptionRead}::uuid)`;
    await owner`SELECT indicate_private.stage6_provision_platform_permission(${ids.user}::uuid, 'platform.customer.admin', 'stage6-live-bootstrap')`;
    await owner`INSERT INTO telegram_identity_mappings (organization_id, id, telegram_user_id, telegram_chat_id, user_id, role_id) VALUES (${ids.organization}::uuid, ${ids.telegramMapping}::uuid, 'stage6-user', 'stage6-chat', ${ids.user}::uuid, ${ids.role}::uuid)`;
    await owner`INSERT INTO subscriptions (organization_id, plan, status) VALUES (${ids.organization}::uuid, 'starter', 'trialing')`;
  });

  afterAll(async () => { await runtimeClient?.end({ timeout: 5 }); await ownerClient?.end({ timeout: 5 }); });

  it('blocks tenant-to-platform escalation and exposes provisioning only to the protected owner path', async () => {
    await expect(ownerClient!`INSERT INTO role_permissions (organization_id, role_id, permission_id) VALUES (${ids.organization}::uuid, ${ids.role}::uuid, '00000000-0000-4000-8000-000000006001'::uuid)`).rejects.toMatchObject({ code: '42501' });
    await expect(runtimeClient!`SELECT indicate_private.stage6_provision_platform_permission(${ids.user}::uuid, 'platform.customer.admin', 'runtime-escalation')`).rejects.toBeTruthy();
    await expect(runtimeClient!.begin(async (transaction) => {
      await transaction`SELECT indicate_private.set_tenant_context(${ids.organization}::uuid, ${ids.user}, 'runtime-platform-escalation')`;
      await transaction`SELECT indicate_private.set_verified_user_context(${ids.authUser}::uuid)`;
      await transaction`INSERT INTO role_permissions (organization_id, role_id, permission_id) VALUES (${ids.organization}::uuid, ${ids.role}::uuid, '00000000-0000-4000-8000-000000006001'::uuid)`;
    })).rejects.toBeTruthy();
    await expect(runtimeClient!`SELECT * FROM indicate_private.stage6_list_customers(${ids.user}::uuid)`).rejects.toBeTruthy();
    await expect(runtimeClient!.begin(async (transaction) => {
      await transaction`SELECT indicate_private.set_tenant_context(${ids.organization}::uuid, ${ids.attackerUser}::uuid, 'runtime-platform-impersonation')`;
      await transaction`SELECT indicate_private.set_verified_user_context(${ids.attackerAuthUser}::uuid)`;
      await transaction`SELECT * FROM indicate_private.stage6_list_customers(${ids.user}::uuid)`;
    })).rejects.toMatchObject({ code: '42501' });
    await expect(runtimeClient!.begin(async (transaction) => {
      await transaction`SELECT indicate_private.set_tenant_context(${ids.organization}::uuid, ${ids.user}::uuid, 'runtime-platform-authorized')`;
      await transaction`SELECT indicate_private.set_verified_user_context(${ids.authUser}::uuid)`;
      return transaction<{ allowed: boolean }[]>`SELECT indicate_private.stage6_has_platform_permission(${ids.user}::uuid, 'platform.customer.admin') AS allowed`;
    })).resolves.toMatchObject([{ allowed: true }]);
  });

  it('resolves active Telegram mapping and atomically converges concurrent replay claims', async () => {
    await expect(repository!.resolveTelegramIdentity('stage6-user', 'stage6-chat')).resolves.toMatchObject({ organizationId: ids.organization, userId: ids.user, permissions: expect.any(Set) });
    const input = { source: 'stage6-live', replayId: 'concurrent-1', organizationId: ids.organization, bodyDigest: 'a'.repeat(64), receivedAt: '2026-08-30T00:00:00.000Z', leaseExpiresAt: '2026-08-30T00:00:30.000Z', expiresAt: '2026-08-30T00:15:00.000Z' };
    const claims = await Promise.all(Array.from({ length: 8 }, () => repository!.claimReplay(input)));
    expect(claims.filter(({ kind }) => kind === 'created')).toHaveLength(1);
    expect(claims.filter(({ kind }) => kind === 'duplicate')).toHaveLength(7);
    const createdClaim = claims.find(({ kind }) => kind === 'created')!.claim;
    await expect(repository!.completeReplay(input.source, input.replayId, input.bodyDigest, createdClaim.claimToken, { accepted: true }, input.receivedAt)).resolves.toMatchObject({ status: 'processed', outcome: { accepted: true } });
    await expect(repository!.claimReplay(input)).resolves.toMatchObject({ kind: 'duplicate', claim: { status: 'processed', outcome: { accepted: true } } });

    const recoverable = { ...input, replayId: 'prepared-outcome', bodyDigest: 'b'.repeat(64) };
    const recoverableClaim = await repository!.claimReplay(recoverable); expect(recoverableClaim).toMatchObject({ kind: 'created' });
    await expect(repository!.prepareReplayOutcome(recoverable.source, recoverable.replayId, recoverable.bodyDigest, recoverableClaim.claim.claimToken, 'processed', { committed: true }, recoverable.receivedAt)).resolves.toMatchObject({ status: 'claimed', pendingStatus: 'processed', outcome: { committed: true } });
    await expect(repository!.claimReplay(recoverable)).resolves.toMatchObject({ kind: 'duplicate', claim: { pendingStatus: 'processed', outcome: { committed: true } } });
    await expect(repository!.finalizeReplay(recoverable.source, recoverable.replayId, recoverable.bodyDigest, recoverableClaim.claim.claimToken, recoverable.receivedAt)).resolves.toMatchObject({ status: 'processed', pendingStatus: null, outcome: { committed: true } });

    const leased = { ...input, replayId: 'expired-lease', bodyDigest: 'c'.repeat(64), leaseExpiresAt: '2026-08-30T00:00:01.000Z' };
    const leasedFirst = await repository!.claimReplay(leased); expect(leasedFirst).toMatchObject({ kind: 'created' });
    const leasedReclaimed = await repository!.claimReplay({ ...leased, receivedAt: '2026-08-30T00:00:02.000Z', leaseExpiresAt: '2026-08-30T00:00:32.000Z' });
    expect(leasedReclaimed).toMatchObject({ kind: 'reclaimed', claim: { attemptCount: 2 } });
    expect(leasedReclaimed.claim.claimToken).not.toBe(leasedFirst.claim.claimToken);
    await expect(repository!.prepareReplayOutcome(leased.source, leased.replayId, leased.bodyDigest, leasedFirst.claim.claimToken, 'processed', { stale: true }, leased.receivedAt)).rejects.toBeTruthy();
    await expect(repository!.prepareReplayOutcome(leased.source, leased.replayId, leased.bodyDigest, leasedReclaimed.claim.claimToken, 'processed', { winner: true }, leased.receivedAt)).resolves.toMatchObject({ pendingStatus: 'processed', outcome: { winner: true } });
    await expect(ownerClient!`INSERT INTO audit_logs (organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at) VALUES (${ids.organization}::uuid, ${crypto.randomUUID()}::uuid, 'system', 'stale-worker', 'telegram', 'article.create', 'article', ${ids.customer}, 'succeeded', ARRAY['slug'], '{}'::jsonb, ${`telegram-replay:${leased.replayId}:${leased.bodyDigest}:${leasedFirst.claim.claimToken}`}, ${leased.receivedAt}::timestamptz)`).rejects.toMatchObject({ code: '42501' });

    const receiptInput = { ...input, source: 'telegram', replayId: 'business-receipt', bodyDigest: 'd'.repeat(64) };
    const receiptClaim = await repository!.claimReplay(receiptInput); expect(receiptClaim.kind).toBe('created');
    await ownerClient!`INSERT INTO audit_logs (organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at) VALUES (${ids.organization}::uuid, ${crypto.randomUUID()}::uuid, 'system', 'receipt-worker', 'telegram', 'article.sites.assign', 'article', ${ids.customer}, 'succeeded', ARRAY['siteIds'], ${JSON.stringify({ siteIds: [ids.customer] })}::jsonb, ${`telegram-replay:${receiptInput.replayId}:${receiptInput.bodyDigest}:${receiptClaim.claim.claimToken}`}, ${receiptInput.receivedAt}::timestamptz)`;
    await expect(repository!.claimReplay({ ...receiptInput, receivedAt: '2026-08-30T00:01:00.000Z', leaseExpiresAt: '2026-08-30T00:01:30.000Z' })).resolves.toMatchObject({ kind: 'duplicate', claim: { businessReceipt: { action: 'article.sites.assign', targetId: ids.customer } } });

    await ownerClient!`INSERT INTO organizations (id, name, slug) VALUES (${ids.secondOrganization}::uuid, 'Stage6 Ambiguous', 'stage6-ambiguous')`;
    await ownerClient!`INSERT INTO roles (organization_id, id, name) VALUES (${ids.secondOrganization}::uuid, ${ids.secondRole}::uuid, 'Stage6 Ambiguous Role')`;
    await ownerClient!`INSERT INTO memberships (organization_id, user_id, role_id) VALUES (${ids.secondOrganization}::uuid, ${ids.user}::uuid, ${ids.secondRole}::uuid)`;
    await ownerClient!`INSERT INTO telegram_identity_mappings (organization_id, id, telegram_user_id, telegram_chat_id, user_id, role_id) VALUES (${ids.secondOrganization}::uuid, ${ids.secondTelegramMapping}::uuid, 'stage6-user', 'stage6-chat', ${ids.user}::uuid, ${ids.secondRole}::uuid)`;
    await expect(repository!.resolveTelegramIdentity('stage6-user', 'stage6-chat')).resolves.toBeNull();
  });

  it('issues, authenticates, rotates, and revokes an Organization-scoped API key through the runtime role', async () => {
    const service = new ApiKeyService(repository!, new SequenceIdentifierGenerator(), new Credential(), { now: () => new Date('2026-08-30T00:00:00.000Z') }, new QuickHasher());
    const issued = await service.issue(actor, { name: 'Live contract', scopes: [STAGE6_PERMISSIONS.subscriptionRead], expiresAt: null });
    expect(issued.ok).toBe(true); if (!issued.ok) return;
    expect((await service.authenticate(issued.value.plaintext, STAGE6_PERMISSIONS.subscriptionRead)).ok).toBe(true);
    expect((await service.authenticate(issued.value.plaintext, STAGE6_PERMISSIONS.subscriptionManage)).ok).toBe(false);
    expect((await service.revoke(actor, { apiKeyId: issued.value.key.id, expectedVersion: 1 })).ok).toBe(true);
    expect((await service.authenticate(issued.value.plaintext, STAGE6_PERMISSIONS.subscriptionRead)).ok).toBe(false);
  });

  it('database-revalidates tenant subscription permission and platform customer administration', async () => {
    const customers = new CustomerService(repository!, { create: () => ids.customer }, { now: () => new Date('2026-08-30T00:00:00.000Z') });
    await expect(customers.updateSubscription(actor, { organizationId: ids.organization, expectedVersion: 1, plan: 'pro', status: 'active', periodStartsAt: null, periodEndsAt: null })).resolves.toMatchObject({ ok: true, value: { plan: 'pro', status: 'active', version: 2 } });
    const created = await customers.create(actor, { name: 'Stage6 Customer', slug: 'stage6-customer-live', customerMetadata: {}, subscription: { plan: 'starter', status: 'trialing', periodStartsAt: null, periodEndsAt: null } });
    expect(created).toMatchObject({ ok: true, value: { customer: { id: ids.customer }, subscription: { plan: 'starter' } } });
    const denied = { ...actor, permissionSet: new Set([STAGE6_PERMISSIONS.subscriptionRead]), requestId: 'stage6-denied' };
    await expect(customers.list(denied)).resolves.toMatchObject({ ok: false, error: { error: { code: 'RESOURCE_UNAVAILABLE' } } });
    await expect(ownerClient!<{ action: string; target_id: string | null }[]>`SELECT action, target_id FROM audit_logs WHERE request_id = 'stage6-denied'`).resolves.toContainEqual({ action: 'customer.list.denied', target_id: null });
  });
});
