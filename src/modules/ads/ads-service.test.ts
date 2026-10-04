import { describe, expect, it } from 'vitest';

import type { AuthorizedTenantActorContext } from '@/core/operation-context';
import { DASHBOARD_PERMISSIONS } from '@/modules/dashboard/permissions';
import { AdsService } from '@/modules/ads/ads-service';
import { AdsConflictError, type AdsRepository } from '@/modules/ads/ports';

const SITE_ID = '11111111-1111-4111-8111-111111111111';
const ADV_ID = '22222222-2222-4222-8222-222222222222';
const CRE_ID = '33333333-3333-4333-8333-333333333333';
const CAM_ID = '44444444-4444-4344-8344-444444444444';

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
    createCreative: async () => { calls.push('createCreative'); return { id: 'cre-1' }; },
    updateCreativeStatus: async () => { calls.push('updateCreativeStatus'); return { version: 2 }; },
    createCampaign: async () => { calls.push('createCampaign'); return { id: 'cam-1' }; },
    updateCampaignStatus: async () => { calls.push('updateCampaignStatus'); return { version: 2 }; },
    createPlacement: async () => { calls.push('createPlacement'); return { id: 'pla-1' }; },
    updatePlacement: async () => { calls.push('updatePlacement'); return { version: 2 }; },
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
});
