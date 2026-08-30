import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { AuthorizationService } from '@/application/auth/authorization-service';
import { getPublicConfig } from '@/config/public';
import * as schema from '@/infrastructure/db/schema';
import { InMemoryStage2Database } from '@/infrastructure/testing/stage2-memory';

const projectRoot = resolve(import.meta.dirname, '../..');
const coreMigration = readFileSync(resolve(projectRoot, 'drizzle/0000_stage2_core_schema.sql'), 'utf8');
const securityMigration = readFileSync(resolve(projectRoot, 'drizzle/0001_stage2_security.sql'), 'utf8');
const actorConstraintMigration = readFileSync(resolve(projectRoot, 'drizzle/0002_stage2_publisher_actor_constraints.sql'), 'utf8');
const authorizationHardeningMigration = readFileSync(resolve(projectRoot, 'drizzle/0003_stage2_authorization_hardening.sql'), 'utf8');
const verifiedUserContextMigration = readFileSync(resolve(projectRoot, 'drizzle/0004_stage3_verified_user_context.sql'), 'utf8');
const stage3HardeningMigration = readFileSync(resolve(projectRoot, 'drizzle/0005_stage3_discovery_outcome_timestamp.sql'), 'utf8');
const migrationJournal = readFileSync(resolve(projectRoot, 'drizzle/meta/_journal.json'), 'utf8');

const requiredTables = [
  'users', 'organizations', 'memberships', 'roles', 'permissions', 'role_permissions',
  'domains', 'regions', 'sites', 'site_settings', 'subscriptions', 'api_keys',
  'telegram_identity_mappings', 'publishers', 'official_affiliations', 'categories',
  'authors', 'articles', 'article_sites', 'media', 'media_key_reservations',
  'object_cleanup_tasks', 'audit_logs', 'publishing_jobs', 'publishing_job_targets',
  'publication_transition_receipts', 'webhook_replay_claims', 'domain_activation_attempts',
  'invalidation_tasks', 'seed_runs', 'indicate_schema_migrations', 'migration_gate_events',
] as const;

function createActor(organizationId: string, userId: string) {
  return {
    actorType: 'user' as const,
    actorId: userId,
    verifiedAuthUserId: userId,
    organizationId,
    permissionSet: new Set<string>(),
    entryPoint: 'cms' as const,
    requestId: 'integration-request',
  };
}

describe('Stage 2 Drizzle and PostgreSQL contracts', () => {
  it('exports and migrates every required entity', () => {
    expect(Object.keys(schema).length).toBeGreaterThanOrEqual(requiredTables.length);
    for (const table of requiredTables) {
      expect(coreMigration).toContain(`CREATE TABLE "${table}"`);
    }
  });

  it('encodes composite tenant constraints, finite states, idempotency, and canonical articles', () => {
    expect(coreMigration).toContain('FOREIGN KEY ("organization_id","article_id")');
    expect(coreMigration).toContain('FOREIGN KEY ("organization_id","site_id")');
    expect(coreMigration).toContain('article_sites_organization_article_site_unique');
    expect(coreMigration).toContain('publishing_jobs_organization_idempotency_unique');
    expect(coreMigration).toContain('publishing_job_targets_active_article_site_unique');
    const articleSiteDefinition = coreMigration.slice(
      coreMigration.indexOf('CREATE TABLE "article_sites"'),
      coreMigration.indexOf('CREATE TABLE "articles"'),
    );
    expect(articleSiteDefinition).not.toMatch(/"title"|"body"/);
  });

  it('enforces RLS, transaction-local context, role coherence, and append-only audit grants', () => {
    for (const fragment of [
      'FORCE ROW LEVEL SECURITY',
      'CREATE POLICY tenant_isolation',
      'set_tenant_context',
      'role_permissions_scope_guard',
      'telegram_mapping_membership_role_guard',
      'publishing_job_targets_article_guard',
      'audit_logs_append_only_guard',
      'REVOKE UPDATE, DELETE, TRUNCATE ON audit_logs FROM indicate_runtime',
      'REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON permissions FROM indicate_runtime',
    ]) expect(securityMigration).toContain(fragment);
    expect(securityMigration).not.toMatch(/DROP\s+(TABLE|COLUMN)/i);
    expect(securityMigration).toContain('REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON indicate_schema_migrations');
    expect(actorConstraintMigration).toContain('publishers_submitter_membership_fk');
    expect(actorConstraintMigration).toContain('publishers_verifier_membership_fk');
    expect(authorizationHardeningMigration).toContain('membership_telegram_mapping_guard');
    expect(authorizationHardeningMigration).toContain('FOR UPDATE');
    expect(verifiedUserContextMigration).toContain('set_verified_user_context');
    expect(verifiedUserContextMigration).toContain('lookup_user_display_name');
    expect(verifiedUserContextMigration).toContain('REVOKE ALL ON FUNCTION');
    expect(stage3HardeningMigration).toContain('list_active_organizations_for_verified_user');
    expect(stage3HardeningMigration).toContain('SECURITY DEFINER');
    expect(stage3HardeningMigration).toContain('state_occurred_at');
    expect(stage3HardeningMigration).toContain('article_sites_state_occurred_at_guard');
    expect(stage3HardeningMigration).toContain('REVOKE ALL ON FUNCTION indicate_private.list_active_organizations_for_verified_user() FROM PUBLIC');
    expect(migrationJournal).toContain('0004_stage3_verified_user_context');
    expect(migrationJournal).toContain('0005_stage3_discovery_outcome_timestamp');
  });
});

describe('Stage 2 tenant behavior integration', () => {
  it('returns the same denial for absent and cross-organization resources', async () => {
    const organizationId = '00000000-0000-4000-8000-000000000001';
    const foreignOrganizationId = '00000000-0000-4000-8000-000000000002';
    const userId = '00000000-0000-4000-8000-000000000010';
    const database = new InMemoryStage2Database();
    database.addMembership({
      organizationId, userId,
      roleId: '00000000-0000-4000-8000-000000000020',
      status: 'active', roleActive: true, permissions: new Set(['site.read']),
    });
    database.addResource('site', '00000000-0000-4000-8000-000000000030', foreignOrganizationId);
    const authorization = new AuthorizationService(database);
    const absent = await authorization.authorize(createActor(organizationId, userId), organizationId, 'site.read', {
      type: 'site', id: '00000000-0000-4000-8000-000000000031',
    });
    const crossTenant = await authorization.authorize(createActor(organizationId, userId), organizationId, 'site.read', {
      type: 'site', id: '00000000-0000-4000-8000-000000000030',
    });
    expect(absent).toEqual(crossTenant);
  });

  it('converges concurrent local identity linkage to one user', async () => {
    const database = new InMemoryStage2Database();
    const authUserId = '00000000-0000-4000-8000-000000000099';
    const results = await Promise.all(Array.from({ length: 20 }, (_, index) => database.linkLocalUser({
      id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
      authUserId,
      displayName: 'Concurrent Editor',
    })));
    expect(new Set(results.map(({ id }) => id)).size).toBe(1);
    expect(database.snapshot().users).toHaveLength(1);
  });
});

describe('live Supabase Auth contract hook', () => {
  it.skipIf(process.env.SUPABASE_LIVE_CONTRACT !== '1')('verifies the configured Supabase Auth project without tenant access', async () => {
    const publicConfig = getPublicConfig(process.env);
    const { createSupabaseSsrAuthAdapter } = await import('@/infrastructure/auth/supabase-ssr');
    const adapter = createSupabaseSsrAuthAdapter({
      url: publicConfig.supabaseUrl,
      anonKey: publicConfig.supabaseAnonKey,
      cookies: { getAll: () => [], setAll: () => undefined },
    });
    await expect(adapter.check()).resolves.toMatchObject({ service: 'supabase-auth', status: 'healthy' });
  });
});
