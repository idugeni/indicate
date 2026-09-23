import { randomBytes } from 'node:crypto';

import type { MediaOwner } from '@/modules/publishing/models';

const EXTENSION_PATTERN = /(?:\.([a-z0-9]{1,10}))$/i;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const MEDIA_PURPOSES = [
  'article-inline',
  'article-cover',
  'article-image',
  'site-logo',
  'site-favicon',
  'site-default',
  'organization-asset',
] as const;

export type MediaPurpose = (typeof MEDIA_PURPOSES)[number];

const LEGACY_PURPOSE_MAP: Readonly<Record<string, MediaPurpose>> = {
  inline_article: 'article-inline',
  article_image: 'article-image',
  hero_banner: 'article-cover',
  logo: 'site-logo',
  favicon: 'site-favicon',
};

/** Top-level prefix routing published article bytes to the public bucket. */
export const PUBLIC_OBJECT_KEY_PREFIX = 'pub/';

/**
 * Purposes served as public bytes (article surfaces) rather than through
 * signed private URLs. Everything else stays in the private bucket.
 */
export const PUBLIC_MEDIA_PURPOSES: readonly MediaPurpose[] = ['article-cover', 'article-image'];

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

export function objectKeyPrefix(owner: MediaOwner): string {
  if (owner.kind === 'article') return `articles/${owner.articleId}/`;
  if (owner.kind === 'site') return `sites/${owner.siteId}/`;
  return 'assets/';
}

/**
 * Generate a 16-character collision token for new scoped object keys.
 *
 * @returns 16 lowercase hex characters carrying 64 bits of entropy.
 */
export function createCollisionToken(): string {
  return randomBytes(8).toString('hex');
}

/**
 * Normalize a legacy or free-form purpose to the canonical purpose enum.
 *
 * @param purpose - Raw purpose from reservation input or stored rows.
 * @returns Canonical purpose; falls back to `organization-asset` for unknown values.
 */
export function normalizePurpose(purpose: string): MediaPurpose {
  const normalized = purpose.trim().toLowerCase().replace(/_/g, '-');
  if ((MEDIA_PURPOSES as readonly string[]).includes(normalized)) return normalized as MediaPurpose;
  return LEGACY_PURPOSE_MAP[purpose] ?? LEGACY_PURPOSE_MAP[normalized] ?? 'organization-asset';
}

/**
 * Detect whether an object key uses the legacy flat layout.
 *
 * @param key - Stored R2 object key.
 * @returns True for `assets/`, `articles/`, or `sites/` prefixed keys.
 */
export function isLegacyMediaKey(key: string): boolean {
  return key.startsWith('assets/') || key.startsWith('articles/') || key.startsWith('sites/');
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

export function buildStructuredObjectKey(owner: MediaOwner, filename: string, collisionToken: string): string {
  const normalizedToken = collisionToken.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 64);
  if (normalizedToken.length < 12) throw new Error('Collision token must contain at least 12 safe characters.');
  const sanitized = sanitizeMediaFilename(filename);
  const extension = EXTENSION_PATTERN.exec(sanitized)?.[1];
  const stem = extension === undefined ? sanitized : sanitized.slice(0, -(extension.length + 1));
  const suffix = extension === undefined ? '' : `.${extension}`;
  return `${objectKeyPrefix(owner)}${stem}-${normalizedToken}${suffix}`;
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
