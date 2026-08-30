import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const directory = join(root, 'drizzle');
const files = (await readdir(directory)).filter((name) => name.endsWith('.sql')).sort();
const journal = JSON.parse(await readFile(join(directory, 'meta', '_journal.json'), 'utf8'));
const journalTags = new Set(journal.entries.map((entry) => entry.tag));
const combined = (await Promise.all(files.map((name) => readFile(join(directory, name), 'utf8')))).join('\n');
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
];
const failures = required.filter((fragment) => !combined.includes(fragment));
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
