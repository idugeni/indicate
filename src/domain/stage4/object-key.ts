import type { MediaOwner } from './models';

const EXTENSION_PATTERN = /(?:\.([a-z0-9]{1,10}))$/i;

export function sanitizeMediaFilename(filename: string): string {
  const basename = filename.replaceAll('\\', '/').split('/').at(-1) ?? 'file';
  const extension = EXTENSION_PATTERN.exec(basename)?.[1]?.toLowerCase();
  const stemSource = extension === undefined ? basename : basename.slice(0, -(extension.length + 1));
  const stem = stemSource.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 72) || 'file';
  return extension === undefined ? stem : `${stem}.${extension}`;
}

export function objectKeyPrefix(owner: MediaOwner): string {
  if (owner.kind === 'article') return `articles/${owner.articleId}/`;
  if (owner.kind === 'site') return `sites/${owner.siteId}/`;
  return 'assets/';
}

export function buildStructuredObjectKey(owner: MediaOwner, filename: string, collisionToken: string): string {
  const normalizedToken = collisionToken.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 64);
  if (normalizedToken.length < 12) throw new Error('Collision token must contain at least 12 safe characters.');
  const sanitized = sanitizeMediaFilename(filename);
  const extension = EXTENSION_PATTERN.exec(sanitized)?.[1];
  const stem = extension === undefined ? sanitized : sanitized.slice(0, -(extension.length + 1));
  const suffix = extension === undefined ? '' : `.${extension}`;
  return `${objectKeyPrefix(owner)}${stem}-${normalizedToken}${suffix}`;
}

export function hasRequiredObjectKeyPrefix(key: string, owner: MediaOwner): boolean {
  return key.startsWith(objectKeyPrefix(owner)) && key.length > objectKeyPrefix(owner).length;
}
