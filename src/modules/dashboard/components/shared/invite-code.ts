/**
 * Build a single-use invite secret and its SHA-256 token hash.
 *
 * @remarks The wire format stays `organizationId:email:secret`; only the hash
 * leaves the browser. Email is lowercased before hashing so redeem matches
 * create regardless of input casing.
 */
export async function createInviteSecret(): Promise<string> {
  const secretBytes = new Uint8Array(24);
  crypto.getRandomValues(secretBytes);
  return btoa(String.fromCharCode(...secretBytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function hashInviteCode(
  organizationId: string,
  email: string,
  secret: string,
): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${organizationId}:${email.toLowerCase()}:${secret}`),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function formatInviteCode(organizationId: string, email: string, secret: string): string {
  return `${organizationId}:${email}:${secret}`;
}
