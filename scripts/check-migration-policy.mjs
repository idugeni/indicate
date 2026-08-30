import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const directory = join(root, 'drizzle');
const files = (await readdir(directory)).filter((name) => name.endsWith('.sql')).sort();
const journal = JSON.parse(await readFile(join(directory, 'meta', '_journal.json'), 'utf8'));
const journalTags = new Set(journal.entries.map((entry) => entry.tag));
const combined = (await Promise.all(files.map((name) => readFile(join(directory, name), 'utf8')))).join('\n');
const editorialSchema = await readFile(join(root, 'src', 'infrastructure', 'db', 'schema', 'editorial.ts'), 'utf8');
const required = [
  'CREATE TABLE "organizations"',
  'CREATE TABLE "audit_logs"',
  'CREATE POLICY tenant_isolation',
  'FORCE ROW LEVEL SECURITY',
  'audit_logs_append_only_guard',
  'set_tenant_context',
  'indicate_runtime',
  'indicate_schema_migrations',
  'REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON indicate_schema_migrations',
  'publishers_submitter_membership_fk',
  'membership_telegram_mapping_guard',
  'list_active_organizations_for_verified_user',
  'state_occurred_at',
  'article_sites_state_occurred_at_guard',
  'media_key_reservation_owner_prefix',
  'stage4_publishing_job_transition_guard',
  'stage4_publishing_target_transition_guard',
  'stage4_article_site_transition_guard',
  'claim_stage4_dispatch_gaps',
  'find_stage4_expired_leases',
  'claim_stage4_transition_receipts',
  'claim_stage4_cleanup_tasks',
  'claim_stage5_invalidation_tasks',
  'resolve_stage5_public_host',
  'is_stage5_pending_host',
  'claim_stage5_activation_attempts',
  'complete_stage5_invalidation',
  'fail_stage5_invalidation',
  'stage5_site_hostname_guard',
  'cache_bypasses',
  'resolve_stage6_api_key_lookup',
  'resolve_stage6_telegram_identity',
  'stage6_replay_claim_organization',
  'stage6_has_platform_permission',
  'stage6_provision_platform_permission',
  'stage6_list_platform_permissions',
  'stage6_role_permission_scope_guard',
  'platform_user_permissions',
  'stage6_prepare_replay_outcome',
  'stage6_finalize_replay',
  'stage6_bind_replay_identity',
  'stage6_create_customer',
  'telegram_conversations',
];
const failures = required.filter((fragment) => !combined.includes(fragment));
if (!editorialSchema.includes("check('media_key_reservation_owner_prefix'")) failures.push('Drizzle reservation prefix constraint is missing migration parity');
for (const file of files) {
  const tag = file.slice(0, -'.sql'.length);
  if (!journalTags.has(tag)) failures.push(`migration ${tag} is absent from Drizzle journal discovery`);
}
if (journal.entries.length !== files.length) {
  failures.push('Drizzle journal and SQL migration counts differ');
}
if (/\bDROP\s+(?:TABLE|COLUMN)\b/i.test(combined)) {
  failures.push('destructive DROP TABLE/COLUMN is prohibited in forward Stage 2 migrations');
}
if (files.length < 2) failures.push('expected core and security forward migrations');
if (failures.length > 0) {
  console.error(`Migration policy failed: ${failures.join(', ')}`);
  process.exit(1);
}
console.log(`Migration policy passed (${files.length} forward SQL files, RLS/grants/audit defenses present).`);
