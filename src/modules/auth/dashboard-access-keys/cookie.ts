export const DASHBOARD_ACCESS_KEY_COOKIE = 'indicate-access-key';

/**
 * Read the dashboard access-key bearer from a raw Cookie header value.
 *
 * @param cookieHeader - Raw `cookie` header, or null when absent.
 * @returns Credential plaintext, or null when the cookie is missing.
 */
export function readAccessKeyCookie(cookieHeader: string | null): string | null {
  if (cookieHeader === null || cookieHeader === '') return null;
  const prefix = `${DASHBOARD_ACCESS_KEY_COOKIE}=`;
  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim();
    if (!trimmed.startsWith(prefix)) continue;
    const value = decodeURIComponent(trimmed.slice(prefix.length));
    return value === '' ? null : value;
  }
  return null;
}

export interface AccessKeyCookieOptions {
  readonly secure: boolean;
  readonly maxAgeSeconds: number;
}

/**
 * Render a hardened Set-Cookie value for the access-key bearer.
 *
 * @param plaintext - Credential to persist for subsequent dashboard reads.
 * @param options - Transport security and lifetime bounds.
 * @returns Cookie header value with HttpOnly, Lax, and scoped path.
 */
export function renderAccessKeyCookie(plaintext: string, options: AccessKeyCookieOptions): string {
  const segments = [
    `${DASHBOARD_ACCESS_KEY_COOKIE}=${encodeURIComponent(plaintext)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
  ];
  if (options.secure) segments.push('Secure');
  segments.push(`Max-Age=${Math.max(1, Math.floor(options.maxAgeSeconds))}`);
  return segments.join('; ');
}

/**
 * Render an expired Set-Cookie value that clears the access-key bearer.
 *
 * @returns Cookie header value that drops the bearer immediately.
 */
export function renderClearedAccessKeyCookie(): string {
  return `${DASHBOARD_ACCESS_KEY_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
