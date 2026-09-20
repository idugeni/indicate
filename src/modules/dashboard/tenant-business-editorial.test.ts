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
  'domains', 'regions', 'sites', 'siteSettings', 'roles', 'memberships', 'telegramMappings',
  'publishers', 'affiliations', 'categories', 'authors', 'articles', 'articleSites', 'media',
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
});
