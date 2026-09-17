export const API_COMMANDS = [
  'article.create',
  'media.reserve',
  'media.complete',
  'publication.request',
  'publication.requestBulk',
  'publication.suggest',
  'publication.retry',
  'publication.unpublish',
  'publication.status',
] as const;

export type ApiCommand = (typeof API_COMMANDS)[number];

export function apiCommandScope(action: ApiCommand): string {
  if (action.startsWith('article.')) return 'article.manage';
  if (action.startsWith('media.')) return 'media.manage';
  if (action === 'publication.status') return 'publishing.read';
  return 'publishing.request';
}
