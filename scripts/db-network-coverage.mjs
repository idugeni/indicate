/**
 * Read-only network coverage audit for one organization.
 *
 * Prints every portal count next to how many of those portals have actually
 * served a published article, so a provisioned total can never be quoted on its
 * own. A raw `count(*)` over `sites` answers "how many portals exist", which is
 * routinely mistaken for "how many portals are live"; the gap between the two is
 * the whole point of this script.
 *
 * Also reports the geography and hostname shape of the network, plus whether
 * `view_count` looks observed or seeded. Seeded counters have no zero rows,
 * because a real traffic distribution always does.
 *
 * Usage:
 *   ORG_ID=<uuid> npm run hygiene:network
 *
 * Never writes. Exits zero: the shape is a report, not a gate.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const organizationId = process.env.ORG_ID ?? '';
if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(organizationId)) {
  console.error('hygiene:network: set ORG_ID to the organization UUID');
  process.exit(2);
}

const env = readFileSync(join(ROOT, '.env'), 'utf8');
const poolUrl = env.match(/^DATABASE_POOL_URL=(.*)$/m)?.[1]?.trim();
if (poolUrl === undefined || poolUrl === '') throw new Error('DATABASE_POOL_URL missing from .env');

const sql = postgres(poolUrl, { prepare: false, connect_timeout: 10, idle_timeout: 5, max: 1 });
const int = (value) => Number(value ?? 0);
const row = (label, value) => console.log(`   ${label.padEnd(26)} ${value}`);

await sql.begin(async (tx) => {
  await tx`SELECT indicate_private.set_tenant_context(${organizationId}::uuid, 'hygiene:check', 'hygiene-network')`;

  const levels = await tx`
    WITH served AS (
      SELECT DISTINCT site_id FROM public.article_sites WHERE state = 'published'
    )
    SELECT s.site_level AS level,
           count(*)::int AS provisioned,
           count(served.site_id)::int AS serving,
           count(*)::int - count(served.site_id)::int AS never_served
    FROM public.sites s
    LEFT JOIN served ON served.site_id = s.id
    WHERE s.organization_id = ${organizationId}::uuid
      AND s.status = 'active' AND s.activation_state = 'active'
    GROUP BY s.site_level
    ORDER BY provisioned DESC`;

  console.log('\n== portal coverage (active sites)');
  console.log('   level             provisioned  serving  never_served');
  let provisionedTotal = 0;
  let servingTotal = 0;
  for (const level of levels) {
    provisionedTotal += int(level.provisioned);
    servingTotal += int(level.serving);
    console.log(
      `   ${String(level.level).padEnd(16)}  ${String(int(level.provisioned)).padStart(11)}  ${String(int(level.serving)).padStart(7)}  ${String(int(level.never_served)).padStart(12)}`,
    );
  }
  console.log(`   ${'TOTAL'.padEnd(16)}  ${String(provisionedTotal).padStart(11)}  ${String(servingTotal).padStart(7)}  ${String(provisionedTotal - servingTotal).padStart(12)}`);
  console.log(`   serving share: ${provisionedTotal === 0 ? 'n/a' : `${((servingTotal / provisionedTotal) * 100).toFixed(1)}%`}`);

  const geography = await tx`
    SELECT count(DISTINCT region_id)::int AS cities
    FROM public.sites
    WHERE organization_id = ${organizationId}::uuid AND site_level = 'city' AND status = 'active' AND activation_state = 'active'`;
  const provinces = await tx`
    SELECT parent.name AS name, count(child.id)::int AS cities
    FROM public.regions child
    JOIN public.regions parent ON parent.id = child.parent_region_id
    WHERE child.organization_id = ${organizationId}::uuid AND child.kind = 'city'
    GROUP BY parent.name
    ORDER BY cities DESC`;
  const cityCount = int(geography[0]?.cities);
  const cityPortals = int(levels.find((level) => level.level === 'city')?.provisioned);
  console.log('\n== geography');
  row('cities', cityCount);
  row('provinces', provinces.length);
  row('city portals per city', cityCount === 0 ? 'n/a' : (cityPortals / cityCount).toFixed(2));

  console.log('\n== cities per province');
  for (const province of provinces) console.log(`   ${String(province.name).padEnd(26)} ${int(province.cities)}`);

  const apex = await tx`
    SELECT count(*)::int AS apex,
           count(DISTINCT split_part(normalized_hostname, '.', 1))::int AS brands
    FROM public.sites
    WHERE organization_id = ${organizationId}::uuid AND site_level = 'apex' AND status = 'active'`;
  const tlds = await tx`
    SELECT split_part(normalized_hostname, '.', 2) AS tld, count(*)::int AS n
    FROM public.sites
    WHERE organization_id = ${organizationId}::uuid AND site_level = 'apex' AND status = 'active'
    GROUP BY tld ORDER BY n DESC`;
  console.log('\n== apex hostnames');
  row('apex domains', int(apex[0]?.apex));
  row('distinct brands', int(apex[0]?.brands));
  row('tlds', tlds.map((entry) => `${String(entry.tld)}.id ${int(entry.n)}`).join('  '));

  const views = await tx`
    SELECT min(view_count)::int AS min_views, max(view_count)::int AS max_views,
           round(avg(view_count))::int AS avg_views,
           count(*) FILTER (WHERE view_count = 0)::int AS zero_rows,
           count(*)::int AS rows
    FROM public.article_sites
    WHERE organization_id = ${organizationId}::uuid`;
  const view = views[0] ?? {};
  console.log('\n== view_count (observed vs seeded)');
  row('rows', int(view.rows));
  row('min / avg / max', `${int(view.min_views)} / ${int(view.avg_views)} / ${int(view.max_views)}`);
  row('zero rows', `${int(view.zero_rows)} (${int(view.rows) === 0 ? 'n/a' : `${((int(view.zero_rows) / int(view.rows)) * 100).toFixed(1)}%`})`);
  console.log(`   ${int(view.rows) > 0 && int(view.zero_rows) === 0 ? 'no zero rows: counters are seeded, not observed traffic' : 'zero rows present: counters look observed'}`);

  const content = await tx`
    SELECT
      (SELECT count(*)::int FROM public.articles WHERE organization_id = ${organizationId}::uuid) AS articles,
      (SELECT count(DISTINCT article_id)::int FROM public.article_sites WHERE organization_id = ${organizationId}::uuid) AS targeted`;
  console.log('\n== content');
  row('articles', int(content[0]?.articles));
  row('articles with targets', int(content[0]?.targeted));
});

await sql.end();
console.log(`\nhygiene:network: report complete (${organizationId})`);
