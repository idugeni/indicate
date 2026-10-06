import { describe, expect, it, vi } from 'vitest';
import { getTableConfig } from 'drizzle-orm/pg-core';

import { DrizzleDashboardRepository } from '@/data/repos/dashboard';

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
