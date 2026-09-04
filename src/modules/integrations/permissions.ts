export const INTEGRATIONS_PERMISSIONS = Object.freeze({
  apiKeyRead: 'api_key.read',
  apiKeyManage: 'api_key.manage',
  telegramManage: 'telegram.manage',
  subscriptionRead: 'subscription.read',
  subscriptionManage: 'subscription.manage',
  /** Canonical platform grant (replaces customerAdmin). */
  superAdmin: 'platform.super_admin',
  /** @deprecated Kept for transition; honored alongside superAdmin until removal. */
  customerAdmin: 'platform.customer.admin',
} as const);

export const INTEGRATIONS_TENANT_PERMISSION_NAMES = Object.freeze([
  INTEGRATIONS_PERMISSIONS.apiKeyRead,
  INTEGRATIONS_PERMISSIONS.apiKeyManage,
  INTEGRATIONS_PERMISSIONS.telegramManage,
  INTEGRATIONS_PERMISSIONS.subscriptionRead,
  INTEGRATIONS_PERMISSIONS.subscriptionManage,
] as const);
export const INTEGRATIONS_PLATFORM_PERMISSION_NAMES = Object.freeze([INTEGRATIONS_PERMISSIONS.superAdmin, INTEGRATIONS_PERMISSIONS.customerAdmin] as const);
