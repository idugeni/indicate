import { TIPTAP_MAX_URL_LENGTH, UUID_PATTERN } from '@/modules/site/tiptap-document/types';

function isPrivateHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/u, '');
  if (host === 'localhost' || host === '::1' || host === '[::1]' || host === '0.0.0.0') return true;
  if (host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.test') || host.endsWith('.example')) return true;
  if (/^127\./u.test(host)) return true;
  if (/^10\./u.test(host)) return true;
  if (/^192\.168\./u.test(host)) return true;
  const private172 = /^172\.(1[6-9]|2[0-9]|3[0-1])\./u;
  if (private172.test(host)) return true;
  if (host.startsWith('[')) return host === '[::1]' || host.startsWith('[fe80:') || host.startsWith('[fc00:') || host.startsWith('[fd00:');
  return false;
}

/**
 * Validate an absolute http(s) URL against safe protocols and public hosts.
 *
 * @param value - Candidate URL string.
 * @returns True for absolute http/https URLs without credentials on non-private hosts.
 */
export function isSafeHttpUrl(value: string): boolean {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (trimmed === '' || trimmed.length > TIPTAP_MAX_URL_LENGTH) return false;
  if (/[\s<>"\\]/u.test(trimmed)) return false;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
  if (parsed.username !== '' || parsed.password !== '') return false;
  if (parsed.hostname === '') return false;
  if (isPrivateHostname(parsed.hostname)) return false;
  return true;
}

/**
 * Validate an editorial link target: relative site paths or safe http(s) URLs.
 *
 * @param value - Candidate href from TipTap content.
 * @returns True when the href is a safe in-site path or public http(s) URL.
 */
export function isSafeLinkUrl(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (trimmed === '' || trimmed.length > TIPTAP_MAX_URL_LENGTH) return false;
  if (/[\s<>"\\]/u.test(trimmed)) return false;
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('blob:') || lower.startsWith('file:') || lower.startsWith('vbscript:')) return false;
  if (trimmed.startsWith('/')) {
    if (trimmed.startsWith('//')) return false;
    return true;
  }
  if (/^[a-z][a-z0-9+.-]*:/iu.test(trimmed)) return isSafeHttpUrl(trimmed);
  return false;
}

/**
 * Validate an inline media source: durable media refs, site-relative paths, or https URLs.
 *
 * @param value - Candidate image `src` from TipTap content.
 * @returns True for `media:<uuid>`, safe site-relative paths, or public https URLs.
 */
export function isSafeMediaSrc(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (trimmed === '' || trimmed.length > TIPTAP_MAX_URL_LENGTH) return false;
  if (/[\s<>"\\]/u.test(trimmed)) return false;
  if (trimmed.startsWith('media:')) return UUID_PATTERN.test(trimmed.slice('media:'.length));
  if (trimmed.startsWith('r2:')) return trimmed.length > 3;
  if (trimmed.startsWith('/')) {
    if (trimmed.startsWith('//')) return false;
    return true;
  }
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('blob:') || lower.startsWith('file:') || lower.startsWith('vbscript:')) return false;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') return false;
    if (parsed.username !== '' || parsed.password !== '') return false;
    if (parsed.hostname === '' || isPrivateHostname(parsed.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve a durable media reference to a site-relative public URL.
 *
 * @param src - Stored image source (`media:<uuid>` or a URL/path).
 * @returns Site-relative media URL for `media:` refs; the input otherwise.
 */
export function resolveMediaSrc(src: string): string {
  const trimmed = src.trim();
  if (trimmed.startsWith('media:')) {
    const id = trimmed.slice('media:'.length);
    if (UUID_PATTERN.test(id)) return `/api/network/media/${id}`;
  }
  return trimmed;
}

/**
 * Resolve a durable media reference to its listing-thumbnail variant.
 *
 * @param src - Stored image source (`media:<uuid>` or a site media path).
 * @returns Thumbnail URL (`?variant=thumb`) for internal media refs; null otherwise.
 */
export function resolveMediaThumbSrc(src: string): string | null {
  const trimmed = src.trim();
  if (trimmed.startsWith('media:')) {
    const id = trimmed.slice('media:'.length);
    if (UUID_PATTERN.test(id)) return `/api/network/media/${id}?variant=thumb`;
    return null;
  }
  if (trimmed.startsWith('/api/network/media/')) {
    const rest = trimmed.slice('/api/network/media/'.length);
    const id = rest.split(/[?#]/u)[0] ?? '';
    if (!UUID_PATTERN.test(id)) return null;
    if (/[?&#]variant=thumb(?:[&#]|$)/u.test(trimmed)) return trimmed;
    const hashIndex = trimmed.indexOf('#');
    const withoutHash = hashIndex === -1 ? trimmed : trimmed.slice(0, hashIndex);
    const hash = hashIndex === -1 ? '' : trimmed.slice(hashIndex);
    const separator = withoutHash.includes('?') ? '&' : '?';
    return `${withoutHash}${separator}variant=thumb${hash}`;
  }
  return null;
}
