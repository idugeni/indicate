import { describe, expect, it } from 'vitest';

import { DASHBOARD_PERMISSIONS } from '@/modules/dashboard/permissions';
import { INTEGRATIONS_PERMISSIONS } from '@/modules/integrations/permissions';
import { ALL_VIEWS, VIEW_REGISTRY, visibleNavGroups } from '@/modules/dashboard/components/view-registry';

describe('Dashboard V2 view registry', () => {
  it('registers all 19 dashboard views with explicit metadata', () => {
    expect(ALL_VIEWS).toHaveLength(19);
    for (const view of ALL_VIEWS) {
      expect(VIEW_REGISTRY[view].title.trim()).not.toBe('');
      expect(VIEW_REGISTRY[view].description.trim()).not.toBe('');
    }
  });
});

describe('AI control-plane view registry', () => {
  it('mendaftarkan view ai di grup system dengan gating aiManage', () => {
    expect(ALL_VIEWS).toContain('ai');
    expect(VIEW_REGISTRY.ai.label).toBe('AI Control');
    expect(VIEW_REGISTRY.ai.group).toBe('system');
    expect(VIEW_REGISTRY.ai.requiredPermission).toBe(INTEGRATIONS_PERMISSIONS.aiManage);
  });

  it('menyembunyikan ai dari aktor tanpa grant aiManage', () => {
    const groups = visibleNavGroups(new Set([INTEGRATIONS_PERMISSIONS.apiKeyRead]));
    const system = groups.find((group) => group.id === 'system');
    expect(system?.views).not.toContain('ai');
  });

  it('menampilkan ai untuk aktor platform dengan grant aiManage', () => {
    const groups = visibleNavGroups(new Set([INTEGRATIONS_PERMISSIONS.aiManage]));
    const system = groups.find((group) => group.id === 'system');
    expect(system?.views).toContain('ai');
  });
});

describe('Ads view registry', () => {
  it('mendaftarkan view ads di grup publishing dengan gating siteManage', () => {
    expect(ALL_VIEWS).toContain('ads');
    expect(VIEW_REGISTRY.ads.label).toBe('Monetization');
    expect(VIEW_REGISTRY.ads.group).toBe('publishing');
    expect(VIEW_REGISTRY.ads.requiredPermission).toBe(DASHBOARD_PERMISSIONS.siteManage);
  });

  it('menyembunyikan ads dari aktor tanpa grant siteManage', () => {
    const groups = visibleNavGroups(new Set(['article.read']));
    const publishing = groups.find((group) => group.id === 'publishing');
    expect(publishing?.views).not.toContain('ads');
  });

  it('menampilkan ads untuk pengelola situs', () => {
    const groups = visibleNavGroups(new Set([DASHBOARD_PERMISSIONS.siteManage]));
    const publishing = groups.find((group) => group.id === 'publishing');
    expect(publishing?.views).toContain('ads');
  });
});
