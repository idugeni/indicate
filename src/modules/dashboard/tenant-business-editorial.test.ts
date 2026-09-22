import { describe, expect, it, vi } from 'vitest';

import { TenantBusinessService } from '@/modules/dashboard/tenant-business-service';

const ID = '0199a2b3-4c5d-7e8f-9012-3456789abcde';
const ID2 = '0199a2b3-4c5d-7e8f-9012-3456789abcdf';
const CAT1 = '0199a2b3-4c5d-7e8f-9012-3456789abce0';
const CAT2 = '0199a2b3-4c5d-7e8f-9012-3456789abce1';
const CAT3 = '0199a2b3-4c5d-7e8f-9012-3456789abce2';
const MED1 = '0199a2b3-4c5d-7e8f-9012-3456789abce3';
const MED2 = '0199a2b3-4c5d-7e8f-9012-3456789abce4';
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
  'domains', 'regions', 'sites', 'siteSettings', 'roles', 'memberships', 'telegramMappings',
  'publishers', 'affiliations', 'categories', 'authors', 'articles', 'articleCategories', 'articleSites', 'media',
] as const;

function harness(collections: Record<string, readonly unknown[]> = {}) {
  const state: Record<string, unknown> = { organizationId: 'org-1' };
  for (const key of COLLECTIONS) state[key] = [...(collections[key] ?? [])];
  const appendAudit = vi.fn();
  const repository = {
    execute: vi.fn(async (_actor: unknown, _permission: unknown, operation: unknown) => {
      const op = operation as (transaction: unknown) => unknown;
      return op({ state, resolveUserDisplayName: async () => 'Operator', appendAudit });
    }),
    recordDenied: vi.fn(async () => undefined),
  };
  const service = new TenantBusinessService(repository as never, { create: () => ID }, { now: () => NOW });
  return { service, state, appendAudit };
}

const publisherInput = {
  name: 'Humas Rutan',
  type: 'government_institution',
  attributionLabel: 'Humas Rutan Wonosobo',
} as const;

const verifiedPublisher = {
  id: ID,
  organizationId: 'org-1',
  name: 'Humas Rutan',
  type: 'government_institution',
  attributionLabel: 'Humas Rutan Wonosobo',
  contacts: {},
  evidenceReference: 'sk-1',
  verificationStatus: 'verified',
  submittedBy: null,
  submittedAt: null,
  verifiedBy: 'user-1',
  verifiedAt: NOW.toISOString(),
  rejectionReason: null,
  status: 'active',
  version: 1,
};

describe('TenantBusinessService publishers', () => {
  it('membuat publisher unverified', async () => {
    const { service, state } = harness();
    const result = await service.createPublisher(actor, publisherInput);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.value.verificationStatus).toBe('unverified');
    expect((state.publishers as unknown[])).toHaveLength(1);
  });

  it('mereset verifikasi saat identitas berubah', async () => {
    const { service } = harness({ publishers: [verifiedPublisher] });
    const result = await service.updatePublisher(actor, { ...publisherInput, id: ID, expectedVersion: 1, name: 'Humas Baru' });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.value.verificationStatus).toBe('unverified');
    expect(result.value.verifiedBy).toBe(null);
  });

  it('mewajibkan bukti saat submit dan alasan saat reject', async () => {
    const draft = { ...verifiedPublisher, verificationStatus: 'unverified', evidenceReference: null };
    const noEvidence = harness({ publishers: [draft] });
    const refused = await noEvidence.service.submitPublisher(actor, { id: ID, expectedVersion: 1 });
    expect(refused.ok).toBe(false);
    if (refused.ok) throw new Error('expected error');
    expect(refused.error.error.code).toBe('INVALID_INPUT');

    const submitted = await noEvidence.service.submitPublisher(actor, { id: ID, expectedVersion: 1, evidenceReference: 'sk-2' });
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) throw new Error('expected ok');
    expect(submitted.value.verificationStatus).toBe('pending');

    const noReason = await noEvidence.service.rejectPublisher(actor, { id: ID, expectedVersion: 2 });
    expect(noReason.ok).toBe(false);
  });

  it('menolak approve dari aktor terkunci region dan mengarsipkan', async () => {
    const locked = harness({ publishers: [{ ...verifiedPublisher, verificationStatus: 'pending' }] });
    const denied = await locked.service.approvePublisher({ ...actor, regionScopeId: 'region-1' }, { id: ID, expectedVersion: 1, evidenceReference: 'sk-1' });
    expect(denied.ok).toBe(false);
    if (denied.ok) throw new Error('expected error');
    expect(denied.error.error.code).toBe('RESOURCE_UNAVAILABLE');

    const archived = await locked.service.archivePublisher(actor, { id: ID, expectedVersion: 1 });
    expect(archived.ok).toBe(true);
    if (!archived.ok) throw new Error('expected ok');
    expect(archived.value.status).toBe('archived');
  });

  it('menolak nama penerbit yang menyerupai domain tenant', async () => {
    const { service } = harness({
      domains: [{ id: ID2, normalizedHostname: 'fakta01.my.id' }],
      sites: [{ id: ID2, organizationId: 'org-1', domainId: ID2, normalizedHostname: 'wonosobo.fakta01.my.id', status: 'active' }],
    });
    for (const name of ['Fakta01', 'fakta01.my.id', 'WONOSOBO.FAKTA01.MY.ID']) {
      const refused = await service.createPublisher(actor, { ...publisherInput, name });
      expect(refused.ok).toBe(false);
      if (refused.ok) throw new Error(`expected error for ${name}`);
      expect(refused.error.error.code).toBe('INVALID_INPUT');
    }
    const allowed = await service.createPublisher(actor, { ...publisherInput, name: 'Humas Fakta01' });
    expect(allowed.ok).toBe(true);
  });

  it('mengizinkan sunting non-nama pada baris lama bernama domain', async () => {
    const legacy = { ...verifiedPublisher, name: 'Fakta01' };
    const { service } = harness({
      domains: [{ id: ID2, normalizedHostname: 'fakta01.my.id' }],
      sites: [{ id: ID2, organizationId: 'org-1', domainId: ID2, normalizedHostname: 'wonosobo.fakta01.my.id', status: 'active' }],
      publishers: [legacy],
    });
    const kept = await service.updatePublisher(actor, { ...publisherInput, id: ID, expectedVersion: 1, name: 'Fakta01', attributionLabel: 'Redaksi Baru' });
    expect(kept.ok).toBe(true);
    const renamed = await service.updatePublisher(actor, { ...publisherInput, id: ID, expectedVersion: 1, name: 'fakta01.my.id' });
    expect(renamed.ok).toBe(false);
  });
});

describe('TenantBusinessService affiliations memberships articles', () => {
  it('menolak afiliasi untuk publisher belum terverifikasi', async () => {
    const { service } = harness({
      publishers: [{ ...verifiedPublisher, verificationStatus: 'pending' }],
      sites: [{ id: ID2, organizationId: 'org-1', regionId: null }],
    });
    const result = await service.createAffiliation(actor, {
      publisherId: ID,
      siteId: ID2,
      institutionName: 'Rutan',
      claimScopes: ['kegiatan'],
      evidenceReference: 'sk-1',
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('RESOURCE_UNAVAILABLE');
  });

  it('menyimpan membership dan menonaktifkan mapping divergen', async () => {
    const { service, state } = harness({
      roles: [{ id: ID2 }],
      regions: [],
      memberships: [],
      telegramMappings: [{ userId: ID, roleId: 'role-lama', status: 'active', regionId: null }],
    });
    const result = await service.saveMembership(actor, { userId: ID, roleId: ID2, status: 'active' });
    expect(result.ok).toBe(true);
    expect((state.telegramMappings as { status: string }[])[0]?.status).toBe('inactive');
  });

  it('membuat artikel dengan slug unik', async () => {
    const { service } = harness({
      regions: [{ id: ID2, status: 'active' }],
      articles: [{ slug: 'berita-utama' }],
    });
    const result = await service.createArticle(actor, {
      regionId: ID2,
      slug: 'berita-utama',
      title: 'Judul Artikel Yang Cukup Panjang',
      body: 'Isi artikel yang cukup panjang untuk lolos validasi.',
      source: 'Humas',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.value.slug).toBe('berita-utama-2');
  });

  it('memberi kabar grup saat artikel dibuat', async () => {
    const notifyArticleCreated = vi.fn(async () => undefined);
    const state: Record<string, unknown> = { organizationId: 'org-1', regions: [{ id: ID2, status: 'active' }], articles: [] as unknown[] };
    for (const key of COLLECTIONS) state[key] ??= [];
    const repository = {
      execute: vi.fn(async (_actor: unknown, _permission: unknown, operation: unknown) => {
        const op = operation as (transaction: unknown) => unknown;
        return op({ state, resolveUserDisplayName: async () => 'Operator', appendAudit: vi.fn() });
      }),
      recordDenied: vi.fn(async () => undefined),
    };
    const service = new TenantBusinessService(repository as never, { create: () => ID }, { now: () => NOW }, { notifyArticleCreated });
    const result = await service.createArticle(actor, {
      regionId: ID2,
      slug: 'berita-baru',
      title: 'Judul Artikel Yang Cukup Panjang',
      body: 'Isi artikel yang cukup panjang untuk lolos validasi.',
      source: 'Humas',
    });
    expect(result.ok).toBe(true);
    expect(notifyArticleCreated).toHaveBeenCalledTimes(1);
    expect(notifyArticleCreated).toHaveBeenCalledWith({ organizationId: 'org-1', articleId: ID, title: 'Judul Artikel Yang Cukup Panjang' });
  });

  it('menolak update slug duplikat', async () => {
    const article = { id: ID, organizationId: 'org-1', regionId: ID2, slug: 'lama', title: 'T', body: 'B', source: 'S', tags: [], status: 'draft', version: 1, publisherId: null, categoryId: null, authorId: null };
    const { service } = harness({
      regions: [{ id: ID2, status: 'active' }],
      articles: [article, { ...article, id: ID2, slug: 'terpakai' }],
    });
    const result = await service.updateArticle(actor, {
      id: ID,
      expectedVersion: 1,
      regionId: ID2,
      publisherId: null,
      categoryId: null,
      authorId: null,
      slug: 'terpakai',
      title: 'Judul Baru Yang Cukup Panjang',
      body: 'Isi baru yang cukup panjang untuk lolos validasi.',
      source: 'Humas',
      tags: [],
      status: 'draft',
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('CONFLICT');
  });

  it('membuat artikel dengan multi-kategori dan sampul', async () => {
    const { service, state } = harness({
      regions: [{ id: ID2, status: 'active' }],
      categories: [
        { id: CAT1, status: 'active' },
        { id: CAT2, status: 'active' },
      ],
      media: [{ id: MED1, organizationId: 'org-1', state: 'active' }],
      articles: [],
    });
    const result = await service.createArticle(actor, {
      regionId: ID2,
      slug: 'berita-multi',
      title: 'Judul Artikel Yang Cukup Panjang',
      body: 'Isi artikel yang cukup panjang untuk lolos validasi.',
      source: 'Humas',
      categoryIds: [CAT1, CAT2, CAT1],
      leadMediaId: MED1,
      coverImageUrl: 'https://sumber.example/sampul.jpg',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.value.categoryId).toBe(CAT1);
    expect(result.value.categoryIds).toEqual([CAT1, CAT2]);
    expect(result.value.leadMediaId).toBe(MED1);
    expect((state.articleCategories as { articleId: string; categoryId: string; position: number }[])).toEqual([
      { articleId: ID, categoryId: CAT1, position: 1 },
      { articleId: ID, categoryId: CAT2, position: 2 },
    ]);
  });

  it('menolak kategori dan media tak aktif saat buat artikel', async () => {
    const { service } = harness({
      regions: [{ id: ID2, status: 'active' }],
      categories: [{ id: CAT3, status: 'archived' }],
      media: [{ id: MED2, organizationId: 'org-1', state: 'rejected' }],
      articles: [],
    });
    const badCategory = await service.createArticle(actor, {
      regionId: ID2, slug: 'tolak-kategori', title: 'Judul Artikel Yang Cukup Panjang',
      body: 'Isi artikel yang cukup panjang untuk lolos validasi.', source: 'Humas', categoryIds: [CAT3],
    });
    expect(badCategory.ok).toBe(false);
    const badMedia = await service.createArticle(actor, {
      regionId: ID2, slug: 'tolak-media', title: 'Judul Artikel Yang Cukup Panjang',
      body: 'Isi artikel yang cukup panjang untuk lolos validasi.', source: 'Humas', leadMediaId: MED2,
    });
    expect(badMedia.ok).toBe(false);
  });

  it('mempertahankan kategori lama saat update lawas tanpa categoryIds', async () => {
    const article = { id: ID, organizationId: 'org-1', regionId: ID2, slug: 'lama', title: 'T', body: 'B', source: 'S', tags: [], status: 'draft', version: 1, publisherId: null, categoryId: CAT1, authorId: null, leadMediaId: null, coverImageUrl: null };
    const { service, state } = harness({
      regions: [{ id: ID2, status: 'active' }],
      categories: [{ id: CAT1, status: 'active' }],
      articles: [article],
      articleCategories: [{ articleId: ID, categoryId: CAT1, position: 1 }],
    });
    const result = await service.updateArticle(actor, {
      id: ID, expectedVersion: 1, regionId: ID2, publisherId: null, categoryId: CAT1,
      authorId: null, slug: 'lama', title: 'Judul Baru Yang Cukup Panjang',
      body: 'Isi baru yang cukup panjang untuk lolos validasi.', source: 'Humas', tags: [], status: 'draft',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.value.categoryIds).toEqual([CAT1]);
    expect((state.articleCategories as { categoryId: string }[]).map((row) => row.categoryId)).toEqual([CAT1]);
  });

  it('mengganti set kategori saat update membawa categoryIds', async () => {
    const article = { id: ID, organizationId: 'org-1', regionId: ID2, slug: 'lama', title: 'T', body: 'B', source: 'S', tags: [], status: 'draft', version: 1, publisherId: null, categoryId: CAT1, authorId: null, leadMediaId: null, coverImageUrl: null };
    const { service, state } = harness({
      regions: [{ id: ID2, status: 'active' }],
      categories: [{ id: CAT1, status: 'active' }, { id: CAT2, status: 'active' }],
      articles: [article],
      articleCategories: [{ articleId: ID, categoryId: CAT1, position: 1 }],
    });
    const result = await service.updateArticle(actor, {
      id: ID, expectedVersion: 1, regionId: ID2, publisherId: null, categoryId: CAT1, categoryIds: [CAT2],
      authorId: null, slug: 'lama', title: 'Judul Baru Yang Cukup Panjang',
      body: 'Isi baru yang cukup panjang untuk lolos validasi.', source: 'Humas', tags: [], status: 'draft',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.value.categoryId).toBe(CAT2);
    expect(result.value.categoryIds).toEqual([CAT2]);
    expect((state.articleCategories as { categoryId: string }[]).map((row) => row.categoryId)).toEqual([CAT2]);
  });

  it('menyimpan bodyJson valid dan menolak dokumen berbahaya', async () => {
    const { service, state } = harness({
      regions: [{ id: ID2, status: 'active' }],
      articles: [],
    });
    const richDoc = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Berita kaya.' }] }] };
    const created = await service.createArticle(actor, {
      regionId: ID2,
      slug: 'berita-kaya',
      title: 'Judul Artikel Yang Cukup Panjang',
      body: 'Isi artikel yang cukup panjang untuk lolos validasi.',
      bodyJson: richDoc,
      source: 'Humas',
    });
    expect(created.ok).toBe(true);
    if (!created.ok) throw new Error('expected ok');
    expect(created.value.bodyJson).toEqual(richDoc);
    expect((state.articles as { bodyJson: unknown }[])[0]?.bodyJson).toEqual(richDoc);

    const badDoc = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x', marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }] }] }] };
    const refused = await service.createArticle(actor, {
      regionId: ID2,
      slug: 'berita-jahat',
      title: 'Judul Artikel Yang Cukup Panjang',
      body: 'Isi artikel yang cukup panjang untuk lolos validasi.',
      bodyJson: badDoc,
      source: 'Humas',
    });
    expect(refused.ok).toBe(false);
    if (refused.ok) throw new Error('expected error');
    expect(refused.error.error.code).toBe('INVALID_INPUT');
  });
});
