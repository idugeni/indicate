import { describe, expect, it } from 'vitest';

import type { AuthorizedTenantActorContext } from '@/core/operation-context';
import { DASHBOARD_PERMISSIONS } from '@/modules/dashboard/permissions';
import { AdsService } from '@/modules/ads/ads-service';
import { AdsConflictError, AdsNotFoundError, type AdsRepository } from '@/modules/ads/ports';

const SITE_ID = '11111111-1111-4111-8111-111111111111';
const ADV_ID = '22222222-2222-4222-8222-222222222222';
const CRE_ID = '33333333-3333-4333-8333-333333333333';
const CAM_ID = '44444444-4444-4344-8344-444444444444';
const PLA_ID = '55555555-5555-4555-8555-555555555555';

function actorWithSiteManage(): AuthorizedTenantActorContext {
  return {
    actorType: 'user',
    actorId: 'user-1',
    verifiedAuthUserId: 'auth-1',
    organizationId: 'org-1',
    permissionSet: new Set([DASHBOARD_PERMISSIONS.siteManage]),
    entryPoint: 'dashboard',
    requestId: 'req-1',
  } as AuthorizedTenantActorContext;
}

function actorWithoutGrant(): AuthorizedTenantActorContext {
  return { ...actorWithSiteManage(), permissionSet: new Set(['article.read']) };
}

function repository(): AdsRepository & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    overview: async () => {
      calls.push('overview');
      return { sites: [], slots: [], settings: [], advertisers: [], campaigns: [], creatives: [], placements: [] };
    },
    saveTenantSetting: async (_actor, input) => {
      calls.push('saveTenantSetting');
      if (input.expectedVersion === 9) throw new AdsConflictError();
      return { version: (input.expectedVersion ?? 0) + 1 };
    },
    createAdvertiser: async () => { calls.push('createAdvertiser'); return { id: 'adv-1' }; },
    updateAdvertiser: async (_actor, input) => {
      calls.push('updateAdvertiser');
      if (input.expectedVersion === 9) throw new AdsConflictError();
      return { version: input.expectedVersion + 1 };
    },
    deleteAdvertiser: async () => { calls.push('deleteAdvertiser'); },
    createCreative: async () => { calls.push('createCreative'); return { id: 'cre-1' }; },
    updateCreative: async (_actor, input) => {
      calls.push('updateCreative');
      if (input.expectedVersion === 9) throw new AdsConflictError();
      return { version: input.expectedVersion + 1 };
    },
    updateCreativeStatus: async () => { calls.push('updateCreativeStatus'); return { version: 2 }; },
    deleteCreative: async () => { calls.push('deleteCreative'); },
    createCampaign: async () => { calls.push('createCampaign'); return { id: 'cam-1' }; },
    updateCampaign: async (_actor, input) => {
      calls.push('updateCampaign');
      if (input.expectedVersion === 9) throw new AdsConflictError();
      return { version: input.expectedVersion + 1 };
    },
    updateCampaignStatus: async () => { calls.push('updateCampaignStatus'); return { version: 2 }; },
    deleteCampaign: async () => { calls.push('deleteCampaign'); },
    createPlacement: async () => { calls.push('createPlacement'); return { id: 'pla-1' }; },
    updatePlacement: async () => { calls.push('updatePlacement'); return { version: 2 }; },
    deletePlacement: async () => { calls.push('deletePlacement'); },
    saveNetworkSlot: async () => { calls.push('saveNetworkSlot'); return { creativeId: null, savedSites: 1 }; },
  };
}

describe('AdsService', () => {
  it('menolak aktor tanpa grant site.manage tanpa menyentuh repositori', async () => {
    const repo = repository();
    const service = new AdsService(repo);
    const result = await service.overview(actorWithoutGrant());
    expect(result.ok).toBe(false);
    expect(repo.calls).toEqual([]);
  });

  it('memvalidasi payload sebelum ke repositori', async () => {
    const repo = repository();
    const service = new AdsService(repo);
    const result = await service.saveTenantSetting(actorWithSiteManage(), { siteId: SITE_ID, slotId: 'slot-asing', enabled: true, creativeId: null, expectedVersion: null }, 'req-1');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.error.code).toBe('INVALID_INPUT');
    expect(repo.calls).toEqual([]);
  });

  it('meneruskan versi dan memetakan konflik menjadi 409', async () => {
    const repo = repository();
    const service = new AdsService(repo);
    const stale = await service.saveTenantSetting(actorWithSiteManage(), { siteId: SITE_ID, slotId: 'leaderboard', enabled: false, creativeId: null, expectedVersion: 9 }, 'req-1');
    expect(stale.ok).toBe(false);
    if (!stale.ok) expect(stale.error.error.code).toBe('CONFLICT');
    const fresh = await service.saveTenantSetting(actorWithSiteManage(), { siteId: SITE_ID, slotId: 'leaderboard', enabled: false, creativeId: null, expectedVersion: 2 }, 'req-1');
    expect(fresh).toEqual({ ok: true, value: { version: 3 } });
  });

  it('menyimpan slot jaringan dan menolak payload yang tidak valid', async () => {
    const repo = repository();
    const service = new AdsService(repo);
    const actor = actorWithSiteManage();
    const ok = await service.saveNetworkSlot(actor, { slotId: 'leaderboard', enabled: true, creative: { mode: 'none' }, expectedVersions: {} }, 'req-1');
    expect(ok).toEqual({ ok: true, value: { creativeId: null, savedSites: 1 } });
    const bad = await service.saveNetworkSlot(actor, { slotId: 'slot-asing', enabled: true, creative: { mode: 'none' }, expectedVersions: {} }, 'req-1');
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error.error.code).toBe('INVALID_INPUT');
    const denied = await service.saveNetworkSlot(actorWithoutGrant(), { slotId: 'leaderboard', enabled: true, creative: { mode: 'none' }, expectedVersions: {} }, 'req-1');
    expect(denied.ok).toBe(false);
    expect(repo.calls).toEqual(['saveNetworkSlot']);
  });

  it('membuat pengiklan, kreatif, kampanye, dan penempatan', async () => {
    const repo = repository();
    const service = new AdsService(repo);
    const actor = actorWithSiteManage();
    expect(await service.createAdvertiser(actor, { name: 'Pengiklan Bagus', contactEmail: null }, 'req-1')).toEqual({ ok: true, value: { id: 'adv-1' } });
    expect(await service.createCreative(actor, { kind: 'image', imageUrl: 'https://cdn.example/a.png', campaignId: null }, 'req-1')).toEqual({ ok: true, value: { id: 'cre-1' } });
    expect(await service.createCampaign(actor, { advertiserId: ADV_ID, name: 'Kampanye Q4', status: 'draft', priority: 0, startsAt: null, endsAt: null }, 'req-1')).toEqual({ ok: true, value: { id: 'cam-1' } });
    expect(await service.createPlacement(actor, { campaignId: CAM_ID, creativeId: CRE_ID, slotId: 'leaderboard', siteId: null, templateId: null, device: null, priority: 0, startsAt: null, endsAt: null }, 'req-1')).toEqual({ ok: true, value: { id: 'pla-1' } });
    expect(repo.calls).toEqual(['createAdvertiser', 'createCreative', 'createCampaign', 'createPlacement']);
  });

  it('memperbarui pengiklan, kampanye, dan kreatif lalu menghapus barisnya', async () => {
    const repo = repository();
    const service = new AdsService(repo);
    const actor = actorWithSiteManage();
    expect(await service.updateAdvertiser(actor, { id: ADV_ID, name: 'Pengiklan Baru', expectedVersion: 1 }, 'req-1')).toEqual({ ok: true, value: { version: 2 } });
    expect(await service.updateCampaign(actor, { id: CAM_ID, name: 'Kampanye Baru', priority: 5, expectedVersion: 1 }, 'req-1')).toEqual({ ok: true, value: { version: 2 } });
    expect(await service.updateCreative(actor, { id: CRE_ID, kind: 'image', imageUrl: 'https://cdn.example/b.png', expectedVersion: 1 }, 'req-1')).toEqual({ ok: true, value: { version: 2 } });
    expect(await service.deleteAdvertiser(actor, { id: ADV_ID }, 'req-1')).toEqual({ ok: true, value: { deleted: true } });
    expect(await service.deleteCampaign(actor, { id: CAM_ID }, 'req-1')).toEqual({ ok: true, value: { deleted: true } });
    expect(await service.deleteCreative(actor, { id: CRE_ID }, 'req-1')).toEqual({ ok: true, value: { deleted: true } });
    expect(await service.deletePlacement(actor, { id: PLA_ID }, 'req-1')).toEqual({ ok: true, value: { deleted: true } });
    expect(repo.calls).toEqual(['updateAdvertiser', 'updateCampaign', 'updateCreative', 'deleteAdvertiser', 'deleteCampaign', 'deleteCreative', 'deletePlacement']);
  });

  it('memetakan versi basi pada ubahan menjadi 409', async () => {
    const repo = repository();
    const service = new AdsService(repo);
    const actor = actorWithSiteManage();
    const staleAdvertiser = await service.updateAdvertiser(actor, { id: ADV_ID, name: 'Pengiklan Baru', expectedVersion: 9 }, 'req-1');
    expect(staleAdvertiser.ok).toBe(false);
    if (!staleAdvertiser.ok) expect(staleAdvertiser.error.error.code).toBe('CONFLICT');
    const staleCampaign = await service.updateCampaign(actor, { id: CAM_ID, name: 'Kampanye Baru', expectedVersion: 9 }, 'req-1');
    expect(staleCampaign.ok).toBe(false);
    if (!staleCampaign.ok) expect(staleCampaign.error.error.code).toBe('CONFLICT');
    const staleCreative = await service.updateCreative(actor, { id: CRE_ID, kind: 'image', imageUrl: 'https://cdn.example/b.png', expectedVersion: 9 }, 'req-1');
    expect(staleCreative.ok).toBe(false);
    if (!staleCreative.ok) expect(staleCreative.error.error.code).toBe('CONFLICT');
  });

  it('menolak payload ubah/hapus yang tidak valid sebelum ke repositori', async () => {
    const repo = repository();
    const service = new AdsService(repo);
    const actor = actorWithSiteManage();
    const badUpdate = await service.updateAdvertiser(actor, { id: 'bukan-uuid', name: 'x', expectedVersion: 1 }, 'req-1');
    expect(badUpdate.ok).toBe(false);
    if (!badUpdate.ok) expect(badUpdate.error.error.code).toBe('INVALID_INPUT');
    const badDelete = await service.deletePlacement(actor, { id: 'bukan-uuid' }, 'req-1');
    expect(badDelete.ok).toBe(false);
    if (!badDelete.ok) expect(badDelete.error.error.code).toBe('INVALID_INPUT');
    expect(repo.calls).toEqual([]);
  });

  it('memetakan baris hilang menjadi 404 dan hapusan terhalang FK menjadi 409', async () => {
    const missing: AdsRepository & { calls: string[] } = {
      ...repository(),
      deletePlacement: async () => { throw new AdsNotFoundError(); },
    };
    const gone = await new AdsService(missing).deletePlacement(actorWithSiteManage(), { id: PLA_ID }, 'req-1');
    expect(gone.ok).toBe(false);
    if (!gone.ok) expect(gone.error.error.code).toBe('RESOURCE_UNAVAILABLE');
    const blocked: AdsRepository & { calls: string[] } = {
      ...repository(),
      deleteAdvertiser: async () => { throw new AdsConflictError('Pengiklan masih dipakai kampanye.'); },
    };
    const conflict = await new AdsService(blocked).deleteAdvertiser(actorWithSiteManage(), { id: ADV_ID }, 'req-1');
    expect(conflict.ok).toBe(false);
    if (!conflict.ok) expect(conflict.error.error.code).toBe('CONFLICT');
  });
});
