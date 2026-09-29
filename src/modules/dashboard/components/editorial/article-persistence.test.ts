import { describe, expect, it } from 'vitest';

import {
  buildArticlePayload,
  buildAutosavePayload,
  persistDraftArticle,
  type ArticleFormSnapshot,
} from '@/modules/dashboard/components/editorial/article-persistence';

const SNAPSHOT: ArticleFormSnapshot = {
  slug: 'judul-uji',
  titleText: 'Judul Uji',
  descriptionText: 'Inti berita.',
  bodyText: 'Isi berita lengkap.',
  bodyJson: null,
  source: 'Rilis Resmi',
  canonicalUrl: 'https://sumber.example/rilis',
  coverUrl: '',
  tags: ['Wonosobo', 'APBD'],
  status: 'draft',
  rawSchedule: '',
  provinceId: 'r-1',
  cityId: null,
  publisherId: null,
  authorId: 'a-1',
  categoryIds: ['c-1'],
  leadMediaId: null,
};

describe('buildArticlePayload', () => {
  it('menerjemahkan state form menjadi payload server', () => {
    const payload = buildArticlePayload(SNAPSHOT, ['c-1', 'c-2']);
    expect(payload).toMatchObject({
      regionId: 'r-1',
      categoryIds: ['c-1', 'c-2'],
      slug: 'judul-uji',
      title: 'Judul Uji',
      excerpt: 'Inti berita.',
      canonicalUrl: 'https://sumber.example/rilis',
      body: 'Isi berita lengkap.',
      source: 'Rilis Resmi',
      tags: ['wonosobo', 'apbd'],
      status: 'draft',
      scheduledAt: null,
    });
  });

  it('mengganti-naikkan kosong menjadi undefined dan source jadi string kosong', () => {
    const payload = buildArticlePayload(
      { ...SNAPSHOT, descriptionText: '   ', canonicalUrl: '', source: '  ' },
      [],
    );
    expect(payload.excerpt).toBeUndefined();
    expect(payload.canonicalUrl).toBeUndefined();
    expect(payload.source).toBe('');
  });

  it('memakai kota sebagai wilayah bila kota dipilih', () => {
    expect(buildArticlePayload({ ...SNAPSHOT, cityId: 'r-2' }, []).regionId).toBe('r-2');
  });

  it('membuang jadwal saat status bukan terjadwal', () => {
    const payload = buildArticlePayload({ ...SNAPSHOT, status: 'active', rawSchedule: '2026-10-01T07:00' }, []);
    expect(payload.scheduledAt).toBeNull();
  });
});

describe('buildAutosavePayload', () => {
  it('menolak form yang belum cukup lengkap', () => {
    expect(buildAutosavePayload({ ...SNAPSHOT, provinceId: null, cityId: null }, [])).toBeNull();
    expect(buildAutosavePayload({ ...SNAPSHOT, titleText: '  ' }, [])).toBeNull();
    expect(buildAutosavePayload({ ...SNAPSHOT, bodyText: '' }, [])).toBeNull();
    expect(buildAutosavePayload({ ...SNAPSHOT, slug: '' }, [])).toBeNull();
    expect(buildAutosavePayload({ ...SNAPSHOT, slug: 'Judul Ada Spasi' }, [])).toBeNull();
  });

  it('memaksa status draft dan mengosongkan jadwal walau form meminta terbit', () => {
    const payload = buildAutosavePayload(
      { ...SNAPSHOT, status: 'active', rawSchedule: '2026-10-01T07:00' },
      ['c-1'],
    );
    expect(payload).toMatchObject({ status: 'draft', scheduledAt: null });
  });

  it('hanya memakai kategori yang sudah ada di server', () => {
    const payload = buildAutosavePayload(SNAPSHOT, ['c-1']);
    expect(payload?.categoryIds).toEqual(['c-1']);
  });
});

describe('persistDraftArticle', () => {
  const record = { id: 'art-1', slug: 'judul-uji', version: 3 };

  it('membuat draft baru lewat article.create saat belum ada draft', async () => {
    const calls: { action: string; payload: unknown }[] = [];
    const command = async (action: string, payload: unknown) => {
      calls.push({ action, payload });
      return record;
    };
    const saved = await persistDraftArticle(command, { title: 'Judul' }, null);
    expect(calls[0]?.action).toBe('article.create');
    expect(saved).toEqual({ id: 'art-1', slug: 'judul-uji', version: 3 });
  });

  it('memperbarui draft yang sama lewat article.update dengan expectedVersion', async () => {
    const calls: { action: string; payload: unknown }[] = [];
    const command = async (action: string, payload: unknown) => {
      calls.push({ action, payload });
      return { ...record, version: 4 };
    };
    const saved = await persistDraftArticle(command, { title: 'Judul' }, { id: 'art-1', version: 3, slug: 'judul-uji' });
    expect(calls[0]?.action).toBe('article.update');
    expect(calls[0]?.payload).toMatchObject({ id: 'art-1', expectedVersion: 3 });
    expect(saved?.version).toBe(4);
  });

  it('mengembalikan null saat perintah gagal atau terputus organisasi', async () => {
    expect(await persistDraftArticle(async () => null, {}, null)).toBeNull();
    expect(await persistDraftArticle(async () => { throw new Error('jaringan'); }, {}, null)).toBeNull();
  });
});
