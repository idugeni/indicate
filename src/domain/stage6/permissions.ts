export const STAGE6_PERMISSIONS = Object.freeze({
  apiKeyRead: 'api_key.read',
  apiKeyManage: 'api_key.manage',
  telegramManage: 'telegram.manage',
  subscriptionRead: 'subscription.read',
  subscriptionManage: 'subscription.manage',
  customerAdmin: 'platform.customer.admin',
} as const);

export const STAGE6_TENANT_PERMISSION_NAMES = Object.freeze([
  STAGE6_PERMISSIONS.apiKeyRead,
  STAGE6_PERMISSIONS.apiKeyManage,
  STAGE6_PERMISSIONS.telegramManage,
  STAGE6_PERMISSIONS.subscriptionRead,
  STAGE6_PERMISSIONS.subscriptionManage,
] as const);
export const STAGE6_PLATFORM_PERMISSION_NAMES = Object.freeze([STAGE6_PERMISSIONS.customerAdmin] as const);
export const STAGE6_PERMISSION_NAMES = Object.freeze([...STAGE6_TENANT_PERMISSION_NAMES, ...STAGE6_PLATFORM_PERMISSION_NAMES]);
