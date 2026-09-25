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
  'domains', 'regions', 'sites', 'siteSettings', 'roles', 'memberships',
  'publishers', 'affiliations', 'categories', 'authors', 'articles', 'articleCategories', 'articleSites', 'media',
] as const;

function harness(collections: Record<string, readonly unknown[]> = {}) {
  const state: Record<string, unknown> = { organizationId: 'org-1' };
  for (const key of COLLECTIONS) state[key] = [...(collections[key] ?? [])];
  const repository = {
    execute: vi.fn(async (_actor: unknown, _permission: unknown, operation: unknown) => {
      const op = operation as (transaction: unknown) => unknown;
      return op({ state, resolveUserDisplayName: async () => 'Operator', appendAudit: vi.fn() });
    }),
    recordDenied: vi.fn(async () => undefined),
  };
  const service = new TenantBusinessService(repository as never, { create: () => ID }, { now: () => NOW });
  return { service, state };
}

const site = { id: ID, organizationId: 'org-1', regionId: null };
const settingsInput = { siteId: ID, name: 'Portal Fakta', description: 'Deskripsi portal yang informatif.', colors: { templateId: 'clean-blue' } };

describe('TenantBusinessService saveSiteSettings', () => {
  it('menyimpan pengaturan baru', async () => {
    const { service, state } = harness({ sites: [site] });
    const result = await service.saveSiteSettings(actor, settingsInput);
    expect(result.ok).toBe(true);
    expect((state.siteSettings as unknown[])).toHaveLength(1);
  });

  it('meneruskan pergantian gambar brand apex ke portal turunan yang mewarisi', async () => {
    const apexId = ID;
    const regionSiteId = ID2;
    const ownMediaCityId = '0199a2b3-4c5d-7e8f-9012-3456789abc41';
    const { service, state } = harness({
      sites: [
        { id: apexId, organizationId: 'org-1', domainId: 'd-1', regionId: null, siteLevel: 'apex', parentSiteId: null },
        { id: regionSiteId, organizationId: 'org-1', domainId: 'd-1', regionId: 'r-1', siteLevel: 'region', parentSiteId: apexId },
        { id: ownMediaCityId, organizationId: 'org-1', domainId: 'd-1', regionId: 'c-1', siteLevel: 'city', parentSiteId: regionSiteId },
      ],
      media: [
        { id: '0199a2b3-4c5d-7e8f-9012-3456789abc51', state: 'active', purpose: 'site-default', mediaType: 'image/png' },
        { id: '0199a2b3-4c5d-7e8f-9012-3456789abc52', state: 'active', purpose: 'site-default', mediaType: 'image/png' },
        { id: '0199a2b3-4c5d-7e8f-9012-3456789abc53', state: 'active', purpose: 'site-default', mediaType: 'image/png' },
      ],
      siteSettings: [
        { id: apexId, siteId: apexId, name: 'Apex', defaultMediaId: '0199a2b3-4c5d-7e8f-9012-3456789abc51', version: 1 },
        { id: regionSiteId, siteId: regionSiteId, name: 'Region', defaultMediaId: '0199a2b3-4c5d-7e8f-9012-3456789abc51', version: 1 },
        { id: ownMediaCityId, siteId: ownMediaCityId, name: 'City own media', defaultMediaId: '0199a2b3-4c5d-7e8f-9012-3456789abc53', version: 1 },
      ],
    });
    const result = await service.saveSiteSettings(actor, { siteId: apexId, name: 'Apex', description: 'Deskripsi portal yang informatif.', defaultMediaId: '0199a2b3-4c5d-7e8f-9012-3456789abc52' });
    expect(result.ok).toBe(true);
    const rows = state.siteSettings as { siteId: string; defaultMediaId: string | null }[];
    expect(rows.find((row) => row.siteId === apexId)?.defaultMediaId).toBe('0199a2b3-4c5d-7e8f-9012-3456789abc52');
    expect(rows.find((row) => row.siteId === regionSiteId)?.defaultMediaId).toBe('0199a2b3-4c5d-7e8f-9012-3456789abc52');
    expect(rows.find((row) => row.siteId === ownMediaCityId)?.defaultMediaId).toBe('0199a2b3-4c5d-7e8f-9012-3456789abc53');
  });

  it('tidak menyentuh portal turunan saat apex tidak memakai siteLevel apex', async () => {
    const { service, state } = harness({
      sites: [
        { id: ID, organizationId: 'org-1', domainId: 'd-1', regionId: 'r-1', siteLevel: 'region', parentSiteId: null },
        { id: ID2, organizationId: 'org-1', domainId: 'd-1', regionId: 'c-1', siteLevel: 'city', parentSiteId: ID },
      ],
      media: [
        { id: '0199a2b3-4c5d-7e8f-9012-3456789abc51', state: 'active', purpose: 'site-default', mediaType: 'image/png' },
        { id: '0199a2b3-4c5d-7e8f-9012-3456789abc52', state: 'active', purpose: 'site-default', mediaType: 'image/png' },
      ],
      siteSettings: [
        { id: ID, siteId: ID, name: 'Region', defaultMediaId: '0199a2b3-4c5d-7e8f-9012-3456789abc51', version: 1 },
        { id: ID2, siteId: ID2, name: 'City', defaultMediaId: '0199a2b3-4c5d-7e8f-9012-3456789abc51', version: 1 },
      ],
    });
    const result = await service.saveSiteSettings(actor, { siteId: ID, name: 'Region', description: 'Deskripsi portal yang informatif.', defaultMediaId: '0199a2b3-4c5d-7e8f-9012-3456789abc52' });
    expect(result.ok).toBe(true);
    const rows = state.siteSettings as { siteId: string; defaultMediaId: string | null }[];
    expect(rows.find((row) => row.siteId === ID2)?.defaultMediaId).toBe('0199a2b3-4c5d-7e8f-9012-3456789abc51');
  });

  it('menolak pembuatan tanpa templateId', async () => {
    const { service } = harness({ sites: [site] });
    const result = await service.saveSiteSettings(actor, { siteId: ID, name: 'Portal Fakta', description: 'Deskripsi portal yang informatif.' });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('INVALID_INPUT');
  });

  it('menolak media tidak aktif', async () => {
    const { service } = harness({ sites: [site], media: [{ id: ID2, state: 'rejected', purpose: 'site-logo', mediaType: 'image/png' }] });
    const result = await service.saveSiteSettings(actor, { ...settingsInput, logoMediaId: ID2 });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('INVALID_INPUT');
  });

  it('menolak logo dengan purpose selain site-logo', async () => {
    const { service } = harness({ sites: [site], media: [{ id: ID2, state: 'active', purpose: 'article-cover', mediaType: 'image/jpeg' }] });
    const result = await service.saveSiteSettings(actor, { ...settingsInput, logoMediaId: ID2 });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('INVALID_INPUT');
  });

  it('menolak nama kanal duplikat lintas site', async () => {
    const { service } = harness({
      sites: [site, { ...site, id: ID2 }],
      siteSettings: [{ siteId: ID2, name: 'Portal Fakta' }],
    });
    const result = await service.saveSiteSettings(actor, settingsInput);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('INVALID_INPUT');
  });
});

describe('TenantBusinessService updateAffiliation', () => {
  const base = {
    publishers: [{ ...{ id: ID, organizationId: 'org-1' }, verificationStatus: 'verified' }],
    sites: [site],
    affiliations: [{
      id: ID2, publisherId: ID, siteId: ID, institutionName: 'Rutan', claimScopes: ['kegiatan'],
      evidenceReference: 'sk-1', active: true, verifiedAt: NOW.toISOString(), version: 1,
    }],
  };

  it('memperbarui afiliasi terverifikasi', async () => {
    const { service } = harness(base);
    const result = await service.updateAffiliation(actor, {
      id: ID2, expectedVersion: 1, institutionName: 'Rutan Baru', claimScopes: ['kegiatan'], evidenceReference: 'sk-2', active: true,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.value.institutionName).toBe('Rutan Baru');
  });

  it('menolak aktivasi untuk publisher belum terverifikasi', async () => {
    const { service } = harness({
      ...base,
      publishers: [{ id: ID, organizationId: 'org-1', verificationStatus: 'pending' }],
    });
    const result = await service.updateAffiliation(actor, {
      id: ID2, expectedVersion: 1, institutionName: 'Rutan', claimScopes: ['kegiatan'], evidenceReference: 'sk-1', active: true,
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('RESOURCE_UNAVAILABLE');
  });
});
