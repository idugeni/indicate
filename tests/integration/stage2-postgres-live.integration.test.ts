import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AuthorizationService } from '@/application/auth/authorization-service';
import { TenantBusinessService } from '@/application/stage3/tenant-business-service';
import { reconcileMvpSeed, SeedExecutionError } from '@/application/seed/reconcile-mvp-seed';
import type { ActorContext } from '@/domain/context/operation-context';
import { DrizzleTenantTransactionManager } from '@/infrastructure/db/drizzle-tenant-transaction';
import { DrizzleAuthorizationRepository } from '@/infrastructure/db/repositories/drizzle-authorization-repository';
import { DrizzleStage3Repository } from '@/infrastructure/db/repositories/drizzle-stage3-repository';
import { DrizzleSeedRepository } from '@/infrastructure/db/repositories/drizzle-seed-repository';
import * as schema from '@/infrastructure/db/schema';
import { UuidGenerator } from '@/infrastructure/system/uuid-generator';

const databaseUrl = process.env.TEST_DATABASE_URL;
const projectRoot = resolve(import.meta.dirname, '../..');
const migrationFiles = ['drizzle/0000_stage2_core_schema.sql', 'drizzle/0001_stage2_security.sql', 'drizzle/0002_stage2_publisher_actor_constraints.sql', 'drizzle/0003_stage2_authorization_hardening.sql', 'drizzle/0004_stage3_verified_user_context.sql', 'drizzle/0005_stage3_discovery_outcome_timestamp.sql', 'drizzle/0006_stage4_media_publication_runtime.sql', 'drizzle/0007_stage5_public_delivery.sql', 'drizzle/0008_stage5_production_boundaries.sql'];
const runtimePassword = 'stage2-runtime-contract-password';

const ids = {
  organizationA: '00000000-0000-4000-8000-000000000001',
  organizationB: '00000000-0000-4000-8000-000000000002',
  organizationSeed: '00000000-0000-4000-8000-000000000003',
  organizationSeedFailure: '00000000-0000-4000-8000-000000000004',
  actorUser: '00000000-0000-4000-8000-000000000010',
  targetUser: '00000000-0000-4000-8000-000000000011',
  foreignUser: '00000000-0000-4000-8000-000000000012',
  authorizationTelegramUser: '00000000-0000-4000-8000-000000000013',
  actorAuth: '00000000-0000-4000-8000-000000000090',
  targetAuth: '00000000-0000-4000-8000-000000000091',
  foreignAuth: '00000000-0000-4000-8000-000000000092',
  authorizationTelegramAuth: '00000000-0000-4000-8000-000000000093',
  concurrentAuth: '00000000-0000-4000-8000-000000000099',
  editorRole: '00000000-0000-4000-8000-000000000020',
  managerRole: '00000000-0000-4000-8000-000000000021',
  foreignRole: '00000000-0000-4000-8000-000000000022',
  membershipPermission: '00000000-0000-4000-8000-000000000025',
  membershipReadPermission: '00000000-0000-4000-8000-000000000024',
  publisherReadPermission: '00000000-0000-4000-8000-000000000023',
  publisherVerifyPermission: '00000000-0000-4000-8000-000000000028',
  analyticsReadPermission: '00000000-0000-4000-8000-000000000029',
  apiKey: '00000000-0000-4000-8000-000000000026',
  telegramMapping: '00000000-0000-4000-8000-000000000027',
  authorizationTelegramMapping: '00000000-0000-4000-8000-000000000044',
  domainA: '00000000-0000-4000-8000-000000000030',
  domainB: '00000000-0000-4000-8000-000000000031',
  regionA: '00000000-0000-4000-8000-000000000032',
  articleA: '00000000-0000-4000-8000-000000000033',
  publishingJob: '00000000-0000-4000-8000-000000000034',
  siteARegional: '00000000-0000-4000-8000-000000000035',
  siteASecond: '00000000-0000-4000-8000-000000000036',
  regionASecond: '00000000-0000-4000-8000-000000000037',
  affiliation: '00000000-0000-4000-8000-000000000038',
  publisher: '00000000-0000-4000-8000-000000000039',
  articleSiteHistorical: '00000000-0000-4000-8000-000000000041',
  articleSiteCurrent: '00000000-0000-4000-8000-000000000042',
  jobTarget: '00000000-0000-4000-8000-000000000043',
};

function runtimeUrl(ownerUrl: string): string {
  const url = new URL(ownerUrl);
  url.username = 'indicate_runtime';
  url.password = runtimePassword;
  return url.toString();
}

function timestampIso(value: Date | string): string {
  return (value instanceof Date ? value : new Date(value)).toISOString();
}

function actor(permissionSet: ReadonlySet<string> = new Set()): ActorContext {
  return {
    actorType: 'user',
    actorId: ids.actorUser,
    verifiedAuthUserId: ids.actorAuth,
    organizationId: ids.organizationA,
    permissionSet,
    entryPoint: 'cms',
    requestId: crypto.randomUUID(),
  };
}

const suite = databaseUrl === undefined ? describe.skip : describe;
suite('live PostgreSQL Stage 2 contract', () => {
  const ownerClient = databaseUrl === undefined ? null : postgres(databaseUrl, { max: 10, prepare: false });
  const runtimeClient = databaseUrl === undefined ? null : postgres(runtimeUrl(databaseUrl), { max: 10, prepare: false });
  const ownerDatabase = ownerClient === null ? null : drizzle(ownerClient, { schema });
  const runtimeDatabase = runtimeClient === null ? null : drizzle(runtimeClient, { schema });
  const authorizationRepository = runtimeDatabase === null ? null : new DrizzleAuthorizationRepository(runtimeDatabase);
  const transactionManager = runtimeDatabase === null ? null : new DrizzleTenantTransactionManager(runtimeDatabase);
  const authorizationService = authorizationRepository === null ? null : new AuthorizationService(authorizationRepository);

  async function setTargetMembershipFixture(roleId: string, mappingActive: boolean): Promise<void> {
    if (ownerClient === null) return;
    await ownerClient.begin(async (transaction) => {
      await transaction`UPDATE telegram_identity_mappings
        SET status = 'inactive', updated_at = now()
        WHERE organization_id = ${ids.organizationA}::uuid AND user_id = ${ids.targetUser}::uuid`;
      await transaction`UPDATE memberships
        SET role_id = ${roleId}::uuid, status = 'active', version = version + 1, updated_at = now()
        WHERE organization_id = ${ids.organizationA}::uuid AND user_id = ${ids.targetUser}::uuid`;
      await transaction`UPDATE telegram_identity_mappings
        SET role_id = ${ids.editorRole}::uuid, status = ${mappingActive ? 'active' : 'inactive'}, updated_at = now()
        WHERE organization_id = ${ids.organizationA}::uuid AND id = ${ids.telegramMapping}::uuid`;
    });
  }

  beforeAll(async () => {
    if (ownerClient === null) return;
    for (const file of migrationFiles) {
      const migrationSql = readFileSync(resolve(projectRoot, file), 'utf8');
      for (const statement of migrationSql.split('--> statement-breakpoint').map((value) => value.trim()).filter(Boolean)) {
        await ownerClient.unsafe(statement);
      }
    }
    await ownerClient.unsafe(`ALTER ROLE indicate_runtime PASSWORD '${runtimePassword}'`);
    await ownerClient`INSERT INTO organizations (id, name, slug) VALUES
      (${ids.organizationA}::uuid, 'A', 'a'),
      (${ids.organizationB}::uuid, 'B', 'b'),
      (${ids.organizationSeed}::uuid, 'Seed', 'seed'),
      (${ids.organizationSeedFailure}::uuid, 'Seed Failure', 'seed-failure')`;
    await ownerClient`INSERT INTO users (id, auth_user_id, display_name) VALUES
      (${ids.actorUser}::uuid, ${ids.actorAuth}::uuid, 'Editor'),
      (${ids.targetUser}::uuid, ${ids.targetAuth}::uuid, 'Target'),
      (${ids.foreignUser}::uuid, ${ids.foreignAuth}::uuid, 'Foreign Editor'),
      (${ids.authorizationTelegramUser}::uuid, ${ids.authorizationTelegramAuth}::uuid, 'Authorization Telegram User')`;
    await ownerClient`INSERT INTO roles (organization_id, id, name) VALUES
      (${ids.organizationA}::uuid, ${ids.editorRole}::uuid, 'Editor'),
      (${ids.organizationA}::uuid, ${ids.managerRole}::uuid, 'Manager'),
      (${ids.organizationB}::uuid, ${ids.foreignRole}::uuid, 'Foreign Role')`;
    await ownerClient`INSERT INTO permissions (id, organization_id, name, scope, description) VALUES
      (${ids.membershipPermission}::uuid, NULL, 'membership.manage', 'platform', 'Manage memberships')`;
    await ownerClient`INSERT INTO role_permissions (organization_id, role_id, permission_id) VALUES
      (${ids.organizationA}::uuid, ${ids.editorRole}::uuid, ${ids.membershipPermission}::uuid)`;
    await ownerClient`INSERT INTO memberships (organization_id, user_id, role_id) VALUES
      (${ids.organizationA}::uuid, ${ids.actorUser}::uuid, ${ids.editorRole}::uuid),
      (${ids.organizationA}::uuid, ${ids.targetUser}::uuid, ${ids.editorRole}::uuid),
      (${ids.organizationA}::uuid, ${ids.authorizationTelegramUser}::uuid, ${ids.editorRole}::uuid),
      (${ids.organizationB}::uuid, ${ids.foreignUser}::uuid, ${ids.foreignRole}::uuid)`;
    await ownerClient`INSERT INTO domains (organization_id, id, normalized_hostname) VALUES
      (${ids.organizationA}::uuid, ${ids.domainA}::uuid, 'a.example.web.id'),
      (${ids.organizationB}::uuid, ${ids.domainB}::uuid, 'b.example.web.id')`;
    await ownerClient`INSERT INTO api_keys (
      organization_id, id, lookup_id, salt, verification_hash, scopes
    ) VALUES (
      ${ids.organizationA}::uuid, ${ids.apiKey}::uuid, 'live-key', 'salt', 'hash', ARRAY['membership.manage']::text[]
    )`;
    await ownerClient`INSERT INTO telegram_identity_mappings (
      organization_id, id, telegram_user_id, telegram_chat_id, user_id, role_id
    ) VALUES
      (
        ${ids.organizationA}::uuid, ${ids.telegramMapping}::uuid, 'telegram-user', 'telegram-chat',
        ${ids.targetUser}::uuid, ${ids.editorRole}::uuid
      ),
      (
        ${ids.organizationA}::uuid, ${ids.authorizationTelegramMapping}::uuid, 'authorization-user', 'authorization-chat',
        ${ids.authorizationTelegramUser}::uuid, ${ids.editorRole}::uuid
      )`;
    await ownerClient`INSERT INTO regions (organization_id, id, external_key, name, slug)
      VALUES (${ids.organizationA}::uuid, ${ids.regionA}::uuid, 'live-region', 'Live Region', 'live-region')`;
    await ownerClient`INSERT INTO articles (
      organization_id, id, region_id, slug, title, body, source
    ) VALUES (
      ${ids.organizationA}::uuid, ${ids.articleA}::uuid, ${ids.regionA}::uuid,
      'live-article', 'Live Article', 'Body', 'Contract'
    )`;
    await ownerClient`INSERT INTO publishing_jobs (
      organization_id, id, article_id, idempotency_key, fingerprint, dispatch_status, lease_owner, lease_expires_at
    ) VALUES (
      ${ids.organizationA}::uuid, ${ids.publishingJob}::uuid, ${ids.articleA}::uuid,
      'live-job', 'fingerprint', 'leased', 'worker-1', now() + interval '5 minutes'
    )`;
  }, 30_000);

  afterAll(async () => {
    await Promise.all([
      runtimeClient?.end({ timeout: 5 }),
      ownerClient?.end({ timeout: 5 }),
    ]);
  });

  it('enforces runtime RLS, append-only audit, and read-only platform Permissions', async () => {
    if (runtimeClient === null) return;
    await runtimeClient.begin(async (transaction) => {
      await transaction`SELECT indicate_private.set_tenant_context(${ids.organizationA}::uuid, ${ids.actorUser}, ${'live-test'})`;
      const visible = await transaction<{ normalized_hostname: string }[]>`SELECT normalized_hostname FROM domains ORDER BY normalized_hostname`;
      expect(visible.map((row) => row.normalized_hostname)).toEqual(['a.example.web.id']);
      const platformPermissions = await transaction<{ name: string }[]>`SELECT name FROM permissions WHERE scope = 'platform'`;
      expect(platformPermissions.map(({ name }) => name)).toContain('membership.manage');
      await transaction`INSERT INTO audit_logs (
        organization_id, id, actor_type, actor_id, entry_point, action, target_type, outcome, request_id
      ) VALUES (
        ${ids.organizationA}::uuid, ${'00000000-0000-4000-8000-000000000040'}::uuid,
        'user', ${ids.actorUser}, 'cms', 'live.test', 'domain', 'succeeded', 'live-test'
      )`;
    });
    await expect(runtimeClient.begin(async (transaction) => {
      await transaction`SELECT indicate_private.set_tenant_context(${ids.organizationA}::uuid, ${ids.actorUser}, ${'live-test'})`;
      await transaction`DELETE FROM audit_logs WHERE organization_id = ${ids.organizationA}::uuid`;
    })).rejects.toThrow();
    await expect(runtimeClient.begin(async (transaction) => {
      await transaction`SELECT indicate_private.set_tenant_context(${ids.organizationA}::uuid, ${ids.actorUser}, ${'live-test'})`;
      await transaction`INSERT INTO permissions (id, name, scope, description)
        VALUES (${crypto.randomUUID()}::uuid, 'runtime.escalation', 'platform', 'must fail')`;
    })).rejects.toThrow();
  }, 30_000);

  it('discovers only the verified Auth user organizations through the runtime-role adapter', async () => {
    if (authorizationRepository === null || runtimeClient === null) return;
    await expect(authorizationRepository.listActiveOrganizationsForUser(ids.actorAuth)).resolves.toEqual([
      { id: ids.organizationA, name: 'A' },
    ]);
    const withoutVerifiedContext = await runtimeClient<{ id: string; name: string }[]>`
      SELECT id, name FROM indicate_private.list_active_organizations_for_verified_user()
    `;
    expect(withoutVerifiedContext).toEqual([]);
  });

  it('lists and updates Memberships and attributes denied Users through verified runtime Auth context', async () => {
    if (runtimeDatabase === null || ownerClient === null) return;
    await ownerClient`INSERT INTO permissions (id, organization_id, name, scope, description) VALUES
      (${ids.membershipReadPermission}::uuid, ${ids.organizationA}::uuid, 'membership.read', 'organization', 'Read memberships')`;
    await ownerClient`INSERT INTO role_permissions (organization_id, role_id, permission_id) VALUES
      (${ids.organizationA}::uuid, ${ids.editorRole}::uuid, ${ids.membershipReadPermission}::uuid)`;
    const service = new TenantBusinessService(new DrizzleStage3Repository(runtimeDatabase), new UuidGenerator());
    const runtimeActor = actor(new Set(['membership.read', 'membership.manage'])) as ReturnType<typeof actor> & { organizationId: string };
    const listed = await service.listConfiguration(runtimeActor);
    expect(listed.ok).toBe(true); if (!listed.ok) return;
    expect(listed.value.memberships
      .map(({ userId, displayName }) => ({ userId, displayName }))
      .sort((left, right) => left.userId.localeCompare(right.userId))).toEqual([
      { userId: ids.actorUser, displayName: 'Editor' },
      { userId: ids.targetUser, displayName: 'Target' },
      { userId: ids.authorizationTelegramUser, displayName: 'Authorization Telegram User' },
    ].sort((left, right) => left.userId.localeCompare(right.userId)));
    const target = listed.value.memberships.find(({ userId }) => userId === ids.targetUser)!;
    const changed = await service.saveMembership(runtimeActor, { userId: target.userId, roleId: ids.managerRole, status: 'active', expectedVersion: target.version });
    expect(changed).toMatchObject({ ok: true, value: { displayName: 'Target', roleId: ids.managerRole } });
    if (!changed.ok) return;
    const invalidatedMappings = await ownerClient<{ status: string }[]>`SELECT status FROM telegram_identity_mappings
      WHERE organization_id = ${ids.organizationA}::uuid AND user_id = ${ids.targetUser}::uuid`;
    expect(invalidatedMappings).toEqual([{ status: 'inactive' }]);
    const restored = await service.saveMembership(runtimeActor, { userId: target.userId, roleId: ids.editorRole, status: 'active', expectedVersion: changed.value.version });
    expect(restored).toMatchObject({ ok: true, value: { displayName: 'Target', roleId: ids.editorRole } });

    const denied = await service.dashboard(runtimeActor);
    expect(denied).toMatchObject({ ok: false, error: { error: { code: 'RESOURCE_UNAVAILABLE' } } });
    const deniedAudits = await ownerClient<{ actor_id: string; action: string; outcome: string }[]>`SELECT actor_id, action, outcome FROM audit_logs
      WHERE organization_id = ${ids.organizationA}::uuid AND request_id = ${runtimeActor.requestId} AND outcome = 'denied'`;
    expect(deniedAudits).toContainEqual({ actor_id: ids.actorUser, action: 'dashboard.read', outcome: 'denied' });
  }, 30_000);

  it('resolves persisted API-key, Telegram, and claimed-job actors while denying revoked state', async () => {
    if (authorizationService === null || ownerClient === null) return;
    const apiActor: ActorContext = {
      actorType: 'api_key', actorId: ids.apiKey, organizationId: ids.organizationA,
      permissionSet: new Set(['ignored-client-claim']), entryPoint: 'api', requestId: 'live-api',
    };
    const telegramActor: ActorContext = {
      actorType: 'telegram', actorId: ids.authorizationTelegramMapping, organizationId: ids.organizationA,
      permissionSet: new Set(), entryPoint: 'telegram', requestId: 'live-telegram',
    };
    const systemActor: ActorContext = {
      actorType: 'system', actorId: ids.publishingJob, organizationId: ids.organizationA,
      permissionSet: new Set(), entryPoint: 'worker', requestId: 'live-worker',
    };
    await expect(authorizationService.authorize(apiActor, ids.organizationA, 'membership.manage'))
      .resolves.toMatchObject({ ok: true });
    await expect(authorizationService.authorize(telegramActor, ids.organizationA, 'membership.manage'))
      .resolves.toMatchObject({ ok: true });
    await expect(authorizationService.authorize(systemActor, ids.organizationA, 'publishing.process'))
      .resolves.toMatchObject({ ok: true });
    await expect(authorizationService.authorize(apiActor, ids.organizationB, 'membership.manage'))
      .resolves.toMatchObject({ ok: false });

    await ownerClient`UPDATE api_keys SET status = 'revoked'
      WHERE organization_id = ${ids.organizationA}::uuid AND id = ${ids.apiKey}::uuid`;
    await expect(authorizationService.authorize(apiActor, ids.organizationA, 'membership.manage'))
      .resolves.toMatchObject({ ok: false });
  });

  it('uses production adapters for same-organization role mutation and atomic audit', async () => {
    if (authorizationService === null || transactionManager === null || ownerClient === null) return;
    const concurrentMappingId = crypto.randomUUID();
    const roleChangeActor = { ...actor(), requestId: 'live-membership-role-change' };
    let roleChange: ReturnType<typeof authorizationService.changeMembershipRole> | undefined;
    let roleChangeCompleted = false;
    let observedLockWait = false;
    let completedWhileLocked = true;
    try {
      await setTargetMembershipFixture(ids.editorRole, true);
      await ownerClient.begin(async (transaction) => {
        await transaction`INSERT INTO telegram_identity_mappings (
          organization_id, id, telegram_user_id, telegram_chat_id, user_id, role_id
        ) VALUES (
          ${ids.organizationA}::uuid, ${concurrentMappingId}::uuid, 'concurrent-user', 'concurrent-chat',
          ${ids.targetUser}::uuid, ${ids.editorRole}::uuid
        )`;
        roleChange = authorizationService.changeMembershipRole({
          actor: roleChangeActor,
          organizationId: ids.organizationA,
          userId: ids.targetUser,
          roleId: ids.managerRole,
          transactionManager,
        });
        void roleChange.then(
          () => { roleChangeCompleted = true; },
          () => { roleChangeCompleted = true; },
        );
        for (let attempt = 0; attempt < 100 && !observedLockWait && !roleChangeCompleted; attempt += 1) {
          const waiting = await ownerClient<{ count: number }[]>`SELECT count(*)::integer AS count
            FROM pg_stat_activity
            WHERE usename = 'indicate_runtime' AND wait_event_type = 'Lock'`;
          observedLockWait = (waiting[0]?.count ?? 0) > 0;
          if (!observedLockWait) await new Promise((resolveDelay) => setTimeout(resolveDelay, 20));
        }
        completedWhileLocked = roleChangeCompleted;
      });
      expect(observedLockWait).toBe(true);
      expect(completedWhileLocked).toBe(false);
      expect(roleChange).toBeDefined();
      await expect(roleChange!).resolves.toEqual({ ok: true, value: true });
      const membership = await ownerClient<{ role_id: string }[]>`SELECT role_id FROM memberships
        WHERE organization_id = ${ids.organizationA}::uuid AND user_id = ${ids.targetUser}::uuid`;
      expect(membership[0]?.role_id).toBe(ids.managerRole);
      const audits = await ownerClient<{ action: string; outcome: string; target_id: string | null }[]>`SELECT action, outcome, target_id FROM audit_logs
        WHERE organization_id = ${ids.organizationA}::uuid
          AND request_id = ${roleChangeActor.requestId}
          AND action = 'membership.role.change'
          AND target_id = ${ids.targetUser}`;
      expect(audits).toEqual([{ action: 'membership.role.change', outcome: 'succeeded', target_id: ids.targetUser }]);
      const mappings = await ownerClient<{ status: string }[]>`SELECT status FROM telegram_identity_mappings
        WHERE organization_id = ${ids.organizationA}::uuid AND id = ${ids.telegramMapping}::uuid`;
      expect(mappings[0]?.status).toBe('inactive');
      const inconsistentMappings = await ownerClient<{ count: number }[]>`SELECT count(*)::integer AS count
        FROM telegram_identity_mappings mapping
        INNER JOIN memberships membership
          ON membership.organization_id = mapping.organization_id AND membership.user_id = mapping.user_id
        WHERE mapping.organization_id = ${ids.organizationA}::uuid
          AND mapping.user_id = ${ids.targetUser}::uuid
          AND mapping.status = 'active'
          AND (membership.status <> 'active' OR membership.role_id <> mapping.role_id)`;
      expect(inconsistentMappings[0]?.count).toBe(0);
      await expect(ownerClient`UPDATE telegram_identity_mappings SET status = 'active'
        WHERE organization_id = ${ids.organizationA}::uuid AND id = ${ids.telegramMapping}::uuid`).rejects.toThrow();
    } finally {
      if (roleChange !== undefined) await roleChange.catch(() => undefined);
      await setTargetMembershipFixture(ids.editorRole, true);
      await ownerClient`DELETE FROM telegram_identity_mappings
        WHERE organization_id = ${ids.organizationA}::uuid AND id = ${concurrentMappingId}::uuid`;
    }
  });

  it('rolls back the production mutation when audit INSERT is unavailable', async () => {
    if (authorizationService === null || transactionManager === null || ownerClient === null) return;
    await setTargetMembershipFixture(ids.managerRole, false);
    try {
      await ownerClient.unsafe('REVOKE INSERT ON audit_logs FROM indicate_runtime');
      try {
        await expect(authorizationService.changeMembershipRole({
          actor: actor(),
          organizationId: ids.organizationA,
          userId: ids.targetUser,
          roleId: ids.editorRole,
          transactionManager,
        })).rejects.toThrow();
      } finally {
        await ownerClient.unsafe('GRANT INSERT ON audit_logs TO indicate_runtime');
      }
      const membership = await ownerClient<{ role_id: string }[]>`SELECT role_id FROM memberships
        WHERE organization_id = ${ids.organizationA}::uuid AND user_id = ${ids.targetUser}::uuid`;
      expect(membership[0]?.role_id).toBe(ids.managerRole);
    } finally {
      await setTargetMembershipFixture(ids.editorRole, true);
    }
  });

  it('returns same-shape denials and writes target-free denial audits for absent and cross-organization targets', async () => {
    if (authorizationService === null || transactionManager === null || ownerClient === null) return;
    const absentActor = { ...actor(), requestId: 'live-denial-absent-membership' };
    const crossOrganizationActor = { ...actor(), requestId: 'live-denial-cross-role' };
    const absent = await authorizationService.changeMembershipRole({
      actor: absentActor, organizationId: ids.organizationA,
      userId: '00000000-0000-4000-8000-000000000019', roleId: ids.editorRole,
      transactionManager,
    });
    const crossOrganization = await authorizationService.changeMembershipRole({
      actor: crossOrganizationActor, organizationId: ids.organizationA,
      userId: ids.targetUser, roleId: ids.foreignRole,
      transactionManager,
    });
    expect(absent).toMatchObject({ ok: false, error: { error: { code: 'RESOURCE_UNAVAILABLE' } } });
    expect(crossOrganization).toMatchObject({ ok: false, error: { error: { code: 'RESOURCE_UNAVAILABLE' } } });
    if (absent.ok || crossOrganization.ok) return;
    expect(absent.error.error).toEqual(crossOrganization.error.error);
    const denialAudits = await ownerClient<{ request_id: string; target_id: string | null; action: string; outcome: string }[]>`SELECT request_id, target_id, action, outcome
      FROM audit_logs
      WHERE organization_id = ${ids.organizationA}::uuid
        AND action = 'membership.role.change'
        AND (request_id = ${absentActor.requestId} OR request_id = ${crossOrganizationActor.requestId})
      ORDER BY request_id`;
    expect(denialAudits).toEqual([
      { request_id: absentActor.requestId, target_id: null, action: 'membership.role.change', outcome: 'denied' },
      { request_id: crossOrganizationActor.requestId, target_id: null, action: 'membership.role.change', outcome: 'denied' },
    ]);
  });

  it('revalidates Membership permission after a concurrent revocation', async () => {
    if (authorizationService === null || transactionManager === null || ownerClient === null) return;
    let pendingChange: ReturnType<typeof authorizationService.changeMembershipRole> | undefined;
    await setTargetMembershipFixture(ids.managerRole, false);
    await ownerClient`UPDATE memberships SET status = 'active'
      WHERE organization_id = ${ids.organizationA}::uuid AND user_id = ${ids.actorUser}::uuid`;
    try {
      await ownerClient.begin(async (transaction) => {
        await transaction`SELECT user_id FROM memberships
          WHERE organization_id = ${ids.organizationA}::uuid AND user_id = ${ids.actorUser}::uuid FOR UPDATE`;
        pendingChange = authorizationService.changeMembershipRole({
          actor: actor(), organizationId: ids.organizationA,
          userId: ids.targetUser, roleId: ids.editorRole,
          transactionManager,
        });
        void pendingChange.catch(() => undefined);
        await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
        await transaction`UPDATE memberships SET status = 'inactive'
          WHERE organization_id = ${ids.organizationA}::uuid AND user_id = ${ids.actorUser}::uuid`;
      });
      expect(pendingChange).toBeDefined();
      await expect(pendingChange!).resolves.toMatchObject({ ok: false });
      const target = await ownerClient<{ role_id: string }[]>`SELECT role_id FROM memberships
        WHERE organization_id = ${ids.organizationA}::uuid AND user_id = ${ids.targetUser}::uuid`;
      expect(target[0]?.role_id).toBe(ids.managerRole);
    } finally {
      if (pendingChange !== undefined) await pendingChange.catch(() => undefined);
      await ownerClient`UPDATE memberships SET status = 'active'
        WHERE organization_id = ${ids.organizationA}::uuid AND user_id = ${ids.actorUser}::uuid`;
      await setTargetMembershipFixture(ids.editorRole, true);
    }
  }, 30_000);

  it.each(['role', 'grant'] as const)('revalidates after concurrent %s revocation', async (revocation) => {
    if (authorizationService === null || transactionManager === null || ownerClient === null) return;
    await ownerClient`UPDATE roles SET active = true
      WHERE organization_id = ${ids.organizationA}::uuid AND id = ${ids.editorRole}::uuid`;
    await ownerClient`INSERT INTO role_permissions (organization_id, role_id, permission_id)
      VALUES (${ids.organizationA}::uuid, ${ids.editorRole}::uuid, ${ids.membershipPermission}::uuid)
      ON CONFLICT DO NOTHING`;
    await setTargetMembershipFixture(ids.managerRole, false);
    const revocationActor = { ...actor(), requestId: `live-${revocation}-revocation` };
    let pendingChange: ReturnType<typeof authorizationService.changeMembershipRole> | undefined;
    try {
      await ownerClient.begin(async (transaction) => {
        if (revocation === 'role') {
          await transaction`SELECT id FROM roles
            WHERE organization_id = ${ids.organizationA}::uuid AND id = ${ids.editorRole}::uuid FOR UPDATE`;
        } else {
          await transaction`SELECT permission_id FROM role_permissions
            WHERE organization_id = ${ids.organizationA}::uuid
              AND role_id = ${ids.editorRole}::uuid
              AND permission_id = ${ids.membershipPermission}::uuid FOR UPDATE`;
        }
        pendingChange = authorizationService.changeMembershipRole({
          actor: revocationActor, organizationId: ids.organizationA,
          userId: ids.targetUser, roleId: ids.editorRole,
          transactionManager,
        });
        void pendingChange.catch(() => undefined);
        await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
        if (revocation === 'role') {
          await transaction`UPDATE roles SET active = false
            WHERE organization_id = ${ids.organizationA}::uuid AND id = ${ids.editorRole}::uuid`;
        } else {
          await transaction`DELETE FROM role_permissions
            WHERE organization_id = ${ids.organizationA}::uuid
              AND role_id = ${ids.editorRole}::uuid
              AND permission_id = ${ids.membershipPermission}::uuid`;
        }
      });
      expect(pendingChange).toBeDefined();
      await expect(pendingChange!).resolves.toMatchObject({ ok: false });
      const target = await ownerClient<{ role_id: string }[]>`SELECT role_id FROM memberships
        WHERE organization_id = ${ids.organizationA}::uuid AND user_id = ${ids.targetUser}::uuid`;
      expect(target[0]?.role_id).toBe(ids.managerRole);
      const denialAudits = await ownerClient<{ action: string; outcome: string; target_id: string | null }[]>`SELECT action, outcome, target_id
        FROM audit_logs
        WHERE organization_id = ${ids.organizationA}::uuid AND request_id = ${revocationActor.requestId}`;
      expect(denialAudits).toEqual([{ action: 'membership.role.change', outcome: 'denied', target_id: null }]);
    } finally {
      if (pendingChange !== undefined) await pendingChange.catch(() => undefined);
      await ownerClient`UPDATE roles SET active = true
        WHERE organization_id = ${ids.organizationA}::uuid AND id = ${ids.editorRole}::uuid`;
      await ownerClient`INSERT INTO role_permissions (organization_id, role_id, permission_id)
        VALUES (${ids.organizationA}::uuid, ${ids.editorRole}::uuid, ${ids.membershipPermission}::uuid)
        ON CONFLICT DO NOTHING`;
      await setTargetMembershipFixture(ids.editorRole, true);
    }
  }, 30_000);

  it('converges concurrent identity linkage and preserves one unique tenant relation', async () => {
    if (authorizationRepository === null || ownerClient === null) return;
    const linked = await Promise.all(Array.from({ length: 12 }, () => authorizationRepository.linkLocalUser({
      id: crypto.randomUUID(),
      authUserId: ids.concurrentAuth,
      displayName: 'Concurrent User',
    })));
    expect(new Set(linked.map(({ id }) => id)).size).toBe(1);

    const siteHostname = 'a.example.web.id';
    const siteWrites = await Promise.allSettled(Array.from({ length: 2 }, () => ownerClient`INSERT INTO sites (
      organization_id, id, domain_id, normalized_hostname
    ) VALUES (${ids.organizationA}::uuid, ${crypto.randomUUID()}::uuid, ${ids.domainA}::uuid, ${siteHostname})`));
    expect(siteWrites.filter(({ status }) => status === 'fulfilled')).toHaveLength(1);
    expect(siteWrites.filter(({ status }) => status === 'rejected')).toHaveLength(1);
    const sites = await ownerClient<{ count: number }[]>`SELECT count(*)::integer AS count FROM sites WHERE normalized_hostname = ${siteHostname}`;
    expect(sites[0]?.count).toBe(1);
  }, 30_000);

  it('rejects cross-organization composite and Publisher actor relations', async () => {
    if (ownerClient === null) return;
    await expect(ownerClient`INSERT INTO sites (
      organization_id, id, domain_id, normalized_hostname
    ) VALUES (
      ${ids.organizationA}::uuid, ${crypto.randomUUID()}::uuid,
      ${ids.domainB}::uuid, 'invalid.example.web.id'
    )`).rejects.toThrow();
    await expect(ownerClient`INSERT INTO publishers (
      organization_id, id, name, type, attribution_label, submitted_by
    ) VALUES (
      ${ids.organizationA}::uuid, ${crypto.randomUUID()}::uuid, 'Invalid Publisher',
      'organization', 'Invalid', ${ids.foreignUser}::uuid
    )`).rejects.toThrow();
  });

  it('round-trips immutable affiliation ownership and historical target analytics through the production adapter', async () => {
    if (runtimeDatabase === null || ownerClient === null) return;
    await ownerClient`INSERT INTO permissions (id, organization_id, name, scope, description) VALUES
      (${ids.publisherReadPermission}::uuid, ${ids.organizationA}::uuid, 'publisher.read', 'organization', 'Read publishers'),
      (${ids.publisherVerifyPermission}::uuid, ${ids.organizationA}::uuid, 'publisher.verify', 'organization', 'Verify publishers'),
      (${ids.analyticsReadPermission}::uuid, ${ids.organizationA}::uuid, 'analytics.read', 'organization', 'Read analytics')`;
    await ownerClient`INSERT INTO role_permissions (organization_id, role_id, permission_id) VALUES
      (${ids.organizationA}::uuid, ${ids.editorRole}::uuid, ${ids.publisherReadPermission}::uuid),
      (${ids.organizationA}::uuid, ${ids.editorRole}::uuid, ${ids.publisherVerifyPermission}::uuid),
      (${ids.organizationA}::uuid, ${ids.editorRole}::uuid, ${ids.analyticsReadPermission}::uuid)`;
    await ownerClient`INSERT INTO regions (organization_id, id, external_key, name, slug) VALUES
      (${ids.organizationA}::uuid, ${ids.regionASecond}::uuid, 'live-second', 'Live Second', 'live-second')`;
    await ownerClient`INSERT INTO sites (organization_id, id, domain_id, region_id, normalized_hostname, status, activation_state) VALUES
      (${ids.organizationA}::uuid, ${ids.siteARegional}::uuid, ${ids.domainA}::uuid, ${ids.regionA}::uuid, 'live-region.a.example.web.id', 'active', 'active'),
      (${ids.organizationA}::uuid, ${ids.siteASecond}::uuid, ${ids.domainA}::uuid, ${ids.regionASecond}::uuid, 'live-second.a.example.web.id', 'active', 'active')`;
    await ownerClient`INSERT INTO publishers (
      organization_id, id, name, type, attribution_label, evidence_reference, verification_status,
      submitted_by, submitted_at, verified_by, verified_at
    ) VALUES (
      ${ids.organizationA}::uuid, ${ids.publisher}::uuid, 'Live Publisher', 'organization', 'Live Publisher',
      'proof/live', 'verified', ${ids.actorUser}::uuid, now(), ${ids.actorUser}::uuid, now()
    )`;
    await ownerClient`UPDATE articles SET publisher_id = ${ids.publisher}::uuid
      WHERE organization_id = ${ids.organizationA}::uuid AND id = ${ids.articleA}::uuid`;
    await ownerClient`INSERT INTO official_affiliations (
      organization_id, id, publisher_id, site_id, institution_name, claim_scopes, evidence_reference, active, verified_at
    ) VALUES (
      ${ids.organizationA}::uuid, ${ids.affiliation}::uuid, ${ids.publisher}::uuid, ${ids.siteARegional}::uuid,
      'Original Institution', ARRAY['site_name']::text[], 'proof/original', true, now()
    )`;
    await ownerClient`INSERT INTO article_sites (
      organization_id, id, article_id, site_id, state, state_occurred_at, published_url, published_at, active, created_at, updated_at
    ) VALUES
      (${ids.organizationA}::uuid, ${ids.articleSiteHistorical}::uuid, ${ids.articleA}::uuid, ${ids.siteARegional}::uuid, 'published', '2026-09-10T00:00:00.000Z', 'https://live-region.a.example.web.id/live-article', '2026-09-10T00:00:00.000Z', false, '2026-07-01T00:00:00.000Z', '2026-09-10T00:00:00.000Z'),
      (${ids.organizationA}::uuid, ${ids.articleSiteCurrent}::uuid, ${ids.articleA}::uuid, ${ids.siteASecond}::uuid, 'queued', '2026-10-01T00:00:00.000Z', NULL, NULL, true, '2026-10-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z')`;
    await ownerClient`UPDATE publishing_jobs SET state = 'processing', updated_at = '2026-09-11T00:00:00.000Z'
      WHERE organization_id = ${ids.organizationA}::uuid AND id = ${ids.publishingJob}::uuid`;
    await ownerClient`UPDATE publishing_jobs SET state = 'published', finalized_at = '2026-09-12T00:00:00.000Z', updated_at = '2026-09-12T00:00:00.000Z'
      WHERE organization_id = ${ids.organizationA}::uuid AND id = ${ids.publishingJob}::uuid`;
    await ownerClient`INSERT INTO publishing_job_targets (
      organization_id, id, job_id, article_site_id, state, published_url, published_at, finished_at, updated_at
    ) VALUES (
      ${ids.organizationA}::uuid, ${ids.jobTarget}::uuid, ${ids.publishingJob}::uuid,
      ${ids.articleSiteHistorical}::uuid, 'published', 'https://live-region.a.example.web.id/live-article',
      '2026-09-10T00:00:00.000Z', '2026-09-12T00:00:00.000Z', '2026-09-12T00:00:00.000Z'
    )`;

    const service = new TenantBusinessService(new DrizzleStage3Repository(runtimeDatabase), new UuidGenerator());
    const runtimeActor = actor(new Set(['publisher.read', 'publisher.verify', 'analytics.read'])) as ReturnType<typeof actor> & { organizationId: string };
    const createdAffiliation = await service.createAffiliation(runtimeActor, {
      publisherId: ids.publisher,
      siteId: ids.siteASecond,
      institutionName: 'Second Institution',
      claimScopes: ['site_name'],
      evidenceReference: 'proof/second',
    });
    expect(createdAffiliation).toMatchObject({ ok: true, value: { publisherId: ids.publisher, siteId: ids.siteASecond } });
    const affiliationInvalidations = await ownerClient<{ reason: string }[]>`SELECT reason FROM invalidation_tasks
      WHERE organization_id = ${ids.organizationA}::uuid AND site_id = ${ids.siteASecond}::uuid
        AND reason LIKE '%affiliation.changed%'`;
    expect(affiliationInvalidations).toHaveLength(1);
    const updated = await service.updateAffiliation(runtimeActor, {
      id: ids.affiliation, expectedVersion: 1, institutionName: 'Updated Institution',
      claimScopes: ['site_name', 'article_attribution'], evidenceReference: 'proof/updated', active: true,
    });
    expect(updated).toMatchObject({ ok: true, value: { publisherId: ids.publisher, siteId: ids.siteARegional, institutionName: 'Updated Institution' } });
    const invalidReassignment = await service.updateAffiliation(runtimeActor, {
      id: ids.affiliation, expectedVersion: 2, publisherId: ids.publisher, siteId: ids.siteASecond,
      institutionName: 'False Reassignment', claimScopes: ['site_name'], evidenceReference: 'proof/invalid', active: true,
    });
    expect(invalidReassignment).toMatchObject({ ok: false, error: { error: { code: 'INVALID_INPUT' } } });
    const reloaded = await service.listPublishers(runtimeActor);
    expect(reloaded.ok).toBe(true); if (!reloaded.ok) return;
    expect(reloaded.value.affiliations.find(({ id }) => id === ids.affiliation)).toMatchObject({
      publisherId: ids.publisher, siteId: ids.siteARegional, institutionName: 'Updated Institution', version: 2,
    });
    const affiliationAudits = await ownerClient<{ after: { publisherId: string; siteId: string; institutionName: string } }[]>`SELECT after FROM audit_logs
      WHERE organization_id = ${ids.organizationA}::uuid
        AND request_id = ${runtimeActor.requestId}
        AND target_id = ${ids.affiliation}
        AND action = 'affiliation.update'`;
    expect(affiliationAudits).toHaveLength(1);
    expect(affiliationAudits[0]?.after).toMatchObject({ publisherId: ids.publisher, siteId: ids.siteARegional, institutionName: 'Updated Institution' });

    await ownerClient`UPDATE article_sites
      SET active = true, version = version + 1, updated_at = '2026-10-15T00:00:00.000Z'
      WHERE organization_id = ${ids.organizationA}::uuid AND id = ${ids.articleSiteHistorical}::uuid`;
    const stableOutcome = await ownerClient<{ state_occurred_at: Date | string; updated_at: Date | string }[]>`SELECT state_occurred_at, updated_at FROM article_sites
      WHERE organization_id = ${ids.organizationA}::uuid AND id = ${ids.articleSiteHistorical}::uuid`;
    expect(timestampIso(stableOutcome[0]!.state_occurred_at)).toBe('2026-09-10T00:00:00.000Z');
    expect(timestampIso(stableOutcome[0]!.updated_at)).toBe('2026-10-15T00:00:00.000Z');

    const analytics = await service.analytics(runtimeActor, { from: '2026-09-01T00:00:00.000Z', to: '2026-09-30T23:59:59.999Z' });
    expect(analytics.ok).toBe(true); if (!analytics.ok) return;
    expect(analytics.value.jobsBySiteRegionAndState).toEqual([{ key: `${ids.siteARegional}:${ids.regionA}:published`, count: 1 }]);
    expect(analytics.value.jobsBySiteRegionAndState.some(({ key }) => key.includes(ids.siteASecond))).toBe(false);
    expect(analytics.value.outcomesBySiteAndState).toContainEqual({ key: `${ids.siteARegional}:published`, count: 1 });
  }, 30_000);

  it('runs Stage 3 through the production repository with atomic audit and optimistic conflict', async () => {
    if (runtimeDatabase === null || ownerClient === null) return;
    const domainPermission = crypto.randomUUID();
    const rolePermission = crypto.randomUUID();
    const articleReadPermission = crypto.randomUUID();
    await ownerClient`INSERT INTO permissions (id, organization_id, name, scope, description) VALUES
      (${domainPermission}::uuid, ${ids.organizationA}::uuid, 'domain.manage', 'organization', 'Manage domains'),
      (${rolePermission}::uuid, ${ids.organizationA}::uuid, 'role.manage', 'organization', 'Manage roles'),
      (${articleReadPermission}::uuid, NULL, 'article.read', 'platform', 'Read articles')`;
    await ownerClient`INSERT INTO role_permissions (organization_id, role_id, permission_id) VALUES
      (${ids.organizationA}::uuid, ${ids.editorRole}::uuid, ${domainPermission}::uuid),
      (${ids.organizationA}::uuid, ${ids.editorRole}::uuid, ${rolePermission}::uuid)`;
    const service = new TenantBusinessService(new DrizzleStage3Repository(runtimeDatabase), new UuidGenerator());
    const created = await service.createDomain(actor() as ReturnType<typeof actor> & { organizationId: string }, { normalizedHostname: 'stage3-live.example.web.id', status: 'inactive' });
    expect(created.ok).toBe(true); if (!created.ok) return;
    const updated = await service.updateDomain(actor() as ReturnType<typeof actor> & { organizationId: string }, { id: created.value.id, expectedVersion: created.value.version, normalizedHostname: created.value.normalizedHostname, status: 'active' });
    expect(updated.ok).toBe(true);
    const stale = await service.updateDomain(actor() as ReturnType<typeof actor> & { organizationId: string }, { id: created.value.id, expectedVersion: created.value.version, normalizedHostname: created.value.normalizedHostname, status: 'archived' });
    expect(stale).toMatchObject({ ok: false, error: { error: { code: 'CONFLICT' } } });
    const rows = await ownerClient<{ status: string; version: number }[]>`SELECT status, version FROM domains WHERE organization_id = ${ids.organizationA}::uuid AND id = ${created.value.id}::uuid`;
    expect(rows).toEqual([{ status: 'active', version: 2 }]);
    const audits = await ownerClient<{ action: string }[]>`SELECT action FROM audit_logs WHERE organization_id = ${ids.organizationA}::uuid AND target_id = ${created.value.id}`;
    expect(audits.map(({ action }) => action)).toEqual(['domain.create', 'domain.update']);

    const role = await service.createRole(actor() as ReturnType<typeof actor> & { organizationId: string }, { name: 'Stage 3 Reader', active: true, permissions: ['article.read'] });
    expect(role.ok).toBe(true); if (!role.ok) return;
    const grantRows = await ownerClient<{ name: string }[]>`SELECT permissions.name FROM role_permissions
      INNER JOIN permissions ON permissions.id = role_permissions.permission_id
      WHERE role_permissions.organization_id = ${ids.organizationA}::uuid AND role_permissions.role_id = ${role.value.id}::uuid`;
    expect(grantRows.map(({ name }) => name)).toEqual(['article.read']);
    const targetMembership = await ownerClient<{ version: number }[]>`SELECT version FROM memberships WHERE organization_id = ${ids.organizationA}::uuid AND user_id = ${ids.targetUser}::uuid`;
    const membership = await service.saveMembership(actor() as ReturnType<typeof actor> & { organizationId: string }, { userId: ids.targetUser, roleId: role.value.id, status: 'active', expectedVersion: targetMembership[0]!.version });
    expect(membership.ok).toBe(true);
    const profile = await ownerClient<{ display_name: string }[]>`SELECT display_name FROM users WHERE id = ${ids.targetUser}::uuid`;
    expect(profile[0]?.display_name).toBe('Target');
    const invalidRole = await service.createRole(actor() as ReturnType<typeof actor> & { organizationId: string }, { name: 'Invalid grants', active: true, permissions: ['article.raed'] });
    expect(invalidRole).toMatchObject({ ok: false, error: { error: { code: 'INVALID_INPUT' } } });
  }, 30_000);

  it('runs production seed reconciliation idempotently and rolls back a failed run', async () => {
    if (ownerDatabase === null || ownerClient === null) return;
    const repository = new DrizzleSeedRepository(ownerDatabase);
    const seedInput = {
      organizationId: ids.organizationSeed,
      rootHostnames: ['seed-one.web.id', 'seed-two.web.id', 'seed-three.web.id'],
      reservedHostnames: new Set<string>(),
    };
    await expect(reconcileMvpSeed(seedInput, repository, new UuidGenerator()))
      .resolves.toMatchObject({ created: 6, updated: 0, unchanged: 0, failed: 0 });
    await expect(reconcileMvpSeed(seedInput, repository, new UuidGenerator()))
      .resolves.toMatchObject({ created: 0, updated: 0, unchanged: 6, failed: 0 });

    await ownerClient`INSERT INTO regions (organization_id, id, external_key, name, slug)
      VALUES (${ids.organizationSeedFailure}::uuid, ${crypto.randomUUID()}::uuid, 'conflicting-region', 'Conflict', 'wonosobo')`;
    const failedSeed = reconcileMvpSeed({
      organizationId: ids.organizationSeedFailure,
      rootHostnames: ['rollback-one.web.id', 'rollback-two.web.id', 'rollback-three.web.id'],
      reservedHostnames: new Set<string>(),
    }, repository, new UuidGenerator());
    await expect(failedSeed).rejects.toBeInstanceOf(SeedExecutionError);
    const rolledBackDomains = await ownerClient<{ count: number }[]>`SELECT count(*)::integer AS count FROM domains
      WHERE organization_id = ${ids.organizationSeedFailure}::uuid`;
    expect(rolledBackDomains[0]?.count).toBe(0);
  }, 30_000);
});
