import { PUBLISHING_PERMISSIONS, PUBLISHING_PERMISSION_NAMES } from '@/modules/publishing/permissions';
import { INTEGRATIONS_PERMISSIONS, INTEGRATIONS_TENANT_PERMISSION_NAMES } from '@/modules/integrations/permissions';

export const DASHBOARD_PERMISSIONS = Object.freeze({
  dashboardRead: 'dashboard.read', domainRead: 'domain.read', domainManage: 'domain.manage',
  regionRead: 'region.read', regionManage: 'region.manage', siteRead: 'site.read', siteManage: 'site.manage',
  membershipRead: 'membership.read', membershipManage: 'membership.manage', roleManage: 'role.manage',
  publisherRead: 'publisher.read', publisherManage: 'publisher.manage', publisherVerify: 'publisher.verify',
  articleRead: 'article.read', articleManage: 'article.manage', analyticsRead: 'analytics.read', auditRead: 'audit.read',
} as const);

export const DASHBOARD_PERMISSION_NAMES = Object.freeze(Object.values(DASHBOARD_PERMISSIONS));

/** Pruned template for solo customer-org admins: no domain/team/billing/publisher control. */
export const SOLO_ADMIN_PERMISSION_NAMES = Object.freeze([
  DASHBOARD_PERMISSIONS.dashboardRead,
  DASHBOARD_PERMISSIONS.articleRead,
  DASHBOARD_PERMISSIONS.articleManage,
  DASHBOARD_PERMISSIONS.analyticsRead,
  DASHBOARD_PERMISSIONS.auditRead,
  DASHBOARD_PERMISSIONS.siteRead,
  DASHBOARD_PERMISSIONS.domainRead,
  DASHBOARD_PERMISSIONS.regionRead,
  DASHBOARD_PERMISSIONS.publisherRead,
  PUBLISHING_PERMISSIONS.mediaRead,
  PUBLISHING_PERMISSIONS.mediaManage,
  PUBLISHING_PERMISSIONS.publishingRead,
  PUBLISHING_PERMISSIONS.publishingRequest,
  INTEGRATIONS_PERMISSIONS.apiKeyRead,
  INTEGRATIONS_PERMISSIONS.apiKeyManage,
  INTEGRATIONS_PERMISSIONS.subscriptionRead,
] as const);

export function isDashboardPermission(value: string): boolean {
  return [...DASHBOARD_PERMISSION_NAMES, ...PUBLISHING_PERMISSION_NAMES, ...INTEGRATIONS_TENANT_PERMISSION_NAMES].includes(value as never);
}
