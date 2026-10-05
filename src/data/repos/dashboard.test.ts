import { describe, expect, it } from 'vitest';

import type { ArticleRecord } from '@/modules/dashboard/models';
import { articleUnchanged, findBridgeAncestorHostnames, insertChunks, sameJson } from '@/data/repos/dashboard';

describe('Pemotongan sisipan massal', () => {
  it('tidak menghasilkan pernyataan untuk koleksi kosong', () => {
    expect([...insertChunks([])]).toEqual([]);
  });

  it('mempertahankan seluruh baris dan urutannya', () => {
    const rows = Array.from({ length: 134 }, (slot, index) => ({ id: `a-${index}` }));
    const flat = [...insertChunks(rows)].flat();
    expect(flat).toHaveLength(134);
    expect(flat.map((row) => row.id)).toEqual(rows.map((row) => row.id));
  });

  it('memecah menjadi beberapa pernyataan untuk koleksi besar', () => {
    const rows = Array.from({ length: 250 }, (slot, index) => ({ id: `a-${index}` }));
    const chunks = [...insertChunks(rows)];
    expect(chunks.length).toBe(2);
    expect(chunks[0]).toHaveLength(200);
    expect(chunks[1]).toHaveLength(50);
  });
});

describe('Perbandingan nilai untuk diff tenant', () => {
  it('membandingkan nilai JSON secara struktural', () => {
    expect(sameJson([{ label: 'a', path: '/a' }], [{ label: 'a', path: '/a' }])).toBe(true);
    expect(sameJson([{ label: 'a', path: '/a' }], [{ label: 'b', path: '/a' }])).toBe(false);
    expect(sameJson(null, undefined)).toBe(false);
  });
});

describe('findBridgeAncestorHostnames', () => {
  it('mengembalikan hostname leluhur yang terdeduplikasi', async () => {
    const execute = async () => [
      { hostname: 'wonosobo.portal.example' },
      { hostname: 'portal.example' },
      { hostname: 'portal.example' },
      { hostname: '' },
      { hostname: null },
    ];
    await expect(findBridgeAncestorHostnames(execute, 'org-1', ['s-city'])).resolves.toEqual([
      'wonosobo.portal.example',
      'portal.example',
    ]);
  });

  it('kosong saat tanpa situs atau db gagal', async () => {
    const execute = async () => [{ hostname: 'portal.example' }];
    await expect(findBridgeAncestorHostnames(execute, 'org-1', [])).resolves.toEqual([]);
    const broken = async () => { throw new Error('down'); };
    await expect(findBridgeAncestorHostnames(broken, 'org-1', ['s-city'])).resolves.toEqual([]);
  });
});

describe('Deteksi perubahan artikel', () => {
  const article = (overrides: Partial<ArticleRecord> = {}): ArticleRecord => ({
    id: 'art-1',
    organizationId: 'org-1',
    regionId: null,
    publisherId: null,
    categoryId: null,
    categoryIds: [],
    authorId: null,
    leadMediaId: null,
    coverImageUrl: null,
    slug: 'slug-artikel',
    title: 'Judul',
    excerpt: null,
    canonicalUrl: null,
    body: 'Isi artikel',
    bodyJson: null,
    source: '',
    tags: [],
    status: 'active',
    type: 'standard',
    isSponsored: false,
    videoUrl: null,
    audioUrl: null,
    durationSeconds: null,
    publishedAt: null,
    scheduledAt: null,
    archivedAt: null,
    version: 1,
    createdAt: '2026-10-02T04:45:00.000Z',
    updatedAt: '2026-10-02T04:45:00.000Z',
    ...overrides,
  });

  it('berhenti saat tidak ada kolom yang berubah', () => {
    expect(articleUnchanged(article(), article())).toBe(true);
  });

  it('menangkap draf yang baru dipublikasikan', () => {
    const draft = article({ status: 'active', publishedAt: null });
    const published = article({ status: 'active', publishedAt: '2026-10-02T04:45:21.991Z' });
    expect(articleUnchanged(draft, published)).toBe(false);
    expect(articleUnchanged(published, draft)).toBe(false);
  });

  it('menangkap perubahan waktu publikasi pada artikel yang tayang', () => {
    const first = article({ publishedAt: '2026-10-02T04:45:21.991Z' });
    const corrected = article({ publishedAt: '2026-10-02T05:00:00.000Z' });
    expect(articleUnchanged(first, corrected)).toBe(false);
  });

  it('menangkap perubahan pada kolom lain', () => {
    expect(articleUnchanged(article(), article({ title: 'Judul lain' }))).toBe(false);
    expect(articleUnchanged(article({ tags: ['a'] }), article({ tags: ['a', 'b'] }))).toBe(false);
    expect(articleUnchanged(article({ archivedAt: null }), article({ archivedAt: '2026-10-03T00:00:00.000Z' }))).toBe(false);
  });
});
