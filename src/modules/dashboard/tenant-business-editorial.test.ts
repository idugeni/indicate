import { describe, expect, it, vi } from 'vitest';

import { TenantBusinessService } from '@/modules/dashboard/tenant-business-service';

const ID = '0199a2b3-4c5d-7e8f-9012-3456789abcde';
const ID2 = '0199a2b3-4c5d-7e8f-9012-3456789abcdf';
const ID3 = '0199a2b3-4c5d-7e8f-9012-3456789abf01';
const ID4 = '0199a2b3-4c5d-7e8f-9012-3456789abf02';
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

const verifyingActor = { ...actor, permissionSet: new Set<string>(['publisher.verify']) } as const;

const COLLECTIONS = [
  'domains', 'regions', 'sites', 'siteSettings', 'roles', 'memberships',
  'publishers', 'affiliations', 'categories', 'authors', 'articles', 'articleCategories', 'articleSites', 'media', 'publishingJobs',
] as const;

function harness(collections: Record<string, readonly unknown[]> = {}) {
  const state: Record<string, unknown> = { organizationId: 'org-1' };
  for (const key of COLLECTIONS) state[key] = [...(collections[key] ?? [])];
  if (collections.categories === undefined) {
    state.categories = [{ id: ID4, name: 'Berita', slug: 'berita', status: 'active' }];
  }
  const appendAudit = vi.fn();
  const repository = {
    hasPublishedBridges: vi.fn(async () => false),
    execute: vi.fn(async (actor: unknown, permission: unknown, operation: unknown) => {
      const op = operation as (transaction: unknown) => unknown;
      return op({ state, resolveUserDisplayName: async () => 'Operator', appendAudit, refreshArticleContent: async () => false, articleContentTouched: new Set<string>() });
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

  it('memverifikasi otomatis saat aktor berhak approve dan bukti tersedia', async () => {
    const { service, appendAudit } = harness();
    const result = await service.createPublisher(verifyingActor, { ...publisherInput, evidenceReference: 'sk-9' });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.value.verificationStatus).toBe('verified');
    expect(result.value.verifiedBy).toBe('user-1');
    expect(result.value.verifiedAt).toBe(NOW.toISOString());
    const actions = appendAudit.mock.calls.map(([entry]) => (entry as { action: string }).action);
    expect(actions).toContain('publisher.create');
    expect(actions).toContain('publisher.verify');
  });

  it('tidak memverifikasi otomatis tanpa hak, tanpa wilayah bebas, atau tanpa bukti', async () => {
    const noRight = await harness().service.createPublisher(actor, { ...publisherInput, evidenceReference: 'sk-9' });
    if (!noRight.ok) throw new Error('expected ok');
    expect(noRight.value.verificationStatus).toBe('unverified');

    const locked = await harness().service.createPublisher({ ...verifyingActor, regionScopeId: 'region-1' }, { ...publisherInput, evidenceReference: 'sk-9' });
    if (!locked.ok) throw new Error('expected ok');
    expect(locked.value.verificationStatus).toBe('unverified');

    const noEvidence = await harness().service.createPublisher(verifyingActor, publisherInput);
    if (!noEvidence.ok) throw new Error('expected ok');
    expect(noEvidence.value.verificationStatus).toBe('unverified');
  });

  it('mereset verifikasi saat identitas berubah', async () => {
    const { service } = harness({ publishers: [verifiedPublisher] });
    const result = await service.updatePublisher(actor, { ...publisherInput, id: ID, expectedVersion: 1, name: 'Humas Baru' });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.value.verificationStatus).toBe('unverified');
    expect(result.value.verifiedBy).toBe(null);
  });

  it('memurge portal saat logo penerbit berubah', async () => {
    const enqueued: Array<{ readonly publisherId: string }> = [];
    const fake = harness({ publishers: [{ ...verifiedPublisher, contacts: {} }] });
    const serviceWithPurge = fake.service;
    (serviceWithPurge as unknown as { repository: { enqueuePublisherInvalidation: (...args: readonly unknown[]) => Promise<number> } }).repository.enqueuePublisherInvalidation =
      async (...args: readonly unknown[]) => {
        enqueued.push({ publisherId: args[2] as string });
        return 3;
      };
    const changed = await serviceWithPurge.updatePublisher(actor, {
      ...publisherInput,
      id: ID,
      expectedVersion: 1,
      contacts: { logoUrl: '/api/network/media/m-1' },
    });
    expect(changed.ok).toBe(true);
    expect(enqueued).toEqual([{ publisherId: ID }]);
  });

  it('tidak memurge saat logo tidak berubah dan tetap sukses bila purge gagal', async () => {
    const calls: unknown[][] = [];
    const fake = harness({ publishers: [{ ...verifiedPublisher, contacts: {} }] });
    const serviceWithPurge = fake.service;
    (serviceWithPurge as unknown as { repository: { enqueuePublisherInvalidation: (...args: readonly unknown[]) => Promise<number> } }).repository.enqueuePublisherInvalidation =
      async (...args: readonly unknown[]) => {
        calls.push([...args]);
        throw new Error('redis down');
      };
    const same = await serviceWithPurge.updatePublisher(actor, { ...publisherInput, id: ID, expectedVersion: 1 });
    expect(same.ok).toBe(true);
    expect(calls).toHaveLength(0);
    const changed = await serviceWithPurge.updatePublisher(actor, {
      ...publisherInput,
      id: ID,
      expectedVersion: 2,
      contacts: { logoUrl: '/api/network/media/m-1' },
    });
    expect(changed.ok).toBe(true);
    expect(calls).toHaveLength(1);
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

  it('menyimpan membership', async () => {
    const { service, state } = harness({
      roles: [{ id: ID2 }],
      regions: [],
      memberships: [],
    });
    const result = await service.saveMembership(actor, { userId: ID, roleId: ID2, status: 'active' });
    expect(result.ok).toBe(true);
    expect((state.memberships as { userId: string }[]).some((membership) => membership.userId === ID)).toBe(true);
  });

  it('mengisi kategori berita saat artikel dibuat tanpa kategori', async () => {
    const { service } = harness({
      regions: [{ id: ID2, status: 'active' }],
      categories: [
        { id: ID3, name: 'Politik', slug: 'politik', status: 'active' },
        { id: ID4, name: 'Berita', slug: 'berita', status: 'active' },
      ],
    });
    const result = await service.createArticle(actor, {
      regionId: ID2,
      slug: 'tanpa-kategori',
      title: 'Judul Artikel Yang Cukup Panjang',
      body: 'Isi artikel yang cukup panjang untuk lolos validasi.',
      source: 'Humas',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.value.categoryId).toBe(ID4);
    expect(result.value.categoryIds).toEqual([ID4]);
  });

  it('menolak artikel saat tenetsan belum punya kategori sama sekali', async () => {
    const { service } = harness({
      regions: [{ id: ID2, status: 'active' }],
      categories: [],
    });
    const result = await service.createArticle(actor, {
      regionId: ID2,
      slug: 'tanpa-kategori',
      title: 'Judul Artikel Yang Cukup Panjang',
      body: 'Isi artikel yang cukup panjang untuk lolos validasi.',
      source: 'Humas',
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('INVALID_INPUT');
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
    const state: Record<string, unknown> = { organizationId: 'org-1', regions: [{ id: ID2, status: 'active' }], categories: [{ id: ID4, name: 'Berita', slug: 'berita', status: 'active' }], articles: [] as unknown[] };
    for (const key of COLLECTIONS) state[key] ??= [];
    const repository = {
      execute: vi.fn(async (actor: unknown, permission: unknown, operation: unknown) => {
        const op = operation as (transaction: unknown) => unknown;
        return op({ state, resolveUserDisplayName: async () => 'Operator', appendAudit: vi.fn(), refreshArticleContent: async () => false, articleContentTouched: new Set<string>() });
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
      media: [{ id: MED1, organizationId: 'org-1', state: 'active', purpose: 'article-cover', mediaType: 'image/jpeg' }],
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
      media: [{ id: MED2, organizationId: 'org-1', state: 'rejected', purpose: 'article-cover', mediaType: 'image/jpeg' }],
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

  it('menolak sampul dengan purpose selain article-cover', async () => {
    const { service } = harness({
      regions: [{ id: ID2, status: 'active' }],
      media: [{ id: MED1, organizationId: 'org-1', state: 'active', purpose: 'article-inline', mediaType: 'image/jpeg' }],
      articles: [],
    });
    const result = await service.createArticle(actor, {
      regionId: ID2, slug: 'tolak-purpose', title: 'Judul Artikel Yang Cukup Panjang',
      body: 'Isi artikel yang cukup panjang untuk lolos validasi.', source: 'Humas', leadMediaId: MED1,
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('INVALID_INPUT');
  });

  it('mempertahankan isi lama saat update tanpa body', async () => {
    const article = { id: ID, organizationId: 'org-1', regionId: ID2, slug: 'lama', title: 'T', body: 'Isi lama yang utuh', bodyJson: { type: 'doc', content: [] }, source: 'S', tags: [], status: 'draft', version: 1, publisherId: null, categoryId: CAT1, authorId: null, leadMediaId: null, coverImageUrl: null };
    const { service } = harness({
      regions: [{ id: ID2, status: 'active' }],
      categories: [{ id: CAT1, status: 'active' }],
      articles: [article],
    });
    const result = await service.updateArticle(actor, {
      id: ID, expectedVersion: 1, regionId: ID2, publisherId: null, categoryId: CAT1,
      authorId: null, slug: 'lama', title: 'Judul Baru Yang Cukup Panjang', source: 'S', tags: [], status: 'draft',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.value.body).toBe('Isi lama yang utuh');
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

    const noSource = await service.createArticle(actor, {
      regionId: ID2,
      slug: 'berita-tanpa-sumber',
      title: 'Judul Artikel Yang Cukup Panjang',
      body: 'Isi artikel yang cukup panjang untuk lolos validasi.',
    });
    expect(noSource.ok).toBe(true);
    if (!noSource.ok) throw new Error('expected ok');
    expect(noSource.value.source).toBe('');
  });
});

describe('TenantBusinessService assignment saat pembuatan', () => {
  const site = (overrides: Record<string, unknown> = {}) => ({
    id: 'site-1',
    organizationId: 'org-1',
    domainId: 'domain-1',
    regionId: null,
    normalizedHostname: 'portal.test',
    status: 'active',
    activationState: 'active',
    routingVersion: 1,
    contentVersion: 1,
    version: 1,
    ...overrides,
  });

  const draft = {
    regionId: ID2,
    slug: 'berita-otomatis',
    title: 'Judul Artikel Yang Cukup Panjang',
    body: 'Isi artikel yang cukup panjang untuk lolos validasi.',
    source: 'Humas',
  };

  it('membuat artikel tanpa menulis assignment portal', async () => {
    const { service, state, appendAudit } = harness({
      regions: [{ id: ID2, status: 'active' }],
      sites: [site(), site({ id: 'site-2', normalizedHostname: 'lain.test' })],
      articles: [],
      articleSites: [],
    });
    const result = await service.createArticle(actor, draft);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    const rows = state.articleSites as { siteId: string }[];
    expect(rows).toEqual([]);
    expect(appendAudit).toHaveBeenCalledTimes(1);
  });

  it('melewati situs nonaktif dan tanpa situs tetap sukses', async () => {
    const { service, state } = harness({
      regions: [{ id: ID2, status: 'active' }],
      sites: [site({ id: 'site-off', status: 'inactive' }), site({ id: 'site-pending', activationState: 'pending' })],
      articles: [],
      articleSites: [],
    });
    const result = await service.createArticle(actor, draft);
    expect(result.ok).toBe(true);
    expect(state.articleSites as unknown[]).toHaveLength(0);
  });

  it('aktor terkunci region tetap sukses tanpa menulis assignment', async () => {
    const { service, state } = harness({
      regions: [{ id: ID2, status: 'active' }, { id: 'region-lain', status: 'active' }],
      sites: [site(), site({ id: 'site-luar', regionId: 'region-lain', normalizedHostname: 'luar.test' })],
      articles: [],
      articleSites: [],
    });
    const locked = { ...actor, regionScopeId: ID2 };
    const result = await service.createArticle(locked, { ...draft, regionId: ID2 });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(state.articleSites as unknown[]).toHaveLength(0);
  });

  it('admin membuat artikel nasional tanpa wilayah', async () => {
    const { service, state } = harness({
      regions: [{ id: ID2, status: 'active' }],
      sites: [site()],
      articles: [],
      articleSites: [],
    });
    const result = await service.createArticle(actor, { ...draft, regionId: null });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.value.regionId).toBeNull();
    expect((state.articles as { regionId: unknown }[])[0]?.regionId).toBeNull();
  });

  it('aktor terkunci ditolak membuat artikel nasional', async () => {
    const { service } = harness({
      regions: [{ id: ID2, status: 'active' }],
      sites: [site()],
      articles: [],
      articleSites: [],
    });
    const locked = { ...actor, regionScopeId: ID2 };
    const result = await service.createArticle(locked, { ...draft, regionId: null });
    expect(result.ok).toBe(false);
  });

  it('aktor terkunci ditolak mengubah artikel menjadi nasional', async () => {
    const article = { id: ID, organizationId: 'org-1', regionId: ID2, slug: 'berita-utama', title: 'T', body: 'B', source: 'S', tags: [], status: 'draft', version: 1, publisherId: null, categoryId: null, authorId: null };
    const { service } = harness({
      regions: [{ id: ID2, status: 'active' }],
      articles: [article],
    });
    const locked = { ...actor, regionScopeId: ID2 };
    const result = await service.updateArticle(locked, { id: ID, expectedVersion: 1, regionId: null, publisherId: null, categoryId: null, authorId: null, slug: 'berita-utama', title: 'T', body: 'B', source: 'S', tags: [], status: 'draft', scheduledAt: null });
    expect(result.ok).toBe(false);
  });
});

describe('TenantBusinessService hapus artikel', () => {
  const draftRow = (overrides: Record<string, unknown> = {}) => ({
    id: ID,
    organizationId: 'org-1',
    regionId: ID2,
    slug: 'draf-lama',
    title: 'Draf Lama Yang Cukup Panjang',
    body: 'Isi draf yang cukup panjang.',
    source: 'Humas',
    tags: [],
    status: 'draft',
    version: 1,
    publisherId: null,
    categoryId: null,
    authorId: null,
    ...overrides,
  });

  it('menghapus draf dan relasi kategorinya', async () => {
    const { service, state } = harness({
      regions: [{ id: ID2, status: 'active' }],
      articles: [draftRow()],
      articleCategories: [{ articleId: ID, categoryId: ID4, position: 1 }],
    });
    const result = await service.deleteArticle(actor, { id: ID, expectedVersion: 1 });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.value).toEqual({ id: ID });
    expect(state.articles as unknown[]).toHaveLength(0);
    expect(state.articleCategories as unknown[]).toHaveLength(0);
  });

  it('menolak hapus artikel tayang', async () => {
    const { service } = harness({
      regions: [{ id: ID2, status: 'active' }],
      articles: [draftRow({ status: 'active' })],
    });
    const result = await service.deleteArticle(actor, { id: ID, expectedVersion: 1 });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('INVALID_INPUT');
  });

  it('menolak hapus saat masih ada penugasan portal', async () => {
    const { service } = harness({
      regions: [{ id: ID2, status: 'active' }],
      articles: [draftRow()],
      articleSites: [{ id: ID3, articleId: ID, siteId: 'site-1' }],
    });
    const result = await service.deleteArticle(actor, { id: ID, expectedVersion: 1 });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('INVALID_INPUT');
  });
});

describe('TenantBusinessService createArticle untuk org pemilik', () => {
  const platformActor = { ...actor, platformPermissionSet: new Set<string>(['platform.super_admin']) };
  const OWNER_ORG = '0199a2b3-4c5d-7e8f-9012-3456789ab004';
  const OP_PUB = '0199a2b3-4c5d-7e8f-9012-3456789ab001';
  const OP_REG = '0199a2b3-4c5d-7e8f-9012-3456789ab002';
  const OP_CAT = '0199a2b3-4c5d-7e8f-9012-3456789ab003';
  const T_PUB = '0199a2b3-4c5d-7e8f-9012-3456789ab005';
  const T_AUT = '0199a2b3-4c5d-7e8f-9012-3456789ab006';
  const T_CAT = '0199a2b3-4c5d-7e8f-9012-3456789ab007';
  const T_REG = '0199a2b3-4c5d-7e8f-9012-3456789ab008';
  const forOrgPayload = {
    regionId: OP_REG,
    publisherId: OP_PUB,
    categoryIds: [OP_CAT],
    authorId: null,
    slug: 'berita-upt',
    title: 'Judul Artikel Yang Cukup Panjang',
    body: 'Isi artikel yang cukup panjang untuk lolos validasi.',
    source: 'RUTAN KELAS II B WONOSOBO',
  };

  function forOrgHarness(target: Record<string, unknown[]> = {}) {
    const operatorScope = {
      publishers: [{ id: OP_PUB, name: 'RUTAN KELAS II B WONOSOBO', attributionLabel: 'Humas', status: 'active' }],
      regions: [{ id: OP_REG, name: 'Wonosobo', slug: 'wonosobo', status: 'active' }],
      categories: [{ id: OP_CAT, name: 'Berita', slug: 'berita', status: 'active' }],
    };
    const targetState: Record<string, unknown> = {
      organizationId: OWNER_ORG,
      publishers: [{ id: T_PUB, name: 'RUTAN KELAS II B WONOSOBO', status: 'active' }],
      authors: [{ id: T_AUT, displayName: 'Redaksi', byline: 'Tim Redaksi', status: 'active' }],
      categories: [{ id: T_CAT, name: 'Berita', slug: 'berita', status: 'active' }],
      regions: [{ id: T_REG, name: 'Wonosobo', slug: 'wonosobo', status: 'active' }],
      articles: [],
      articleCategories: [],
      articleSites: [],
      media: [],
      ...target,
    };
    const appendAudit = vi.fn();
    const executeForOrganization = vi.fn(async (ownerActor: unknown, orgId: unknown, operation: unknown) => {
      const op = operation as (transaction: unknown) => unknown;
      return op({ state: targetState, resolveUserDisplayName: async () => 'Operator', appendAudit, refreshArticleContent: async () => false, articleContentTouched: new Set<string>() });
    });
    const repository = {
      execute: vi.fn(async () => {
        throw new Error('jalur normal tidak boleh dipakai untuk penerbit cermin');
      }),
      executeForOrganization,
      readEditorialScope: vi.fn(async () => operatorScope),
      findOrganizationBySlug: vi.fn(async (calledActor: unknown, slug: unknown) => (slug === 'rutan-kelas-ii-b-wonosobo' ? OWNER_ORG : null)),
      recordDenied: vi.fn(async () => undefined),
    };
    const notifyArticleCreated = vi.fn(async () => undefined);
    const service = new TenantBusinessService(repository as never, { create: () => ID }, { now: () => NOW }, { notifyArticleCreated });
    return { service, targetState, repository, notifyArticleCreated };
  }

  it('mencatat artikel di org pemilik dengan atribusi terpetakan', async () => {
    const { service, targetState, repository, notifyArticleCreated } = forOrgHarness();
    const result = await service.createArticle(platformActor, forOrgPayload);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.value.organizationId).toBe(OWNER_ORG);
    expect(result.value.publisherId).toBe(T_PUB);
    expect(result.value.authorId).toBe(T_AUT);
    expect(result.value.categoryIds).toEqual([T_CAT]);
    expect(result.value.regionId).toBe(T_REG);
    expect(result.value.leadMediaId).toBeNull();
    expect(result.value.source).toBe('RUTAN KELAS II B WONOSOBO');
    expect(repository.execute).not.toHaveBeenCalled();
    expect(notifyArticleCreated).toHaveBeenCalledWith({ organizationId: OWNER_ORG, articleId: ID, title: 'Judul Artikel Yang Cukup Panjang' });
    expect(targetState.articles as unknown[]).toHaveLength(1);
  });

  it('tetap memakai jalur normal tanpa grant platform', async () => {
    const { service, state } = harness({
      regions: [{ id: ID2, status: 'active' }],
    });
    const result = await service.createArticle(actor, {
      regionId: ID2,
      publisherId: null,
      slug: 'mandiri-baru',
      title: 'Judul Artikel Yang Cukup Panjang',
      body: 'Isi artikel yang cukup panjang untuk lolos validasi.',
      source: 'Humas',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.value.organizationId).toBe('org-1');
    expect(state.articles as unknown[]).toHaveLength(1);
  });

  it('menolak bila penerbit cermin tak ada di org tujuan', async () => {
    const { service } = forOrgHarness({ publishers: [] });
    const result = await service.createArticle(platformActor, forOrgPayload);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('INVALID_INPUT');
  });

  it('menerima sampul milik org tujuan', async () => {
    const targetMedia = '0199a2b3-4c5d-7e8f-9012-3456789ab009';
    const { service } = forOrgHarness({
      media: [{ id: targetMedia, state: 'active', mediaType: 'image/webp', purpose: 'article-cover' }],
    });
    const result = await service.createArticle(platformActor, { ...forOrgPayload, leadMediaId: targetMedia });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.value.leadMediaId).toBe(targetMedia);
  });

  it('menolak sampul milik org lain', async () => {
    const { service } = forOrgHarness();
    const result = await service.createArticle(platformActor, { ...forOrgPayload, leadMediaId: ID2 });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('INVALID_INPUT');
  });

  it('menolak inbox tanpa grant platform', async () => {
    const { service } = forOrgHarness();
    const result = await service.listForOrgInbox(actor);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('RESOURCE_UNAVAILABLE');
  });

  it('meneruskan daftar inbox steward', async () => {
    const { service, repository } = forOrgHarness();
    const rows = [{ organizationId: OWNER_ORG, orgSlug: 'rutan', orgName: 'RUTAN', articleId: ID, slug: 's', title: 'T', status: 'draft', publisherLabel: null, regionSlug: null, updatedAt: NOW.toISOString() }];
    (repository as Record<string, unknown>).listForOrgInbox = vi.fn(async () => rows);
    const result = await service.listForOrgInbox(platformActor);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.value).toEqual(rows);
  });

  it('menolak bridge-otomatis tanpa grant platform', async () => {
    const { service } = forOrgHarness();
    const result = await service.requestBridgePublicationAuto(actor, { ownerOrganizationId: OWNER_ORG, articleId: ID });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('RESOURCE_UNAVAILABLE');
  });

  it('meneruskan bridge-otomatis steward ke repositori', async () => {
    const { service, repository } = forOrgHarness();
    const done = { bridgeIds: ['b-1'], slug: 's', siteCount: 2 };
    (repository as Record<string, unknown>).requestBridgePublicationAuto = vi.fn(async () => done);
    const result = await service.requestBridgePublicationAuto(platformActor, { ownerOrganizationId: OWNER_ORG, articleId: ID });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.value).toEqual(done);
  });

  it('menolak bridge tanpa grant platform', async () => {
    const { service } = forOrgHarness();
    const result = await service.requestBridgePublication(actor, { ownerOrganizationId: OWNER_ORG, articleId: ID, siteIds: [ID2] });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('RESOURCE_UNAVAILABLE');
  });

  it('meneruskan permintaan bridge steward ke repositori', async () => {
    const { service, repository } = forOrgHarness();
    const bridge = { bridgeIds: ['b-1'], slug: 'berita-upt' };
    (repository as Record<string, unknown>).requestBridgePublication = vi.fn(async () => bridge);
    const result = await service.requestBridgePublication(platformActor, { ownerOrganizationId: OWNER_ORG, articleId: ID, siteIds: [ID2] });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.value).toEqual(bridge);
  });

  it('menolak bridge tanpa situs tujuan', async () => {
    const { service } = forOrgHarness();
    const result = await service.requestBridgePublication(platformActor, { ownerOrganizationId: OWNER_ORG, articleId: ID, siteIds: [] });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('INVALID_INPUT');
  });
});
