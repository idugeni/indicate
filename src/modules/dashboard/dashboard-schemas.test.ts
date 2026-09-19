import { describe, expect, it } from 'vitest';

import {
  articleCreateSchema,
  assignmentSchema,
  invitationCreateSchema,
  membershipSchema,
  roleCreateSchema,
  siteCachePurgeSchema,
  siteSettingsSchema,
} from '@/modules/dashboard/schemas';

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
