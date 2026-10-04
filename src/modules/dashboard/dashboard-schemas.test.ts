import { describe, expect, it } from 'vitest';

import {
  ARTICLE_TITLE_MAX,
  articleCreateSchema,
  articleUpdateCreateSchema,
  articleUpdateDeleteSchema,
  articleUpdateListSchema,
  articleUpdateSchema,
  articleUpdateUpdateSchema,
  assignmentSchema,
  categoryCreateSchema,
  categoryDeleteSchema,
  invitationCreateSchema,
  membershipSchema,
  roleCreateSchema,
  siteCachePurgeSchema,
  siteSettingsSchema,
  tagRemoveSchema,
  tagRenameSchema,
} from '@/modules/dashboard/schemas';
import { SLUG_MAX_LENGTH } from '@/modules/site/slug-allocator';

const ID = '0199a2b3-4c5d-7e8f-9012-3456789abcde';
const HASH = 'a'.repeat(64);

const article = {
  regionId: ID,
  slug: 'berita-utama',
  title: 'Judul Artikel Yang Cukup Panjang',
  body: 'Isi artikel yang cukup panjang untuk lolos validasi minimal satu karakter.',
  source: 'Humas Rutan',
};

describe('roleCreateSchema tier guard', () => {
  it('menolak nama yang meniru tier berbeda', () => {
    expect(roleCreateSchema.safeParse({ name: 'Superadmin', tier: 'user', permissions: [] }).success).toBe(false);
    expect(roleCreateSchema.safeParse({ name: 'Admin', tier: 'user', permissions: [] }).success).toBe(false);
  });

  it('menerima nama tier milik sendiri', () => {
    expect(roleCreateSchema.safeParse({ name: 'Superadmin', tier: 'superadmin', permissions: [] }).success).toBe(true);
    expect(roleCreateSchema.safeParse({ name: 'Redaktur', tier: 'user', permissions: [] }).success).toBe(true);
  });
});

describe('articleCreateSchema', () => {
  it('menolak slug cadangan rute portal', () => {
    expect(articleCreateSchema.safeParse({ ...article, slug: 'articles' }).success).toBe(false);
    expect(articleCreateSchema.safeParse({ ...article, slug: 'dashboard' }).success).toBe(false);
  });

  it('menerima artikel valid dengan default', () => {
    const parsed = articleCreateSchema.safeParse(article);
    expect(parsed.success).toBe(true);
    if (!parsed.success) throw new Error('expected ok');
    expect(parsed.data.status).toBe('draft');
    expect(parsed.data.tags).toEqual([]);
  });

  it('menerima slug kapital dan memaafkan spasi menjadi kebab-case', () => {
    const parsed = articleCreateSchema.safeParse({ ...article, slug: 'Berita Utama Daerah' });
    expect(parsed.success).toBe(true);
    if (!parsed.success) throw new Error('expected ok');
    expect(parsed.data.slug).toBe('berita-utama-daerah');
  });

  it('menolak slug tanpa alfanumerik', () => {
    expect(articleCreateSchema.safeParse({ ...article, slug: '!!!' }).success).toBe(false);
  });

  it('menyamakan batas slug dengan batas judul agar slug memuat judul utuh', () => {
    expect(SLUG_MAX_LENGTH).toBe(ARTICLE_TITLE_MAX);
    const parsed = articleCreateSchema.safeParse({ ...article, slug: 'a'.repeat(ARTICLE_TITLE_MAX + 40) });
    expect(parsed.success).toBe(true);
    if (!parsed.success) throw new Error('expected ok');
    expect(parsed.data.slug).toBe('a'.repeat(ARTICLE_TITLE_MAX));
  });

  it('mempertahankan batas pendek untuk slug kategori dan wilayah', () => {
    expect(categoryCreateSchema.safeParse({ name: 'Politik', slug: 'a'.repeat(100) }).success).toBe(true);
    expect(categoryCreateSchema.safeParse({ name: 'Politik', slug: 'a'.repeat(101) }).success).toBe(false);
  });

  it('mengkanonik tag: lowercase, hyphen, dedupe, buang kosong', () => {
    const parsed = articleCreateSchema.safeParse({
      ...article,
      tags: ['Politik', 'harga emas', 'Q&A', 'politik', '   ', '!!!', 'harga-emas'],
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) throw new Error('expected ok');
    expect(parsed.data.tags).toEqual(['politik', 'harga-emas', 'qa']);
  });

  it('menolak tag non-string dan lebih dari 10 tag unik', () => {
    expect(articleCreateSchema.safeParse({ ...article, tags: ['baik', 42] }).success).toBe(false);
    expect(articleCreateSchema.safeParse({ ...article, tags: Array.from({ length: 11 }, (slot, i) => `topik-${i}`) }).success).toBe(false);
  });

  it('memberi default mode standar dan tanpa sponsor', () => {
    const parsed = articleCreateSchema.safeParse(article);
    expect(parsed.success).toBe(true);
    if (!parsed.success) throw new Error('expected ok');
    expect(parsed.data.type).toBe('standard');
    expect(parsed.data.isSponsored).toBe(false);
  });

  it('mewajibkan URL audio untuk mode audio', () => {
    expect(articleCreateSchema.safeParse({ ...article, type: 'audio' }).success).toBe(false);
    const parsed = articleCreateSchema.safeParse({ ...article, type: 'audio', audioUrl: 'https://cdn.example/rekaman.mp3' });
    expect(parsed.success).toBe(true);
  });

  it('mewajibkan sampul atau URL untuk mode video', () => {
    expect(articleCreateSchema.safeParse({ ...article, type: 'video' }).success).toBe(false);
    expect(articleCreateSchema.safeParse({ ...article, type: 'video', videoUrl: 'https://video.example/tonton' }).success).toBe(true);
  });

  it('membatasi isi mode short sampai 500 karakter', () => {
    expect(articleCreateSchema.safeParse({ ...article, type: 'short', body: 'x'.repeat(501) }).success).toBe(false);
    expect(articleCreateSchema.safeParse({ ...article, type: 'short', body: 'x'.repeat(500) }).success).toBe(true);
  });

  it('menolak URL tanpa skema dan durasi di luar mode video/audio', () => {
    expect(articleCreateSchema.safeParse({ ...article, type: 'video', videoUrl: 'tanpa-skema' }).success).toBe(false);
    expect(articleCreateSchema.safeParse({ ...article, type: 'standard', durationSeconds: 120 }).success).toBe(false);
    expect(articleCreateSchema.safeParse({ ...article, type: 'audio', audioUrl: 'https://cdn.example/a.mp3', durationSeconds: 120 }).success).toBe(true);
  });

  it('memvalidasi daftar, tambah, ubah, dan hapus entri liveblog', () => {
    expect(articleUpdateListSchema.safeParse({ articleId: ID }).success).toBe(true);
    expect(articleUpdateListSchema.safeParse({ articleId: 'bukan-uuid' }).success).toBe(false);
    expect(articleUpdateCreateSchema.safeParse({ articleId: ID, body: 'Gol pembuka.' }).success).toBe(true);
    expect(articleUpdateCreateSchema.safeParse({ articleId: ID, body: '   ' }).success).toBe(false);
    expect(articleUpdateCreateSchema.safeParse({ articleId: ID, body: 'x'.repeat(20001) }).success).toBe(false);
    expect(articleUpdateUpdateSchema.safeParse({ id: ID, expectedVersion: 1, body: 'Gol revisi.' }).success).toBe(true);
    expect(articleUpdateUpdateSchema.safeParse({ id: ID, expectedVersion: 0, body: 'Gol revisi.' }).success).toBe(false);
    expect(articleUpdateDeleteSchema.safeParse({ id: ID, expectedVersion: 1 }).success).toBe(true);
  });

  it('menjaga mode pada update sebagai opsional tanpa reset standar', () => {
    const parsed = articleUpdateSchema.safeParse({ id: ID, expectedVersion: 1, regionId: ID, slug: 'x', title: 'T', status: 'draft' });
    expect(parsed.success).toBe(true);
    if (!parsed.success) throw new Error('expected ok');
    expect(parsed.data.type).toBeUndefined();
  });
});

describe('categoryCreateSchema', () => {
  it('menerima nama bebas dan mengkanonik slug kapital berspasi', () => {
    const parsed = categoryCreateSchema.safeParse({ name: 'Politik & Ekonomi', slug: 'Politik & Ekonomi' });
    expect(parsed.success).toBe(true);
    if (!parsed.success) throw new Error('expected ok');
    expect(parsed.data.slug).toBe('politik-ekonomi');
    expect(parsed.data.name).toBe('Politik & Ekonomi');
  });
});

describe('taxonomy mutation schemas', () => {
  it('mewajibkan id dan versi pada hapus kategori', () => {
    expect(categoryDeleteSchema.safeParse({ id: ID, expectedVersion: 1 }).success).toBe(true);
    expect(categoryDeleteSchema.safeParse({ id: ID }).success).toBe(false);
  });

  it('mengkanonik tag dan menolak asal-tujuan sama', () => {
    const parsed = tagRenameSchema.safeParse({ from: 'Harga Emas', to: 'Logam Mulia' });
    expect(parsed.success).toBe(true);
    if (!parsed.success) throw new Error('expected ok');
    expect(parsed.data).toEqual({ from: 'harga-emas', to: 'logam-mulia' });
    expect(tagRenameSchema.safeParse({ from: 'politik', to: 'Politik' }).success).toBe(false);
    expect(tagRenameSchema.safeParse({ from: '!!!', to: 'politik' }).success).toBe(false);
  });

  it('mengkanonik tag hapus dan menolak kosong', () => {
    const parsed = tagRemoveSchema.safeParse({ tag: 'Harga Emas' });
    expect(parsed.success).toBe(true);
    if (!parsed.success) throw new Error('expected ok');
    expect(parsed.data).toEqual({ tag: 'harga-emas' });
    expect(tagRemoveSchema.safeParse({ tag: '   ' }).success).toBe(false);
  });
});

describe('membership and invitation schemas', () => {
  it('memberi default status dan region null', () => {
    const parsed = membershipSchema.safeParse({ userId: ID, roleId: ID });
    expect(parsed.success).toBe(true);
    if (!parsed.success) throw new Error('expected ok');
    expect(parsed.data.status).toBe('active');
    expect(parsed.data.regionId).toBe(null);
  });

  it('mewajibkan tokenHash 64 karakter', () => {
    expect(invitationCreateSchema.safeParse({ email: 'a@example.test', roleId: ID, tokenHash: HASH }).success).toBe(true);
    expect(invitationCreateSchema.safeParse({ email: 'a@example.test', roleId: ID, tokenHash: 'pendek' }).success).toBe(false);
  });

  it('membatasi assignment dan purge massal', () => {
    expect(assignmentSchema.safeParse({ articleId: ID, siteIds: [] }).success).toBe(true);
    expect(siteCachePurgeSchema.safeParse({ siteId: ID, confirmBulk: true }).success).toBe(true);
    expect(siteCachePurgeSchema.safeParse({ siteId: ID, confirmBulk: false }).success).toBe(false);
  });
});

describe('siteSettingsSchema', () => {
  const settings = {
    siteId: ID,
    name: 'Portal Fakta',
    description: 'Deskripsi portal fakta yang cukup informatif.',
  };

  it('menerima pengaturan minimal', () => {
    expect(siteSettingsSchema.safeParse(settings).success).toBe(true);
  });

  it('menolak path navigasi tanpa garis miring', () => {
    expect(siteSettingsSchema.safeParse({ ...settings, navigation: [{ label: 'X', path: 'tanpa-slash' }] }).success).toBe(false);
    expect(siteSettingsSchema.safeParse({ ...settings, navigation: [{ label: 'X', path: '/dengan-slash' }] }).success).toBe(true);
  });

  it('menolak templateId tak dikenal', () => {
    expect(siteSettingsSchema.safeParse({ ...settings, colors: { templateId: 'tidak-ada' } }).success).toBe(false);
  });

  it('menolak colors tanpa templateId', () => {
    expect(siteSettingsSchema.safeParse({ ...settings, colors: { aksen: '#ffffff' } }).success).toBe(false);
  });
});
