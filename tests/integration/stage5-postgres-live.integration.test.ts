import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DrizzleStage5Repository } from '@/infrastructure/db/repositories/drizzle-stage5-repository';
import * as schema from '@/infrastructure/db/schema';

const databaseUrl = process.env.TEST_DATABASE_URL;
const runtimePassword = 'stage2-runtime-contract-password';
const ids = {
  organization: '00000000-0000-4000-8000-000000000501', domain: '00000000-0000-4000-8000-000000000502', region: '00000000-0000-4000-8000-000000000503', site: '00000000-0000-4000-8000-000000000504', publisher: '00000000-0000-4000-8000-000000000505', affiliation: '00000000-0000-4000-8000-000000000506', category: '00000000-0000-4000-8000-000000000507', author: '00000000-0000-4000-8000-000000000508', article: '00000000-0000-4000-8000-000000000509', articleSite: '00000000-0000-4000-8000-000000000510', pendingDomain: '00000000-0000-4000-8000-000000000511', pendingSite: '00000000-0000-4000-8000-000000000512', pendingAttempt: '00000000-0000-4000-8000-000000000513', task: '00000000-0000-4000-8000-000000000514', failedTask: '00000000-0000-4000-8000-000000000515', deactivationAttempt: '00000000-0000-4000-8000-000000000516', overlappingTask: '00000000-0000-4000-8000-000000000517',
};
function runtimeUrl(ownerUrl: string): string { const value = new URL(ownerUrl); value.username = 'indicate_runtime'; value.password = runtimePassword; return value.toString(); }
const suite = databaseUrl === undefined ? describe.skip : describe;

suite('live PostgreSQL 17 Stage 5 runtime-role contract', () => {
  const ownerClient = databaseUrl === undefined ? null : postgres(databaseUrl, { max: 4, prepare: false });
  const runtimeClient = databaseUrl === undefined ? null : postgres(runtimeUrl(databaseUrl), { max: 4, prepare: false });
  const repository = runtimeClient === null ? null : new DrizzleStage5Repository(drizzle(runtimeClient, { schema }), 'https://control.example/assets/fallback.png');

  beforeAll(async () => {
    const owner = ownerClient!;
    const version = await owner<{ server_version_num: string }[]>`SHOW server_version_num`.then((rows) => Number(rows[0]?.server_version_num ?? 0)); expect(version).toBeGreaterThanOrEqual(170000);
    const migration = await owner<{ found: boolean }[]>`SELECT EXISTS(SELECT 1 FROM indicate_schema_migrations WHERE version = 9) AS found`; expect(migration[0]?.found).toBe(true);
    await owner.unsafe(`ALTER ROLE indicate_runtime PASSWORD '${runtimePassword}'`);
    await owner`INSERT INTO organizations (id, name, slug) VALUES (${ids.organization}::uuid, 'Stage5 Live', 'stage5-live')`;
    await owner`INSERT INTO domains (organization_id, id, normalized_hostname, status) VALUES (${ids.organization}::uuid, ${ids.domain}::uuid, 'stage5.example.web.id', 'active'), (${ids.organization}::uuid, ${ids.pendingDomain}::uuid, 'pending-stage5.example.web.id', 'active')`;
    await owner`INSERT INTO regions (organization_id, id, external_key, name, slug, status) VALUES (${ids.organization}::uuid, ${ids.region}::uuid, 'stage5-region', 'Stage5 Region', 'news', 'active')`;
    await owner`INSERT INTO sites (organization_id, id, domain_id, region_id, normalized_hostname, status, activation_state) VALUES (${ids.organization}::uuid, ${ids.site}::uuid, ${ids.domain}::uuid, ${ids.region}::uuid, 'news.stage5.example.web.id', 'active', 'active'), (${ids.organization}::uuid, ${ids.pendingSite}::uuid, ${ids.pendingDomain}::uuid, NULL, 'pending-stage5.example.web.id', 'inactive', 'pending')`;
    await owner`INSERT INTO site_settings (organization_id, site_id, name, description, colors, social_links, seo, navigation) VALUES (${ids.organization}::uuid, ${ids.site}::uuid, 'Stage5 News', 'Runtime role news', ${JSON.stringify({ primary: '#123456' })}::jsonb, '{}'::jsonb, ${JSON.stringify({ robots: ['User-agent: *', 'Allow: /'] })}::jsonb, ${JSON.stringify([{ label: 'Home', path: '/' }])}::jsonb)`;
    await owner`INSERT INTO publishers (organization_id, id, name, type, attribution_label, verification_status, verified_at, status) VALUES (${ids.organization}::uuid, ${ids.publisher}::uuid, 'Independent Stage5', 'independent_publisher', 'Stage5 Source', 'verified', now(), 'active')`;
    await owner`INSERT INTO official_affiliations (organization_id, id, publisher_id, site_id, institution_name, claim_scopes, evidence_reference, active, verified_at) VALUES (${ids.organization}::uuid, ${ids.affiliation}::uuid, ${ids.publisher}::uuid, ${ids.site}::uuid, 'Stage5 Institution', ARRAY['site_name']::text[], 'proof/stage5', true, now())`;
    await owner`INSERT INTO categories (organization_id, id, name, slug, status) VALUES (${ids.organization}::uuid, ${ids.category}::uuid, 'Local', 'local', 'active')`;
    await owner`INSERT INTO authors (organization_id, id, display_name, byline, status) VALUES (${ids.organization}::uuid, ${ids.author}::uuid, 'Stage5 Author', 'Stage5 Author', 'active')`;
    await owner`INSERT INTO articles (organization_id, id, region_id, publisher_id, category_id, author_id, slug, title, body, source, status) VALUES (${ids.organization}::uuid, ${ids.article}::uuid, ${ids.region}::uuid, ${ids.publisher}::uuid, ${ids.category}::uuid, ${ids.author}::uuid, 'runtime-role-article', 'Runtime Role Article', 'Scoped body', 'Stage5 Source', 'active')`;
    await owner`INSERT INTO article_sites (organization_id, id, article_id, site_id, state, state_occurred_at, published_url, published_at, active) VALUES (${ids.organization}::uuid, ${ids.articleSite}::uuid, ${ids.article}::uuid, ${ids.site}::uuid, 'published', now(), 'https://news.stage5.example.web.id/articles/runtime-role-article', now(), true)`;
    await owner`INSERT INTO domain_activation_attempts (organization_id, id, site_id, hostname, previous_hostname, operation, phase, status, next_attempt_at) VALUES
      (${ids.organization}::uuid, ${ids.pendingAttempt}::uuid, ${ids.pendingSite}::uuid, 'pending-stage5.example.web.id', NULL, 'activate', 'vercel_associated', 'processing', now()),
      (${ids.organization}::uuid, ${ids.deactivationAttempt}::uuid, ${ids.site}::uuid, 'news.stage5.example.web.id', 'news.stage5.example.web.id', 'deactivate', 'deactivating', 'pending', now())`;
  });

  afterAll(async () => { await runtimeClient?.end({ timeout: 5 }); await ownerClient?.end({ timeout: 5 }); });

  it('discovers exact hosts through the narrow function without tenant context and enforces active Region eligibility', async () => {
    const found = await repository!.findActiveSitesByExactHostname('news.stage5.example.web.id');
    expect(found).toHaveLength(1); expect(found[0]).toMatchObject({ organizationId: ids.organization, siteId: ids.site, regionId: ids.region });
    expect(await repository!.findActiveSitesByExactHostname('evil.news.stage5.example.web.id')).toEqual([]);
    await ownerClient!`UPDATE regions SET status = 'inactive' WHERE organization_id = ${ids.organization}::uuid AND id = ${ids.region}::uuid`;
    expect(await repository!.findActiveSitesByExactHostname('news.stage5.example.web.id')).toEqual([]);
    await ownerClient!`UPDATE regions SET status = 'active' WHERE organization_id = ${ids.organization}::uuid AND id = ${ids.region}::uuid`;
  });

  it('loads scoped public content as indicate_runtime after establishing tenant context and enforces verified claim scope', async () => {
    const context = (await repository!.findActiveSitesByExactHostname('news.stage5.example.web.id'))[0]!;
    const site = await repository!.loadPublicSite(context, {});
    expect(site?.articles).toHaveLength(1); expect(site?.articles[0]).toMatchObject({ slug: 'runtime-role-article', officialInstitution: 'Stage5 Institution' });
    expect(site?.settings.fallbackImageUrl).toBe('https://news.stage5.example.web.id/assets/fallback.png');
    await ownerClient!`UPDATE official_affiliations SET claim_scopes = ARRAY['article_attribution']::text[] WHERE organization_id = ${ids.organization}::uuid AND id = ${ids.affiliation}::uuid`;
    expect((await repository!.loadPublicSite(context, {}))?.articles[0]?.officialInstitution).toBeNull();
    await ownerClient!`UPDATE official_affiliations SET claim_scopes = ARRAY['site_name']::text[] WHERE organization_id = ${ids.organization}::uuid AND id = ${ids.affiliation}::uuid`;
  });

  it('binds pending probes to one exact persisted attempt and hostname', async () => {
    await expect(repository!.findPendingActivation('pending-stage5.example.web.id', ids.pendingAttempt)).resolves.toBe(true);
    await expect(repository!.findPendingActivation('other-stage5.example.web.id', ids.pendingAttempt)).resolves.toBe(false);
    await expect(repository!.findPendingActivation('pending-stage5.example.web.id', crypto.randomUUID())).resolves.toBe(false);
  });

  it('maps claimed activation and deactivation attempts through the runtime-role repository', async () => {
    const now = new Date();
    const claimToken = crypto.randomUUID();
    const claimed = await repository!.claimActivationAttempts(now.toISOString(), 10, claimToken, new Date(now.getTime() + 30_000).toISOString());
    expect(claimed).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: ids.pendingAttempt, operation: 'activate', siteId: ids.pendingSite, claimToken }),
      expect.objectContaining({ id: ids.deactivationAttempt, operation: 'deactivate', siteId: ids.site, previousHostname: 'news.stage5.example.web.id', claimToken }),
    ]));
  });

  it('enables bypass at enqueue and clears it only after every fenced task completes', async () => {
    const now = new Date();
    await ownerClient!`INSERT INTO invalidation_tasks (organization_id, id, site_id, current_hostname, tags, paths, urls, reason, status, next_attempt_at) VALUES
      (${ids.organization}::uuid, ${ids.task}::uuid, ${ids.site}::uuid, 'news.stage5.example.web.id', ARRAY['site:test']::text[], ARRAY['/']::text[], ARRAY['https://news.stage5.example.web.id/']::text[], 'live.complete', 'pending', ${now}),
      (${ids.organization}::uuid, ${ids.overlappingTask}::uuid, ${ids.site}::uuid, 'news.stage5.example.web.id', ARRAY['site:test:overlap']::text[], ARRAY['/articles']::text[], ARRAY['https://news.stage5.example.web.id/articles']::text[], 'live.overlap', 'pending', ${now})`;
    const context = (await repository!.findActiveSitesByExactHostname('news.stage5.example.web.id'))[0]!;
    await expect(repository!.isCacheBypassed(context)).resolves.toBe(true);

    const claimed = await repository!.claimInvalidations(now.toISOString(), 10);
    const first = claimed.find((task) => task.id === ids.task)!;
    const overlapping = claimed.find((task) => task.id === ids.overlappingTask)!;
    expect(first.claimToken).not.toBeNull();
    await expect(repository!.completeInvalidation({ ...first, claimToken: crypto.randomUUID() }, now.toISOString())).rejects.toThrow('stale_claim');
    await repository!.completeInvalidation(first, now.toISOString());
    await expect(repository!.isCacheBypassed(context)).resolves.toBe(true);

    await repository!.completeInvalidation(overlapping, now.toISOString());
    const completed = await ownerClient!<{ status: string; bypass: boolean }[]>`SELECT task.status::text, bypass.bypass FROM invalidation_tasks task JOIN cache_bypasses bypass USING (organization_id, site_id) WHERE task.organization_id = ${ids.organization}::uuid AND task.id = ${ids.task}::uuid`;
    expect(completed[0]).toEqual({ status: 'completed', bypass: false });
  });

  it('durably enables Site bypass and retry progress before optional coordination recovery', async () => {
    const now = new Date();
    await ownerClient!`INSERT INTO invalidation_tasks (organization_id, id, site_id, current_hostname, tags, paths, urls, reason, status, next_attempt_at) VALUES (${ids.organization}::uuid, ${ids.failedTask}::uuid, ${ids.site}::uuid, 'news.stage5.example.web.id', ARRAY['site:test']::text[], ARRAY['/']::text[], ARRAY['https://news.stage5.example.web.id/']::text[], 'live.fail', 'pending', ${now})`;
    const claimed = (await repository!.claimInvalidations(now.toISOString(), 10)).find((task) => task.id === ids.failedTask)!;
    await repository!.failInvalidation(claimed, { code: 'provider_unavailable' }, new Date(now.getTime() + 60_000).toISOString(), false, now.toISOString());
    const context = (await repository!.findActiveSitesByExactHostname('news.stage5.example.web.id'))[0]!;
    await expect(repository!.isCacheBypassed(context)).resolves.toBe(true);
    const failed = await ownerClient!<{ status: string; attempts: number }[]>`SELECT status::text, attempts FROM invalidation_tasks WHERE organization_id = ${ids.organization}::uuid AND id = ${ids.failedTask}::uuid`;
    expect(failed[0]).toEqual({ status: 'pending', attempts: 1 });
  });

  it('rejects a request-controlled previous hostname without same-Site ownership proof', async () => {
    const runtimeActor = {
      actorType: 'system' as const,
      actorId: 'stage5-contract',
      organizationId: ids.organization,
      permissionSet: new Set(['sites.manage']),
      entryPoint: 'cms' as const,
      requestId: crypto.randomUUID(),
    };
    await expect(repository!.beginActivation(runtimeActor, ids.site, 'news.stage5.example.web.id', 'foreign.example.web.id', new Date().toISOString())).rejects.toThrow('Previous hostname is not owned by Site');
    const leaked = await ownerClient!<{ count: number }[]>`SELECT count(*)::integer AS count FROM domain_activation_attempts WHERE organization_id = ${ids.organization}::uuid AND previous_hostname = 'foreign.example.web.id'`;
    expect(leaked[0]?.count).toBe(0);
  });
});
