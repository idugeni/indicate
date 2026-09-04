export const PUBLISHING_PERMISSIONS = Object.freeze({
  mediaRead: 'media.read',
  mediaManage: 'media.manage',
  publishingRead: 'publishing.read',
  publishingRequest: 'publishing.request',
  publishingProcess: 'publishing.process',
} as const);

export const PUBLISHING_PERMISSION_NAMES = Object.freeze(Object.values(PUBLISHING_PERMISSIONS));
