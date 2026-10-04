import { describe, expect, it, vi } from 'vitest';

import { TenantBusinessService } from '@/modules/dashboard/tenant-business-service';

const ID = '0199a2b3-4c5d-7e8f-9012-3456789abcde';
const ID2 = '0199a2b3-4c5d-7e8f-9012-3456789abcdf';
const NOW = new Date('2026-09-18T14:00:00.000Z');

const actor = {
  actorType: 'user',
  actorId: 'user-1',
  organizationId: 'org-1',
  permissionSet: new Set<string>(),
  entryPoint: 'dashboard',
  requestId: 'req-1',
  verifiedAuthUserId: 'auth-1',
} as const;

const COLLECTIONS = [
  'domains',
  'regions',
  'sites',
  'siteSettings',
  'roles',
  'memberships',
  'publishers',
  'affiliations',
  'categories',
  'authors',
  'articles',
  'articleCategories',
  'articleSites',
  'media',
] as const;

function stateWith(overrides: Record<string, readonly unknown[]> = {}): Record<string, unknown> {
  const state: Record<string, unknown> = { organizationId: 'org-1' };
  for (const key of COLLECTIONS) state[key] = [...(overrides[key] ?? [])];
  return state;
}

function harness(collections: Record<string, readonly unknown[]> = {}) {
  const state = stateWith(collections);
  const appendAudit = vi.fn();
  const repository = {
    readTaxonomyScope: vi.fn(async () => ({
      articles: (state.articles as readonly Record<string, unknown>[]).map((article) => ({
        id: article.id,
        organizationId: article.organizationId,
        regionId: (article.regionId ?? null) as string | null,
        categoryId: (article.categoryId ?? null) as string | null,
        categoryIds: [...((article.categoryIds ?? []) as readonly string[])],
        tags: [...((article.tags ?? []) as readonly string[])],
      })),
      categories: state.categories,
      regions: (state.regions as readonly Record<string, unknown>[]).map((region) => ({
        id: region.id,
        kind: (region.kind ?? 'region') as 'region' | 'city',
        parentRegionId: (region.parentRegionId ?? null) as string | null,
      })),
    })),
    execute: vi.fn(async (actor: unknown, permission: unknown, operation: unknown) => {
      const op = operation as (transaction: unknown) => unknown;
      return op({ state, resolveUserDisplayName: async () => 'Operator', appendAudit, refreshArticleContent: async () => false, articleContentTouched: new Set<string>() });
    }),
    recordDenied: vi.fn(async () => undefined),
    enqueueCachePurge: vi.fn(async () => []),
  };
  const service = new TenantBusinessService(repository as never, { create: () => ID }, { now: () => NOW });
  return { repository, service, state, appendAudit };
}

const category = (overrides: Record<string, unknown> = {}) => ({
  id: ID,
  organizationId: 'org-1',
  name: 'Politik',
  slug: 'politik',
  status: 'active',
  version: 1,
  createdAt: NOW.toISOString(),
  updatedAt: NOW.toISOString(),
  ...overrides,
});

const article = (overrides: Record<string, unknown> = {}) => ({
  id: ID2,
  organizationId: 'org-1',
  regionId: 'region-1',
  publisherId: null,
  categoryId: ID,
  categoryIds: [ID],
  authorId: null,
  leadMediaId: null,
  coverImageUrl: null,
  slug: 'judul-a',
  title: 'Judul A',
  excerpt: null,
  canonicalUrl: null,
  body: 'Isi artikel yang cukup panjang untuk lolos validasi.',
  bodyJson: null,
  source: 'Humas',
  tags: ['harga-emas', 'politik'],
  status: 'draft',
  publishedAt: null,
  scheduledAt: null,
  archivedAt: null,
  version: 1,
  createdAt: NOW.toISOString(),
  updatedAt: NOW.toISOString(),
  ...overrides,
});

describe('TenantBusinessService taxonomy', () => {
  it('menghapus kategori dan melepas artikel terkait', async () => {
    const { service, state, appendAudit } = harness({
      categories: [category()],
      articles: [article()],
      articleCategories: [{ articleId: ID2, categoryId: ID, position: 1 }],
    });
    const result = await service.deleteCategory(actor, { id: ID, expectedVersion: 1 });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.value).toEqual({ id: ID, detached: 1 });
    expect(state.categories as unknown[]).toHaveLength(0);
    const kept = (state.articles as Record<string, unknown>[])[0]!;
    expect(kept.categoryIds).toEqual([]);
    expect(kept.categoryId).toBe(null);
    expect(kept.version).toBe(2);
    expect(state.articleCategories as unknown[]).toHaveLength(0);
    expect(appendAudit).toHaveBeenCalledTimes(2);
  });

  it('menolak hapus kategori versi basi sebagai conflict', async () => {
    const { service } = harness({ categories: [category()] });
    const result = await service.deleteCategory(actor, { id: ID, expectedVersion: 2 });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('CONFLICT');
  });

  it('menolak hapus kategori tak dikenal tanpa bocor', async () => {
    const { service } = harness({ categories: [category()] });
    const result = await service.deleteCategory(actor, { id: ID2, expectedVersion: 1 });
    expect(result.ok).toBe(false);
  });

  it('mengubah nama tag dan menggabung duplikat', async () => {
    const { service, state } = harness({
      articles: [article({ tags: ['harga-emas', 'logam-mulia'] }), article({ id: 'a-2', tags: ['harga-emas'] })],
    });
    const result = await service.renameTag(actor, { from: 'Harga Emas', to: 'logam-mulia' });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.value).toEqual({ from: 'harga-emas', to: 'logam-mulia', affected: 2 });
    const rows = state.articles as Array<Record<string, unknown>>;
    expect(rows.map((row) => row.tags)).toEqual([['logam-mulia'], ['logam-mulia']]);
  });

  it('menolak ubah nama tag yang sama sebagai input invalid', async () => {
    const { service } = harness({ articles: [article()] });
    const result = await service.renameTag(actor, { from: 'politik', to: 'Politik' });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('INVALID_INPUT');
  });

  it('menghapus tag dari semua artikel', async () => {
    const { service, state } = harness({
      articles: [article(), article({ id: 'a-2', tags: ['ekonomi'] })],
    });
    const result = await service.removeTag(actor, { tag: 'politik' });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.value).toEqual({ tag: 'politik', affected: 1 });
    const rows = state.articles as Array<Record<string, unknown>>;
    expect(rows.map((row) => row.tags)).toEqual([['harga-emas'], ['ekonomi']]);
  });

  it('mendaftar kategori beserta hitungan dan tag terurut', async () => {
    const { service } = harness({
      categories: [category(), category({ id: ID2, name: 'Ekonomi', slug: 'ekonomi' })],
      articles: [article(), article({ id: 'a-2', categoryId: ID2, categoryIds: [ID2], tags: ['ekonomi', 'politik'] })],
    });
    const result = await service.listTaxonomy(actor);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.value.categories).toEqual([
      expect.objectContaining({ id: ID, articleCount: 1 }),
      expect.objectContaining({ id: ID2, articleCount: 1 }),
    ]);
    expect(result.value.tags).toEqual([
      { tag: 'politik', count: 2 },
      { tag: 'ekonomi', count: 1 },
      { tag: 'harga-emas', count: 1 },
    ]);
  });
});

describe('TenantBusinessService category cache invalidation', () => {
  function harnessWithInvalidator(
    collections: Record<string, readonly unknown[]> = {},
    invalidator: { revalidateTags: (tags: readonly string[]) => Promise<void> } | null = null,
  ) {
    const state = stateWith(collections);
    const appendAudit = vi.fn();
    const repository = {
      readTaxonomyScope: vi.fn(async () => ({ articles: [], categories: [], regions: [] })),
      execute: vi.fn(async (actor: unknown, permission: unknown, operation: unknown) => {
        const op = operation as (transaction: unknown) => unknown;
        return op({ state, resolveUserDisplayName: async () => 'Operator', appendAudit, refreshArticleContent: async () => false, articleContentTouched: new Set<string>() });
      }),
      recordDenied: vi.fn(async () => undefined),
      enqueueCachePurge: vi.fn(async () => []),
    };
    const service = new TenantBusinessService(
      repository as never,
      { create: () => ID },
      { now: () => NOW },
      null,
      invalidator,
    );
    return { service, state };
  }

  it('merevalidasi tag org saat kategori dibuat', async () => {
    const revalidateTags = vi.fn(async () => undefined);
    const { service } = harnessWithInvalidator({}, { revalidateTags });
    const result = await service.createCategory(actor, { name: 'Ekonomi', slug: 'ekonomi', status: 'active' });
    expect(result.ok).toBe(true);
    expect(revalidateTags).toHaveBeenCalledTimes(1);
    expect(revalidateTags).toHaveBeenCalledWith(['org:org-1']);
  });

  it('merevalidasi tag org saat kategori diubah dan dihapus', async () => {
    const revalidateTags = vi.fn(async () => undefined);
    const { service } = harnessWithInvalidator({ categories: [category()] }, { revalidateTags });
    const updated = await service.updateCategory(actor, { id: ID, name: 'Politik Baru', slug: 'politik', status: 'active', expectedVersion: 1 });
    expect(updated.ok).toBe(true);
    const deleted = await service.deleteCategory(actor, { id: ID, expectedVersion: 2 });
    expect(deleted.ok).toBe(true);
    expect(revalidateTags).toHaveBeenCalledTimes(2);
    expect(revalidateTags).toHaveBeenCalledWith(['org:org-1']);
  });

  it('tidak menyentuh cache saat mutasi non-kategori', async () => {
    const revalidateTags = vi.fn(async () => undefined);
    const { service } = harnessWithInvalidator({ articles: [article()] }, { revalidateTags });
    const result = await service.renameTag(actor, { from: 'Harga Emas', to: 'logam-mulia' });
    expect(result.ok).toBe(true);
    expect(revalidateTags).not.toHaveBeenCalled();
  });

  it('mutasi tetap berhasil saat revalidasi gagal', async () => {
    const warn = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const revalidateTags = vi.fn(async (): Promise<void> => { throw new Error('tag store down'); });
      const { service, state } = harnessWithInvalidator({}, { revalidateTags });
      const result = await service.createCategory(actor, { name: 'Ekonomi', slug: 'ekonomi', status: 'active' });
      expect(result.ok).toBe(true);
      expect(state.categories as unknown[]).toHaveLength(1);
    } finally {
      warn.mockRestore();
    }
  });

  it('mutasi kategori tetap jalan tanpa invalidator', async () => {
    const { service, state } = harnessWithInvalidator({});
    const result = await service.createCategory(actor, { name: 'Ekonomi', slug: 'ekonomi', status: 'active' });
    expect(result.ok).toBe(true);
    expect(state.categories as unknown[]).toHaveLength(1);
  });
});
