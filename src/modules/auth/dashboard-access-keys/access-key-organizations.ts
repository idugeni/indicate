import type { RoleTier } from '@/modules/dashboard/models';
import type { OrganizationOption } from '@/modules/dashboard/components/dashboard-workspace';
import { INTEGRATIONS_PERMISSIONS } from '@/modules/integrations/permissions';

export interface AccessKeyOrganization {
  readonly id: string;
  readonly name: string;
}

export interface BuildAccessKeyOrganizationOptionsInput {
  readonly activeOrganizations: readonly AccessKeyOrganization[];
  readonly boundOrganizationId: string;
  readonly roleTier: RoleTier;
  readonly organizationPermissions: readonly string[];
  readonly platformPermissions: readonly string[];
  readonly platformAdminTenantPermissions: readonly string[];
}

/**
 * Keep ordinary access keys bound to their issuing organization, while a
 * verified platform super-admin access key can switch across active tenants.
 * The key's bound organization is first so its verified membership remains the
 * initial dashboard context; the platform-wide snapshot is loaded per view.
 */
export function buildAccessKeyOrganizationOptions(
  input: BuildAccessKeyOrganizationOptionsInput,
): readonly OrganizationOption[] {
  const bound = input.activeOrganizations.find(({ id }) => id === input.boundOrganizationId);
  if (bound === undefined) return [];

  const isPlatformSuperAdmin = input.platformPermissions.includes(INTEGRATIONS_PERMISSIONS.superAdmin);
  const organizations = isPlatformSuperAdmin
    ? [bound, ...input.activeOrganizations.filter(({ id }) => id !== bound.id)]
    : [bound];

  return organizations.map(({ id, name }) => ({
    id,
    name,
    role: isPlatformSuperAdmin ? 'superadmin' : input.roleTier,
    permissions: isPlatformSuperAdmin
      ? [...input.platformAdminTenantPermissions, ...input.platformPermissions]
      : [...input.organizationPermissions, ...input.platformPermissions],
  }));
}
