export const STAGE4_PERMISSIONS = Object.freeze({
  mediaRead: 'media.read',
  mediaManage: 'media.manage',
  publishingRead: 'publishing.read',
  publishingRequest: 'publishing.request',
  publishingProcess: 'publishing.process',
} as const);

export const STAGE4_PERMISSION_NAMES = Object.freeze(Object.values(STAGE4_PERMISSIONS));
