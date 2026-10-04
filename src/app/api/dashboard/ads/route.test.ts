import { describe, expect, it } from 'vitest';

import type { AuthorizedTenantActorContext } from '@/core/operation-context';
import { DASHBOARD_PERMISSIONS } from '@/modules/dashboard/permissions';
import { resolveAdsAction, statusFor } from '@/app/api/dashboard/ads/route';
import { AdsService } from '@/modules/ads/ads-service';

const ACTIONS = [
  'ads.tenant_setting.save',
  'ads.network_setting.save',
  'ads.advertiser.create',
  'ads.advertiser.update',
  'ads.advertiser.delete',
  'ads.creative.create',
  'ads.creative.update',
  'ads.creative.status',
  'ads.creative.delete',
  'ads.campaign.create',
  'ads.campaign.update',
  'ads.campaign.status',
  'ads.campaign.delete',
  'ads.placement.create',
  'ads.placement.update',
  'ads.placement.delete',
] as const;

function actor(): AuthorizedTenantActorContext {
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

function serviceWith(calls: string[]): AdsService {
  const repository = new Proxy({}, {
    get: (_target, property) => async () => {
      calls.push(String(property));
      return { ok: true as const };
    },
  });
  return new AdsService(repository as unknown as ConstructorParameters<typeof AdsService>[0]);
}

describe('statusFor iklan', () => {
  it('memetakan kode envelope ke status HTTP', () => {
    const envelope = (code: string) => ({ error: { code, message: 'x', requestId: 'r' } }) as unknown as Parameters<typeof statusFor>[0];
    expect(statusFor(envelope('INVALID_INPUT'))).toBe(400);
    expect(statusFor(envelope('RESOURCE_UNAVAILABLE'))).toBe(404);
    expect(statusFor(envelope('FORBIDDEN'))).toBe(403);
    expect(statusFor(envelope('CONFLICT'))).toBe(409);
    expect(statusFor(envelope('DEPENDENCY_UNAVAILABLE'))).toBe(503);
    expect(statusFor(envelope('UNKNOWN'))).toBe(500);
  });
});

describe('resolveAdsAction iklan', () => {
  it('menyediakan handler untuk seluruh 16 action', () => {
    const service = serviceWith([]);
    for (const action of ACTIONS) {
      expect(resolveAdsAction(service, actor(), 'req-1', action)).toBeDefined();
    }
    expect(resolveAdsAction(service, actor(), 'req-1', 'ads.tidak.ada')).toBeUndefined();
  });

  it('meneruskan action ubah/hapus baru ke method service yang tepat', async () => {
    const ADV_ID = '22222222-2222-4222-8222-222222222222';
    const CRE_ID = '33333333-3333-4333-8333-333333333333';
    const CAM_ID = '44444444-4444-4344-8344-444444444444';
    const PLA_ID = '55555555-5555-4555-8555-555555555555';
    const pairs = [
      ['ads.advertiser.update', 'updateAdvertiser', { id: ADV_ID, name: 'Pengiklan Baru', expectedVersion: 1 }],
      ['ads.advertiser.delete', 'deleteAdvertiser', { id: ADV_ID }],
      ['ads.campaign.update', 'updateCampaign', { id: CAM_ID, name: 'Kampanye Baru', expectedVersion: 1 }],
      ['ads.campaign.delete', 'deleteCampaign', { id: CAM_ID }],
      ['ads.creative.update', 'updateCreative', { id: CRE_ID, kind: 'image', imageUrl: 'https://cdn.example/b.png', expectedVersion: 1 }],
      ['ads.creative.delete', 'deleteCreative', { id: CRE_ID }],
      ['ads.placement.delete', 'deletePlacement', { id: PLA_ID }],
    ] as const;
    for (const [action, method, payload] of pairs) {
      const calls: string[] = [];
      const handler = resolveAdsAction(serviceWith(calls), actor(), 'req-1', action);
      expect(handler).toBeDefined();
      await handler?.(payload);
      expect(calls).toEqual([method]);
    }
  });
});
