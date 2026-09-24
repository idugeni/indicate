import { describe, expect, it } from 'vitest';

import {
  INTEGRATIONS_PERMISSIONS,
  INTEGRATIONS_PLATFORM_PERMISSION_NAMES,
  INTEGRATIONS_TENANT_PERMISSION_NAMES,
} from '@/modules/integrations/permissions';

describe('INTEGRATIONS_PERMISSIONS', () => {
  it('memetakan kunci integrasi ke string permission kanonik', () => {
    expect(INTEGRATIONS_PERMISSIONS.apiKeyRead).toBe('api_key.read');
    expect(INTEGRATIONS_PERMISSIONS.apiKeyManage).toBe('api_key.manage');
    expect(INTEGRATIONS_PERMISSIONS.subscriptionRead).toBe('subscription.read');
    expect(INTEGRATIONS_PERMISSIONS.subscriptionManage).toBe('subscription.manage');
    expect(INTEGRATIONS_PERMISSIONS.superAdmin).toBe('platform.super_admin');
    expect(INTEGRATIONS_PERMISSIONS.customerAdmin).toBe('platform.customer.admin');
    expect(INTEGRATIONS_PERMISSIONS.contentManage).toBe('platform.content.manage');
    expect(INTEGRATIONS_PERMISSIONS.runtimeConfigManage).toBe('platform.runtime_config.manage');
    expect(INTEGRATIONS_PERMISSIONS.siteSettingsManage).toBe('site_settings.manage');
  });
});

describe('INTEGRATIONS_TENANT_PERMISSION_NAMES', () => {
  it('hanya berisi empat permission tenant tanpa grant platform', () => {
    expect([...INTEGRATIONS_TENANT_PERMISSION_NAMES]).toHaveLength(4);
    expect(INTEGRATIONS_TENANT_PERMISSION_NAMES).toContain('api_key.read');
    expect(INTEGRATIONS_TENANT_PERMISSION_NAMES).not.toContain('platform.super_admin');
    expect(INTEGRATIONS_TENANT_PERMISSION_NAMES).not.toContain('platform.customer.admin');
  });
});

describe('INTEGRATIONS_PLATFORM_PERMISSION_NAMES', () => {
  it('mendaftarkan grant platform aktif dan transisi', () => {
    expect([...INTEGRATIONS_PLATFORM_PERMISSION_NAMES]).toEqual([
      'platform.super_admin',
      'platform.customer.admin',
    ]);
  });
});
