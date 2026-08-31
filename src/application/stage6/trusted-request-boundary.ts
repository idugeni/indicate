import { timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';

import { normalizeRequestHostname } from '@/shared/hostname/normalize-request-hostname';

export const safeSecretEqual = (left: string, right: string): boolean => {
  const a = Buffer.from(left); const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
};

/**
 * Accepts a network source only after proving the request used the exact control-plane
 * host and the Cloudflare-to-origin secret that Cloudflare must overwrite at the edge.
 * Direct Vercel/default-host requests cannot turn a caller-supplied source header into
 * a trusted rate-limit identity.
 */
export function trustedCloudflareSource(request: Request, expectedHostname: string, originSecret: string): string | null {
  const host = normalizeRequestHostname(request.headers.get('host'));
  if (!host.ok || host.hostname !== expectedHostname) return null;
  const proof = request.headers.get('x-indicate-cloudflare-origin');
  if (proof === null || !safeSecretEqual(proof, originSecret)) return null;
  const source = request.headers.get('cf-connecting-ip');
  return source !== null && isIP(source) !== 0 ? source : null;
}
