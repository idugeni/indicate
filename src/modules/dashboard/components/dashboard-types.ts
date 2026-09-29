import type { DashboardSnapshot, RoleTier } from '@/modules/dashboard/models';
import type {
  IconComponent as RegistryIconComponent,
  View,
  ViewGroup,
  ViewMetadata,
} from '@/modules/dashboard/components/view-registry';

export type { DashboardSnapshot };
export type { View, ViewGroup, ViewMetadata };
export type IconComponent = RegistryIconComponent;

/** Membership tier bound to `roles.tier`; `superadmin` is platform-org only (DB trigger guards it). */
export type MemberRole = RoleTier;

export interface OrganizationOption {
  readonly id: string;
  readonly name: string;
  readonly slug?: string;
  readonly role?: MemberRole;
  /** Union of org + platform permission names for this org; drives granular nav gating. */
  readonly permissions?: readonly string[];
  readonly status?: 'active' | 'suspended' | 'provisioning';
}
