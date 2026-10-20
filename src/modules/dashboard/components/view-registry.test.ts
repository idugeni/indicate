import { describe, expect, it } from 'vitest';

import { DASHBOARD_PERMISSIONS } from '@/modules/dashboard/permissions';
import { INTEGRATIONS_PERMISSIONS } from '@/modules/integrations/permissions';
import {
  ALL_VIEWS,
  canAccessView,
  canAccessViewInMode,
  PRIMARY_NAV_AREAS,
  VIEW_REGISTRY,
  visibleNavGroups,
} from '@/modules/dashboard/components/view-registry';

describe('Dashboard V2 view registry', () => {
  it('registers all 23 dashboard views with explicit metadata', () => {
    expect(ALL_VIEWS).toHaveLength(23);
    for (const view of ALL_VIEWS) {
      expect(VIEW_REGISTRY[view].title.trim()).not.toBe('');
      expect(VIEW_REGISTRY[view].description.trim()).not.toBe('');
    }
  });
});

describe('Authenticated dashboard mode boundaries', () => {
  it('keeps top-level navigation separate while preserving authorized platform workflows', () => {
    const platformPermissions = new Set([
      INTEGRATIONS_PERMISSIONS.superAdmin,
      INTEGRATIONS_PERMISSIONS.aiManage,
      INTEGRATIONS_PERMISSIONS.customerAdmin,
      INTEGRATIONS_PERMISSIONS.contentManage,
    ]);

    expect(canAccessViewInMode('customers', platformPermissions, 'platform')).toBe(true);
    expect(canAccessViewInMode('articles', platformPermissions, 'platform')).toBe(true);
    expect(canAccessViewInMode('customers', platformPermissions, 'organization')).toBe(false);
    expect(canAccessViewInMode('articles', platformPermissions, 'organization')).toBe(true);
  });
});

describe('Primary dashboard navigation', () => {
  it('exposes exactly two tenant areas and separates platform control-plane navigation', () => {
    const tenantAreas = PRIMARY_NAV_AREAS.filter((area) => area.scope === 'organization');
    expect(tenantAreas.map((area) => area.label)).toEqual([
      'Dashboard',
      'Artikel',
      'Organisasi',
    ]);
    expect(tenantAreas.map((area) => area.navigationViews)).toEqual([
      ['dashboard'],
      ['articles', 'editorial', 'media'],
      ['organization', 'memberships', 'invoices'],
    ]);
    expect(PRIMARY_NAV_AREAS.find((area) => area.id === 'articles')?.views).toEqual([
      'articles',
      'editorial',
      'media',
    ]);
    expect(canAccessViewInMode('memberships', new Set([DASHBOARD_PERMISSIONS.membershipRead]), 'organization')).toBe(true);
    expect(canAccessViewInMode('invoices', new Set([INTEGRATIONS_PERMISSIONS.subscriptionRead]), 'organization')).toBe(true);
    expect(canAccessViewInMode('memberships', new Set([DASHBOARD_PERMISSIONS.membershipRead]), 'platform')).toBe(false);
    expect(canAccessViewInMode('invoices', new Set([INTEGRATIONS_PERMISSIONS.subscriptionRead]), 'platform')).toBe(false);

    const organizationPermissions = new Set<string>();
    for (const restrictedView of ['publishing', 'published', 'taxonomy', 'publishers'] as const) {
      expect(canAccessViewInMode(restrictedView, organizationPermissions, 'organization')).toBe(false);
      expect(canAccessViewInMode(restrictedView, organizationPermissions, 'platform')).toBe(true);
    }
    expect(PRIMARY_NAV_AREAS.filter((area) => area.scope === 'platform').map((area) => area.label)).toEqual(['Super Admin']);
    for (const scope of ['organization', 'platform'] as const) {
      const scopedViews = PRIMARY_NAV_AREAS.filter((area) => area.scope === scope).flatMap((area) => area.views);
      expect(new Set(scopedViews).size).toBe(scopedViews.length);
    }
    const groupedViews = PRIMARY_NAV_AREAS.flatMap((area) => area.views);
    expect(groupedViews).toEqual(expect.arrayContaining([...ALL_VIEWS]));
  });

  it('retains permission gating for supporting views inside primary areas', () => {
    const platform = PRIMARY_NAV_AREAS.find((area) => area.id === 'super-admin');
    expect(platform?.views).toContain('customers');
    expect(platform?.views).toContain('configuration');
    expect(platform?.views).toContain('settings');
    expect(platform?.views).toContain('operations');
    expect(canAccessView('customers', new Set([DASHBOARD_PERMISSIONS.auditRead]))).toBe(false);
    expect(canAccessView('customers', new Set([INTEGRATIONS_PERMISSIONS.superAdmin]))).toBe(true);
    const organization = PRIMARY_NAV_AREAS.find((area) => area.id === 'organization');
    expect(organization?.views).toContain('organization');
    expect(organization?.views).not.toContain('configuration');
    expect(organization?.views).not.toContain('settings');
    expect(organization?.views).not.toContain('operations');
    expect(canAccessView('ads', new Set(['article.read']))).toBe(false);
  });
});

describe('AI control-plane view registry', () => {
  it('mendaftarkan view ai di grup system dengan grants yang diterima layanan', () => {
    expect(ALL_VIEWS).toContain('ai');
    expect(VIEW_REGISTRY.ai.label).toBe('AI Control');
    expect(VIEW_REGISTRY.ai.group).toBe('system');
    expect(VIEW_REGISTRY.ai.requiredAnyPermission).toEqual([
      INTEGRATIONS_PERMISSIONS.aiManage,
      INTEGRATIONS_PERMISSIONS.superAdmin,
      INTEGRATIONS_PERMISSIONS.customerAdmin,
    ]);
  });

  it('menyembunyikan ai dari aktor tanpa grant aiManage', () => {
    const groups = visibleNavGroups(new Set([INTEGRATIONS_PERMISSIONS.apiKeyRead]));
    const system = groups.find((group) => group.id === 'system');
    expect(system?.views).not.toContain('ai');
  });

  it('menampilkan ai untuk grant AI spesifik maupun grant platform yang diterima layanan', () => {
    for (const permission of [
      INTEGRATIONS_PERMISSIONS.aiManage,
      INTEGRATIONS_PERMISSIONS.superAdmin,
      INTEGRATIONS_PERMISSIONS.customerAdmin,
    ]) {
      const groups = visibleNavGroups(new Set([permission]));
      const system = groups.find((group) => group.id === 'system');
      expect(system?.views).toContain('ai');
    }
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


describe('Dashboard V2 direct view authorization', () => {
  it('rejects direct navigation when the required permission is missing', () => {
    expect(canAccessView('customers', new Set([DASHBOARD_PERMISSIONS.auditRead]))).toBe(false);
    expect(canAccessView('billing', new Set([INTEGRATIONS_PERMISSIONS.subscriptionRead]))).toBe(false);
    expect(canAccessView('moderation', new Set([DASHBOARD_PERMISSIONS.auditRead]))).toBe(false);
    expect(canAccessView('ai', new Set([INTEGRATIONS_PERMISSIONS.apiKeyRead]))).toBe(false);
  });

  it('aligns platform view visibility with service-level grants', () => {
    expect(canAccessView('customers', new Set([INTEGRATIONS_PERMISSIONS.superAdmin]))).toBe(true);
    expect(canAccessView('customers', new Set([INTEGRATIONS_PERMISSIONS.customerAdmin]))).toBe(true);
    expect(canAccessView('billing', new Set([INTEGRATIONS_PERMISSIONS.superAdmin]))).toBe(true);
    expect(canAccessView('billing', new Set([INTEGRATIONS_PERMISSIONS.customerAdmin]))).toBe(true);
    expect(canAccessView('moderation', new Set([INTEGRATIONS_PERMISSIONS.superAdmin]))).toBe(true);
    expect(canAccessView('moderation', new Set([INTEGRATIONS_PERMISSIONS.customerAdmin]))).toBe(true);
    expect(canAccessView('ai', new Set([INTEGRATIONS_PERMISSIONS.aiManage]))).toBe(true);
    expect(canAccessView('ai', new Set([INTEGRATIONS_PERMISSIONS.superAdmin]))).toBe(true);
    expect(canAccessView('ai', new Set([INTEGRATIONS_PERMISSIONS.customerAdmin]))).toBe(true);
    expect(canAccessView('dashboard', new Set())).toBe(true);
  });
});
