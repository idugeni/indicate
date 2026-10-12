import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { getTableConfig } from 'drizzle-orm/pg-core';

import { DrizzleDashboardRepository } from '@/data/repos/dashboard';
import { articles } from '@/data/schema/editorial';

const ORG = '0199a2b3-4c5d-7e8f-9012-3456789abcde';

const ACTOR = {
  actorType: 'user',
  actorId: 'user-1',
  verifiedAuthUserId: 'auth-1',
  organizationId: ORG,
  permissionSet: new Set(['article.read']),
  platformPermissionSet: new Set<string>(),
  regionScopeId: null,
  entryPoint: 'dashboard',
  requestId: 'req-1',
} as const;

function flatText(query: unknown): string {
  const chunks = (query as { readonly queryChunks?: readonly unknown[] }).queryChunks;
  if (chunks === undefined) return '';
  return chunks.map((chunk) => {
    if (typeof chunk === 'string') return chunk;
    if (chunk !== null && typeof chunk === 'object') {
      if ('value' in chunk) {
        const value = (chunk as { readonly value: unknown }).value;
        return Array.isArray(value) ? value.map((part) => (typeof part === 'string' ? part : '?')).join('') : '?';
      }
      return flatText(chunk);
    }
    return '?';
  }).join('');
}

function balancedParens(text: string): boolean {
  let depth = 0;
  for (const char of text) {
    if (char === '(') depth++;
    else if (char === ')') {
      depth--;
      if (depth < 0) return false;
    }
  }
  return depth === 0;
}

function harness() {
  const captured: string[] = [];
  let tables: string[] = [];
  const chain: unknown = new Proxy(() => undefined, {
    get(_target, property: string | symbol) {
      if (property === 'then') {
        return (resolve: (value: unknown) => void) => resolve(
          tables.includes('memberships') || tables.includes('rolePermissions') || tables.includes('permissions')
            ? [{ permission: 'article.read' }]
            : tables.includes('organizations')
              ? [{ id: ORG, name: 'Org' }]
              : [],
        );
      }
      if (property === 'select') tables = [];
      return (...args: readonly unknown[]) => {
        const found: string[] = [];
        for (const arg of args) {
          const text = flatText(arg);
          if (text !== '') captured.push(text);
          try {
            if (arg !== null && typeof arg === 'object') {
              found.push(getTableConfig(arg as never).name);
            }
          } catch {
            /* not a table; ignore */
          }
          if (arg !== null && typeof arg === 'object' && !Array.isArray(arg)) {
            for (const value of Object.values(arg)) {
              try {
                const table = (value as { readonly table?: unknown }).table;
                if (table !== undefined && table !== null && typeof table === 'object') {
                  found.push(getTableConfig(table as never).name);
                }
              } catch {
                /* not a column; ignore */
              }
            }
          }
        }
        tables.push(...found);
        return chain;
      };
    },
    apply() {
      return chain;
    },
  });
  const database = {
    execute: vi.fn(async (query: unknown) => {
      captured.push(flatText(query));
      return [];
    }),
    transaction: async (work: (transaction: unknown) => unknown) => work(chain),
  };
  const repository = new DrizzleDashboardRepository(database as never);
  return { repository, captured };
}

describe('DrizzleDashboardRepository editorial SQL', () => {
  it('menggabungkan predikat bridge dengan paren seimbang', async () => {
    const { repository, captured } = harness();
    await repository.readEditorialScope(ACTOR as never, 'article.read', { publicationState: 'published', sort: 'published-desc' }, { limit: 5 });
    const articleQueries = captured.filter((text) => text.includes('FROM articles a'));
    expect(articleQueries.length).toBeGreaterThan(0);
    for (const text of articleQueries) expect(balancedParens(text)).toBe(true);
    expect(articleQueries.some((text) => text.includes('bridge_article_ids'))).toBe(true);
  });

  it('tanpa filter publikasi tak menyentuh bridge', async () => {
    const { repository, captured } = harness();
    await repository.readEditorialScope(ACTOR as never, 'article.read', { sort: 'updated' }, { limit: 5 });
    expect(captured.some((text) => text.includes('bridge_article_ids'))).toBe(false);
  });
});


describe('canonical editorial taxonomy reads', () => {
  it('filters categories and tags through canonical article relations', async () => {
    const { repository, captured } = harness();
    await repository.readEditorialScope(
      ACTOR as never,
      'article.read',
      { categoryId: 'category-1', tag: 'wonosobo' },
      { limit: 5 },
    );

    expect(captured.some((query) => query.includes('article_categories ac') && query.includes('ac.category_id'))).toBe(true);
    expect(captured.some((query) => query.includes('article_tags at') && query.includes('tag_catalog tc'))).toBe(true);
    expect(captured.some((query) => query.includes('a.tags'))).toBe(false);
    expect(captured.some((query) => query.includes('a.category_id ='))).toBe(false);
  });
});


describe('canonical taxonomy persistence', () => {
  it('writes category and tag assignments through canonical relations, not article projections', () => {
    const source = readFileSync(join(process.cwd(), 'src', 'data', 'repos', 'dashboard.ts'), 'utf8');
    const insertStart = source.indexOf('await transaction.insert(articles).values({');
    const insertEnd = source.indexOf('if (prior === undefined || !sameJson(prior.tags, row.tags))', insertStart);
    const articleWrite = source.slice(insertStart, insertEnd);

    expect(source).toContain('indicate_private.replace_article_tags');
    expect(source).toContain('INSERT INTO article_categories');
    expect(articleWrite).not.toContain('categoryId: row.categoryId');
    expect(articleWrite).not.toContain('tags: [...row.tags]');
  });
});

describe('Skema taksonomi artikel kanonis', () => {
  it('tidak lagi memodelkan proyeksi kategori dan tag legacy pada articles', () => {
    const columns = getTableConfig(articles).columns.map((column) => column.name);
    expect(columns).not.toContain('category_id');
    expect(columns).not.toContain('tags');
  });
});
