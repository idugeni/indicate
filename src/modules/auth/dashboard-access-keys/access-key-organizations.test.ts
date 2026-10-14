import { describe, expect, it } from 'vitest';

import { INTEGRATIONS_PERMISSIONS } from '@/modules/integrations/permissions';
import { buildAccessKeyOrganizationOptions } from '@/modules/auth/dashboard-access-keys/access-key-organizations';

const ACTIVE_ORGANIZATIONS = [
  { id: 'org-a', name: 'Organisasi A' },
  { id: 'org-b', name: 'Organisasi B' },
  { id: 'org-c', name: 'Organisasi C' },
] as const;

describe('buildAccessKeyOrganizationOptions', () => {
  it('exposes all active organizations to a verified platform super-admin and keeps the key tenant first', () => {
    const organizations = buildAccessKeyOrganizationOptions({
      activeOrganizations: ACTIVE_ORGANIZATIONS,
      boundOrganizationId: 'org-b',
      roleTier: 'admin',
      organizationPermissions: ['article.read'],
      platformPermissions: [INTEGRATIONS_PERMISSIONS.superAdmin],
      platformAdminTenantPermissions: ['article.manage', 'publisher.manage'],
    });

    expect(organizations.map(({ id }) => id)).toEqual(['org-b', 'org-a', 'org-c']);
    expect(organizations.every(({ role }) => role === 'superadmin')).toBe(true);
    expect(organizations.every(({ permissions }) => permissions.includes('article.manage'))).toBe(true);
    expect(organizations.every(({ permissions }) => permissions.includes(INTEGRATIONS_PERMISSIONS.superAdmin))).toBe(true);
  });

  it('keeps a regular access key limited to its bound organization and grants', () => {
    const organizations = buildAccessKeyOrganizationOptions({
      activeOrganizations: ACTIVE_ORGANIZATIONS,
      boundOrganizationId: 'org-b',
      roleTier: 'editor',
      organizationPermissions: ['article.read'],
      platformPermissions: [],
      platformAdminTenantPermissions: ['article.manage', 'publisher.manage'],
    });

    expect(organizations).toEqual([{
      id: 'org-b',
      name: 'Organisasi B',
      role: 'editor',
      permissions: ['article.read'],
    }]);
  });

  it('returns no organizations when the bound tenant is not active', () => {
    expect(buildAccessKeyOrganizationOptions({
      activeOrganizations: ACTIVE_ORGANIZATIONS,
      boundOrganizationId: 'org-archived',
      roleTier: 'admin',
      organizationPermissions: ['article.read'],
      platformPermissions: [INTEGRATIONS_PERMISSIONS.superAdmin],
      platformAdminTenantPermissions: ['article.manage'],
    })).toEqual([]);
  });
});
