export const STAGE3_PERMISSIONS = Object.freeze({
  dashboardRead: 'dashboard.read', domainRead: 'domain.read', domainManage: 'domain.manage',
  regionRead: 'region.read', regionManage: 'region.manage', siteRead: 'site.read', siteManage: 'site.manage',
  membershipRead: 'membership.read', membershipManage: 'membership.manage', roleManage: 'role.manage',
  publisherRead: 'publisher.read', publisherManage: 'publisher.manage', publisherVerify: 'publisher.verify',
  articleRead: 'article.read', articleManage: 'article.manage', analyticsRead: 'analytics.read', auditRead: 'audit.read',
} as const);

export const STAGE3_PERMISSION_NAMES = Object.freeze(Object.values(STAGE3_PERMISSIONS));

export function isStage3Permission(value: string): boolean {
  return STAGE3_PERMISSION_NAMES.includes(value as (typeof STAGE3_PERMISSION_NAMES)[number]);
}
