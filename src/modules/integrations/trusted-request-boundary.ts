import { timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';

import { normalizeRequestHostname } from '@/core/hostname/normalize-request-hostname';

export const isSecretEqual = (left: string, right: string): boolean => {
  const a = Buffer.from(left); const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
};

/** Trusts a network source only via exact control-plane host + Cloudflare origin secret proof. */
export function trustedCloudflareSource(request: Request, expectedHostname: string, originSecret: string): string | null {
  const host = normalizeRequestHostname(request.headers.get('host'));
  if (!host.ok || host.hostname !== expectedHostname) return null;
  const proof = request.headers.get('x-indicate-cloudflare-origin');
  if (proof === null || !isSecretEqual(proof, originSecret)) return null;
  const source = request.headers.get('cf-connecting-ip');
  return source !== null && isIP(source) !== 0 ? source : null;
}
