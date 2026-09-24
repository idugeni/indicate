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
