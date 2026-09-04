import 'server-only';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

import type { PendingHostnameProbePort } from '@/core/hostname/ports';
import { normalizeRequestHostname } from '@/core/hostname/normalize-request-hostname';
import { tracedFetch } from '@/core/observability/traced-fetch';

const ATTEMPT_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const PROBE_TIMEOUT_MS = 10_000;

function isPublicUnicastIp(address: string): boolean {
  if (isIP(address) === 0) return false;
  if (isIP(address) === 4) {
    const octets = address.split('.').map(Number);
    const [a = 0, b = 0] = octets;
    if (a === 10) return false;
    if (a === 127) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a >= 224) return false;
    if (a === 0 || a === 192) return false;
    if (a === 198 && (b === 18 || b === 19)) return false;
    if (a === 203 && b === 0 && octets[2] === 113) return false;
    if (a === 192 && b === 0 && (octets[2] === 0 || octets[2] === 2)) return false;
    return true;
  }
  const lower = address.toLowerCase();
  if (lower === '::1' || lower === '::') return false;
  if (lower.startsWith('fe80:') || lower.startsWith('fec0:')) return false;
  if (lower.startsWith('ff')) return false;
  if (lower.startsWith('fc') || lower.startsWith('fd')) return false;
  if (lower.startsWith('2001:db8:')) return false;
  if (lower === '::ffff:0:0' || lower.startsWith('::ffff:0:0:')) return false;
  return true;
}

/** HTTPS pending-hostname probe with SSRF guardrails: DNS pinned to public unicast, no redirects, attempt echoed via header. TOCTOU residual needs zone proof + domain association. */
export class HttpsPendingHostnameProbe implements PendingHostnameProbePort {
  async verifyPendingHostname(hostname: string, attemptId: string, requestId?: string): Promise<boolean> {
    const normalized = normalizeRequestHostname(hostname);
    if (!normalized.ok || !ATTEMPT_ID_PATTERN.test(attemptId)) return false;
    try {
      const addresses = await lookup(normalized.hostname, { all: true });
      if (addresses.length === 0 || !addresses.every((entry) => isPublicUnicastIp(entry.address))) {
        return false;
      }
    } catch {
      return false;
    }
    try {
      const response = await tracedFetch(
        `https://${normalized.hostname}/domain-pending?attempt=${encodeURIComponent(attemptId)}`,
        {
          redirect: 'manual',
          headers: { 'User-Agent': 'indicate-domain-probe/1' },
          cache: 'no-store',
        },
        { requestId, service: 'domain-pending-probe', operation: 'verify', timeoutMs: PROBE_TIMEOUT_MS },
      );
      return (
        response.status === 425 &&
        response.headers.get('x-robots-tag') === 'noindex, nofollow' &&
        response.headers.get('x-indicate-pending-attempt') === attemptId
      );
    } catch {
      return false;
    }
  }
}
