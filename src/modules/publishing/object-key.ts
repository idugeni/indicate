import type { MediaOwner } from '@/modules/publishing/models';

const EXTENSION_PATTERN = /(?:\.([a-z0-9]{1,10}))$/i;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const MEDIA_PURPOSES = [
  'article-inline',
  'article-cover',
  'site-logo',
  'site-favicon',
  'site-default',
  'organization-asset',
] as const;

export type MediaPurpose = (typeof MEDIA_PURPOSES)[number];

/** Top-level prefix routing published article bytes to the public bucket. */
export const PUBLIC_OBJECT_KEY_PREFIX = 'pub/';

/**
 * Purposes served as public bytes (featured covers) rather than through
 * signed private URLs. Everything else stays in the private bucket.
 */
export const PUBLIC_MEDIA_PURPOSES: readonly MediaPurpose[] = ['article-cover'];

/**
 * Decide whether a purpose is served from the public bucket.
 *
 * @param purpose - Canonical media purpose.
 * @returns True for article surface bytes; fail-closed to private otherwise.
 */
export function isPublicPurpose(purpose: string): boolean {
  return (PUBLIC_MEDIA_PURPOSES as readonly string[]).includes(purpose);
}

/**
 * Decide whether a stored key lives in the public bucket.
 *
 * @param key - Stored R2 object key.
 * @returns True for `pub/`-prefixed keys; fail-closed to private otherwise.
 */
export function isPublicObjectKey(key: string): boolean {
  return key.startsWith(PUBLIC_OBJECT_KEY_PREFIX);
}

function sanitizeMediaFilename(filename: string): string {
  const basename = filename.replaceAll('\\', '/').split('/').at(-1) ?? 'file';
  const extension = EXTENSION_PATTERN.exec(basename)?.[1]?.toLowerCase();
  const stemSource = extension === undefined ? basename : basename.slice(0, -(extension.length + 1));
  const stem = stemSource.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 72) || 'file';
  return extension === undefined ? stem : `${stem}.${extension}`;
}

/**
 * Derives the listing-thumbnail key from a full object key by inserting a
 * `-thumb` infix before the extension. Deterministic: the server derives it
 * from the reserved key and never trusts a client-supplied thumb key.
 */
export function buildThumbObjectKey(objectKey: string): string {
  const extension = EXTENSION_PATTERN.exec(objectKey)?.[1];
  const suffix = extension === undefined ? '' : `.${extension}`;
  const base = extension === undefined ? objectKey : objectKey.slice(0, -(extension.length + 1));
  return `${base}-thumb${suffix}`;
}

/**
 * Build the tenant-scoped object key for new uploads.
 *
 * @param input - Owner, organization, canonical purpose, filename, 16-char token, timestamp, and visibility.
 * @returns Scoped key shaped as `o/{org}/p/{purpose}/y=/m=/{owner}/{day}-{stem}-{token}.{ext}`, prefixed with `pub/` for public bytes.
 * @throws {Error} When organization, purpose, owner, or token fails validation.
 */
export function buildScopedObjectKey(input: {
  readonly owner: MediaOwner;
  readonly organizationId: string;
  readonly purpose: MediaPurpose;
  readonly filename: string;
  readonly collisionToken: string;
  readonly now: Date;
  readonly visibility?: 'private' | 'public' | undefined;
}): string {
  if (!UUID_PATTERN.test(input.organizationId)) throw new Error('Organization id must be a UUID.');
  if (!(MEDIA_PURPOSES as readonly string[]).includes(input.purpose)) throw new Error('Unknown media purpose.');
  const normalizedToken = input.collisionToken.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16);
  if (normalizedToken.length !== 16) throw new Error('Collision token must resolve to exactly 16 safe characters.');
  const sanitized = sanitizeMediaFilename(input.filename);
  const extension = EXTENSION_PATTERN.exec(sanitized)?.[1];
  const stem = extension === undefined ? sanitized : sanitized.slice(0, -(extension.length + 1));
  const suffix = extension === undefined ? '' : `.${extension}`;
  const year = input.now.getUTCFullYear();
  const month = String(input.now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(input.now.getUTCDate()).padStart(2, '0');
  const ownerSegment =
    input.owner.kind === 'article'
      ? `article/${input.owner.articleId}`
      : input.owner.kind === 'site'
        ? `site/${input.owner.siteId}`
        : 'organization';
  if (input.owner.kind === 'article' && !UUID_PATTERN.test(input.owner.articleId)) throw new Error('Article id must be a UUID.');
  if (input.owner.kind === 'site' && !UUID_PATTERN.test(input.owner.siteId)) throw new Error('Site id must be a UUID.');
  const scoped = `o/${input.organizationId}/p/${input.purpose}/y=${year}/m=${month}/${ownerSegment}/${day}-${stem}-${normalizedToken}${suffix}`;
  return input.visibility === 'public' ? `${PUBLIC_OBJECT_KEY_PREFIX}${scoped}` : scoped;
}
