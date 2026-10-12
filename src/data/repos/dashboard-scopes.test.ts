import { describe, expect, it } from 'vitest';

import { DrizzleDashboardRepository } from '@/data/repos/dashboard';
import {
  articleCategories,
  articleTags,
  articles,
  articleSites,
  auditLogs,
  authors,
  categories,
  categoryCatalog,
  domains,
  media,
  memberships,
  officialAffiliations,
  organizations,
  publishers,
  publishingJobs,
  publishingJobTargets,
  regionCatalog,
  regions,
  rolePermissions,
  roles,
  sites,
  siteSettings,
  tagCatalog,
} from '@/data/schema';

const ACTOR = {
  actorType: 'user',
  actorId: 'user-1',
  verifiedAuthUserId: 'auth-1',
  organizationId: 'org-1',
  permissionSet: new Set(['article.read']),
  entryPoint: 'dashboard',
  requestId: 'req-1',
} as const;

type RecordedSelect = { readonly table: string; readonly projection: readonly string[] };

function renderSqlChunk(chunk: unknown): string {
  if (typeof chunk === 'string') return chunk;
  if (typeof chunk !== 'object' || chunk === null) return '?';
  const record = chunk as Record<string, unknown>;
  if (Array.isArray(record.queryChunks)) return record.queryChunks.map(renderSqlChunk).join(' ');
  if ('value' in record) {
    const value = record.value;
    return Array.isArray(value) ? value.map((part) => typeof part === 'string' ? part : '?').join('') : '?';
  }
  return '?';
}

function scopeHarness(results: Record<string, unknown[]>, executeImpl?: () => Promise<readonly unknown[]>) {
  const selections: RecordedSelect[] = [];
  const fromTables: string[] = [];
  const joinedTables: string[] = [];
  const executedSql: string[] = [];
  const nameOf = new Map<unknown, string>(
    Object.entries({
      organizations, domains, regions, sites, siteSettings, roles, rolePermissions, memberships,
      publishers, officialAffiliations, categories, categoryCatalog, authors, articles, articleCategories, articleTags, tagCatalog, regionCatalog, articleSites,
      media, publishingJobs, publishingJobTargets, auditLogs,
    }).map(([name, table]) => [table, name]),
  );
  let pendingProjection: readonly string[] = [];
  const makeChain = (): Record<string, (...args: readonly unknown[]) => unknown> => {
    let rows: readonly unknown[] = [];
    const chain: Record<string, (...args: readonly unknown[]) => unknown> = {
      then: (...args: readonly unknown[]) => (args[0] as (value: readonly unknown[]) => void)(rows),
    };
    for (const method of ['from', 'where', 'innerJoin', 'orderBy', 'limit', 'for']) {
      chain[method] = (...args: readonly unknown[]) => {
        if (method === 'from') {
          const table = nameOf.get(args[0]) ?? 'unknown';
          fromTables.push(table);
          selections.push({ table, projection: pendingProjection });
          rows = results[table] ?? [];
        }
        if (method === 'innerJoin') joinedTables.push(nameOf.get(args[0]) ?? 'unknown');
        if (method === 'limit') return chain;
        return chain;
      };
    }
    return chain;
  };
  const transaction = {
    execute: async (query?: unknown) => {
      let text = '';
      if (query !== undefined && typeof query === 'object' && query !== null) {
        const chunks = (query as { readonly queryChunks?: readonly unknown[]; readonly strings?: readonly string[] }).queryChunks
          ?? (query as { readonly strings?: readonly string[] }).strings;
        if (chunks !== undefined) {
          text = chunks.map(renderSqlChunk).join(' ');
          executedSql.push(text);
        }
      }
      if (text.includes('subscription_access_state')) return [{ state: 'active' }];
      if (executeImpl !== undefined) return executeImpl();
      return [{ user_id: 'u-1', display_name: 'Operator', avatar_url: null }];
    },
    select: (...args: readonly unknown[]) => {
      pendingProjection = Object.keys((args[0] ?? {}) as Record<string, unknown>);
      return makeChain();
    },
  };
  const database = { transaction: async (callback: (tx: unknown) => unknown) => callback(transaction) };
  const repository = new DrizzleDashboardRepository(database as never);
  return { repository, selections, fromTables, joinedTables, executedSql };
}

const ORG = [{ id: 'org-1', name: 'Org' }];
const MEMBER = [{ userId: 'u-1', roleId: 'r-1', status: 'active', regionId: null, version: 1, createdAt: new Date(), updatedAt: new Date() }];

describe('scoped dashboard reads', () => {
  it('readConfigurationScope tidak menyentuh artikel, assignment, media, atau jobs', async () => {
    const { repository, fromTables } = scopeHarness({ organizations: ORG, memberships: MEMBER });
    await repository.readConfigurationScope(ACTOR as never, 'domain.read');
    expect(fromTables).toContain('domains');
    expect(fromTables).toContain('memberships');
    for (const forbidden of ['articles', 'articleCategories', 'articleSites', 'media', 'publishingJobs', 'publishingJobTargets']) {
      expect(fromTables).not.toContain(forbidden);
    }
  });

  it('readPublisherScope hanya membaca publisher, klaim, dan geografi mini', async () => {
    const { repository, fromTables } = scopeHarness({ memberships: MEMBER });
    await repository.readPublisherScope(ACTOR as never, 'publisher.read');
    for (const forbidden of ['articles', 'articleCategories', 'articleSites', 'media', 'publishingJobs', 'siteSettings', 'domains', 'roles']) {
      expect(fromTables).not.toContain(forbidden);
    }
    expect(fromTables).toContain('publishers');
    expect(fromTables).toContain('officialAffiliations');
  });

  it('readTaxonomyScope uses normalized global tag relations and projects articles without body', async () => {
    const { repository, selections, fromTables, joinedTables } = scopeHarness({ memberships: MEMBER });
    await repository.readTaxonomyScope(ACTOR as never, 'article.read');
    const articleSelections = selections.filter((selection) => selection.table === 'articles');
    expect(articleSelections.length).toBeGreaterThan(0);
    for (const selection of articleSelections) {
      expect(selection.projection).not.toContain('body');
      expect(selection.projection).not.toContain('bodyJson');
      expect(selection.projection).not.toContain('title');
      expect(selection.projection).not.toContain('tags');
    }
    expect(fromTables).toContain('articleTags');
    expect(joinedTables).toContain('tagCatalog');
    expect(joinedTables).toContain('categoryCatalog');
    expect(joinedTables).toContain('regionCatalog');
  });

  it('readEditorialScope memproyeksikan artikel tanpa body dan melewatkan koleksi berat', async () => {
    const { repository, selections, fromTables, executedSql } = scopeHarness({ organizations: ORG, memberships: MEMBER }, async () => []);
    await repository.readEditorialScope(ACTOR as never, 'article.read', {});
    const articleSelections = selections.filter((selection) => selection.table === 'articles');
    expect(articleSelections.length).toBe(0);
    const articleSql = executedSql.filter((statement) => statement.includes('FROM articles'));
    expect(articleSql.length).toBeGreaterThan(0);
    for (const statement of articleSql) {
      const head = statement.slice(0, statement.indexOf('FROM articles'));
      expect(head).not.toMatch(/body/);
    }
    for (const forbidden of ['media', 'publishingJobs', 'publishingJobTargets', 'siteSettings']) {
      expect(fromTables).not.toContain(forbidden);
    }
  });

  it('readEditorialScope filters tags through the canonical tenant-scoped relation', async () => {
    const { repository, executedSql } = scopeHarness({ organizations: ORG, memberships: MEMBER }, async () => []);
    await repository.readEditorialScope(ACTOR as never, 'article.read', { tag: 'apbd' });
    const articleQuery = executedSql.find((statement) => statement.includes('FROM articles a') && statement.includes('ORDER BY'));
    expect(articleQuery).toBeDefined();
    expect(articleQuery).toContain('FROM article_tags at');
    expect(articleQuery).toContain('INNER JOIN tag_catalog tc');
    expect(articleQuery).not.toContain('a.tags @>');
  });

  it('readNetworkArticlesScope tidak memuat assignment penuh maupun media', async () => {
    const { repository, fromTables, executedSql } = scopeHarness({
      memberships: MEMBER,
      sites: [{ id: 's-1', domainId: 'd-1', regionId: null, siteLevel: 'apex', parentSiteId: null, normalizedHostname: 'portal.test', status: 'active', activationState: 'active', version: 1, createdAt: new Date(), updatedAt: new Date() }],
    }, async () => []);
    await repository.readNetworkArticlesScope(ACTOR as never, 'article.read', 's-1', {});
    for (const forbidden of ['articleSites', 'media', 'publishingJobs', 'siteSettings']) {
      expect(fromTables).not.toContain(forbidden);
    }
    const articleSql = executedSql.filter((statement) => statement.includes('FROM articles'));
    expect(articleSql.length).toBeGreaterThan(0);
    for (const statement of articleSql) {
      expect(statement.slice(0, statement.indexOf('FROM articles'))).not.toMatch(/body/);
    }
  });

  it('readPublisherClaimScope membaca satu publisher dan klaimnya', async () => {
    const { repository, fromTables } = scopeHarness({
      memberships: MEMBER,
      publishers: [{ id: 'p-1', name: 'Humas', type: 'media', attributionLabel: 'Humas', contacts: {}, evidenceReference: null, verificationStatus: 'verified', submittedBy: null, submittedAt: null, verifiedBy: null, verifiedAt: null, rejectionReason: null, status: 'active', version: 1, createdAt: new Date(), updatedAt: new Date() }],
    });
    const scope = await repository.readPublisherClaimScope(ACTOR as never, 'publisher.read', 'p-1', 's-1');
    expect(scope.publisher.id).toBe('p-1');
    for (const forbidden of ['articles', 'articleSites', 'media', 'sites', 'regions']) {
      expect(fromTables).not.toContain(forbidden);
    }
  });

  it('execute(scope) hanya memuat koleksi yang diminta mutasi', async () => {
    const { repository, fromTables } = scopeHarness({
      organizations: ORG,
      memberships: MEMBER,
      categories: [{ id: 'c-1', name: 'Berita', slug: 'berita', status: 'active', version: 1, createdAt: new Date(), updatedAt: new Date() }],
    });
    await repository.execute(ACTOR as never, 'article.manage', () => 'ok', ['categories']);
    for (const forbidden of ['articles', 'articleSites', 'media', 'publishingJobs', 'sites', 'domains']) {
      expect(fromTables).not.toContain(forbidden);
    }
    expect(fromTables).toContain('categories');
  });

  it('auditLogPage memakai keyset seq dan tanpa payload before/after', async () => {
    const { repository, selections } = scopeHarness({ organizations: ORG, memberships: MEMBER });
    const first = await repository.auditLogPage(ACTOR as never, 'audit.read', {});
    expect(first.logs).toEqual([]);
    expect(first.nextCursor).toBeNull();
    const auditSelections = selections.filter((selection) => selection.table === 'auditLogs');
    expect(auditSelections.length).toBeGreaterThan(0);
    for (const selection of auditSelections) {
      expect(selection.projection).not.toContain('before');
      expect(selection.projection).not.toContain('after');
      expect(selection.projection).toContain('seq');
    }
  });

  it('execute(scope) menolak operasi yang menyentuh koleksi di luar scope', async () => {    const { repository } = scopeHarness({ organizations: ORG, memberships: MEMBER });
    await expect(
      repository.execute(
        ACTOR as never,
        'article.manage',
        (transaction) => {
          void (transaction as { readonly state: { readonly articles: readonly unknown[] } }).state.articles;
          return 'ok';
        },
        ['categories'],
      ),
    ).rejects.toThrow();
  });
});

describe('analyticsSummary bounded transfers', () => {
  it('agregasi dimensi di GROUP BY di SQL, bukan baris mentah ke JS', async () => {
    const { repository, executedSql } = scopeHarness({ organizations: ORG, memberships: MEMBER }, async () => []);
    const summary = await repository.analyticsSummary(ACTOR as never, 'analytics.read', {});
    expect(summary.jobsBySiteRegionAndState).toEqual([]);
    expect(summary.outcomesBySiteRegionAndState).toEqual([]);
    const dimensionStatements = executedSql.filter(
      (statement) => statement.includes('AS "regionId"') && statement.includes('AS state'),
    );
    expect(dimensionStatements).toHaveLength(2);
    for (const statement of dimensionStatements) {
      expect(statement).toMatch(/GROUP BY/i);
      expect(statement).toMatch(/count\(\*\)::int AS count/i);
    }
  });

  it('tidak ada query dimensi tanpa agregasi pada join job-target/article-sites', async () => {
    const { repository, executedSql } = scopeHarness({ organizations: ORG, memberships: MEMBER }, async () => []);
    await repository.analyticsSummary(ACTOR as never, 'analytics.read', {});
    const rawJoins = executedSql.filter(
      (statement) =>
        (statement.includes('publishing_job_targets') || statement.includes('FROM article_sites s')) &&
        statement.includes('JOIN') &&
        !/GROUP BY/i.test(statement) &&
        !/LIMIT/i.test(statement),
    );
    expect(rawJoins).toEqual([]);
  });
});
