/**
 * Read-only publisher hygiene check for one organization.
 *
 * Flags rows that the application layer would never produce on its own:
 * verified publishers without evidence, verified publishers without an audit
 * trail, archived publishers still referenced by articles, and names that
 * collide with tenant site/domain hostnames.
 *
 * Usage:
 *   ORG_ID=<uuid> npm run hygiene:publishers
 *
 * Exits non-zero when any violation is found. Never writes.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const organizationId = process.env.ORG_ID ?? '';
if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(organizationId)) {
  console.error('hygiene:publishers: set ORG_ID to the organization UUID');
  process.exit(2);
}

const env = readFileSync(join(ROOT, '.env'), 'utf8');
const poolUrl = env.match(/^DATABASE_POOL_URL=(.*)$/m)?.[1]?.trim();
if (poolUrl === undefined || poolUrl === '') throw new Error('DATABASE_POOL_URL missing from .env');

const sql = postgres(poolUrl, { prepare: false, connect_timeout: 10, idle_timeout: 5, max: 1 });
const violations = [];
const section = (title, rows, format) => {
  console.log(`\n== ${title}: ${rows.length}`);
  for (const row of rows.slice(0, 20)) console.log(`   - ${format(row)}`);
  if (rows.length > 20) console.log(`   … and ${rows.length - 20} more`);
  if (rows.length > 0) violations.push(title);
};

await sql.begin(async (tx) => {
  await tx`SELECT indicate_private.set_tenant_context(${organizationId}::uuid, 'hygiene:check', 'hygiene-publishers')`;
  const noEvidence = await tx`SELECT name FROM public.publishers WHERE organization_id = ${organizationId}::uuid AND status = 'active' AND verification_status = 'verified' AND evidence_reference IS NULL ORDER BY name`;
  section('verified without evidence', noEvidence, (row) => String(row.name));
  const noAudit = await tx`SELECT p.name FROM public.publishers p WHERE p.organization_id = ${organizationId}::uuid AND p.status = 'active' AND NOT EXISTS (SELECT 1 FROM public.audit_logs a WHERE a.organization_id = p.organization_id AND a.target_type = 'publisher' AND a.target_id = p.id::text) ORDER BY p.name`;
  section('publishers without audit trail', noAudit, (row) => String(row.name));
  const archivedUsed = await tx`SELECT DISTINCT p.name FROM public.publishers p JOIN public.articles a ON a.organization_id = p.organization_id AND a.publisher_id = p.id WHERE p.organization_id = ${organizationId}::uuid AND p.status = 'archived' ORDER BY p.name`;
  section('archived publishers still referenced by articles', archivedUsed, (row) => String(row.name));
  const hostnames = await tx`SELECT normalized_hostname AS hostname FROM public.sites WHERE organization_id = ${organizationId}::uuid UNION SELECT normalized_hostname FROM public.domains WHERE organization_id = ${organizationId}::uuid`;
  const folded = new Set(
    hostnames.flatMap((row) => {
      const clean = String(row.hostname).toLowerCase().trim();
      const first = clean.split('.')[0] ?? '';
      return [clean.replace(/[^a-z0-9]/gu, ''), first.replace(/[^a-z0-9]/gu, '')].filter((part) => part !== '');
    }),
  );
  const publishers = await tx`SELECT name, status FROM public.publishers WHERE organization_id = ${organizationId}::uuid AND status = 'active' ORDER BY name`;
  const collisions = publishers.filter((row) => folded.has(String(row.name).toLowerCase().replace(/[^a-z0-9]/gu, '')));
  section('names colliding with tenant hostnames', collisions, (row) => `${String(row.name)} [${String(row.status)}]`);
});
await sql.end();

if (violations.length > 0) {
  console.log(`\nhygiene:publishers: ${violations.length} violation group(s) in ${organizationId}`);
  process.exit(1);
}
console.log(`\nhygiene:publishers: clean (${organizationId})`);
