import { describe, expect, it } from 'vitest';

import {
  DASHBOARD_PERMISSIONS,
  DASHBOARD_PERMISSION_NAMES,
  SOLO_ADMIN_PERMISSION_NAMES,
  isDashboardPermission,
} from '@/modules/dashboard/permissions';

describe('DASHBOARD_PERMISSIONS', () => {
  it('memetakan kunci dasbor ke string permission kanonik', () => {
    expect(DASHBOARD_PERMISSIONS.dashboardRead).toBe('dashboard.read');
    expect(DASHBOARD_PERMISSIONS.domainManage).toBe('domain.manage');
    expect(DASHBOARD_PERMISSIONS.regionManage).toBe('region.manage');
    expect(DASHBOARD_PERMISSIONS.siteManage).toBe('site.manage');
    expect(DASHBOARD_PERMISSIONS.membershipManage).toBe('membership.manage');
    expect(DASHBOARD_PERMISSIONS.roleManage).toBe('role.manage');
    expect(DASHBOARD_PERMISSIONS.publisherVerify).toBe('publisher.verify');
    expect(DASHBOARD_PERMISSIONS.articleManage).toBe('article.manage');
    expect(DASHBOARD_PERMISSIONS.analyticsRead).toBe('analytics.read');
    expect(DASHBOARD_PERMISSIONS.auditRead).toBe('audit.read');
  });

  it('mendaftarkan semua nilai pada DASHBOARD_PERMISSION_NAMES', () => {
    for (const value of Object.values(DASHBOARD_PERMISSIONS)) {
      expect(DASHBOARD_PERMISSION_NAMES).toContain(value);
    }
    expect(new Set(DASHBOARD_PERMISSION_NAMES).size).toBe(DASHBOARD_PERMISSION_NAMES.length);
  });
});

describe('SOLO_ADMIN_PERMISSION_NAMES', () => {
  it('memberi admin solo akses baca tulis artikel dan baca audit', () => {
    expect(SOLO_ADMIN_PERMISSION_NAMES).toContain('dashboard.read');
    expect(SOLO_ADMIN_PERMISSION_NAMES).toContain('article.read');
    expect(SOLO_ADMIN_PERMISSION_NAMES).toContain('article.manage');
    expect(SOLO_ADMIN_PERMISSION_NAMES).toContain('analytics.read');
    expect(SOLO_ADMIN_PERMISSION_NAMES).toContain('audit.read');
  });

  it('membuang kendali domain, tim, dan verifikasi penerbit', () => {
    expect(SOLO_ADMIN_PERMISSION_NAMES).not.toContain('domain.manage');
    expect(SOLO_ADMIN_PERMISSION_NAMES).not.toContain('membership.manage');
    expect(SOLO_ADMIN_PERMISSION_NAMES).not.toContain('role.manage');
    expect(SOLO_ADMIN_PERMISSION_NAMES).not.toContain('publisher.manage');
    expect(SOLO_ADMIN_PERMISSION_NAMES).not.toContain('publisher.verify');
  });

  it('menyertakan media, publikasi, dan langganan lintas modul', () => {
    expect(SOLO_ADMIN_PERMISSION_NAMES).toContain('media.read');
    expect(SOLO_ADMIN_PERMISSION_NAMES).toContain('media.manage');
    expect(SOLO_ADMIN_PERMISSION_NAMES).toContain('publishing.request');
    expect(SOLO_ADMIN_PERMISSION_NAMES).toContain('api_key.read');
    expect(SOLO_ADMIN_PERMISSION_NAMES).toContain('api_key.manage');
    expect(SOLO_ADMIN_PERMISSION_NAMES).toContain('subscription.read');
  });
});

describe('isDashboardPermission', () => {
  it('menerima permission dasbor, publikasi, dan integrasi tenant', () => {
    expect(isDashboardPermission('dashboard.read')).toBe(true);
    expect(isDashboardPermission('site.manage')).toBe(true);
    expect(isDashboardPermission('media.read')).toBe(true);
    expect(isDashboardPermission('publishing.request')).toBe(true);
    expect(isDashboardPermission('api_key.manage')).toBe(true);
    expect(isDashboardPermission('subscription.read')).toBe(true);
  });

  it('menolak permission platform dan string asing', () => {
    expect(isDashboardPermission('platform.super_admin')).toBe(false);
    expect(isDashboardPermission('platform.content.manage')).toBe(false);
    expect(isDashboardPermission('tidak.ada')).toBe(false);
    expect(isDashboardPermission('')).toBe(false);
  });
});
