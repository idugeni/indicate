import 'server-only';
import { lookup } from 'node:dns/promises';
import { request as httpsRequest } from 'node:https';
import { isIP } from 'node:net';

import type { PendingHostnameProbePort } from '@/core/hostname/ports';
import { normalizeRequestHostname } from '@/core/hostname/normalize-request-hostname';
import { REQUEST_ID_HEADER } from '@/core/observability/request-id';
import { logEvent } from '@/core/observability/logger';

const ATTEMPT_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const PROBE_TIMEOUT_MS = 10_000;

function isPrivateUnicastOctets(octets: readonly number[]): boolean {
  const [a = 0, b = 0, c = 0] = octets;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a >= 224) return true;
  if (a === 0 || a === 192) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a === 203 && b === 0 && c === 113) return true;
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

function mappedV4Octets(lower: string): readonly number[] | null {
  const marker = '::ffff:';
  const at = lower.lastIndexOf(marker);
  if (at === -1) return null;
  const tail = lower.slice(at + marker.length);
  if (tail.includes('.')) {
    const parts = tail.split('.');
    if (parts.length !== 4) return null;
    const octets = parts.map(Number);
    if (octets.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
    return octets;
  }
  const hextets = tail.split(':').filter((part) => part.length > 0);
  if (hextets.length < 2) return null;
  const last = hextets.slice(-2);
  const words = last.map((part) => Number.parseInt(part, 16));
  if (words.some((w) => !Number.isInteger(w) || w < 0 || w > 0xffff)) return null;
  const [hi = 0, lo = 0] = words;
  return [(hi >> 8) & 0xff, hi & 0xff, (lo >> 8) & 0xff, lo & 0xff];
}

/**
 * Classifies an IP literal as routable public unicast.
 *
 * @param address - IPv4 or IPv6 literal from DNS.
 * @returns False for private, loopback, link-local, multicast, reserved, CGNAT, and IPv4-mapped IPv6 forms of those ranges.
 */
export function isPublicUnicastIp(address: string): boolean {
  if (isIP(address) === 0) return false;
  if (isIP(address) === 4) {
    const octets = address.split('.').map(Number);
    return !isPrivateUnicastOctets(octets);
  }
  const lower = address.toLowerCase();
  const mapped = mappedV4Octets(lower);
  if (mapped !== null) return !isPrivateUnicastOctets(mapped);
  if (lower === '::1' || lower === '::') return false;
  if (lower.startsWith('fe80:') || lower.startsWith('fec0:')) return false;
  if (lower.startsWith('ff')) return false;
  if (lower.startsWith('fc') || lower.startsWith('fd')) return false;
  if (lower.startsWith('2001:db8:')) return false;
  if (lower === '::ffff:0:0' || lower.startsWith('::ffff:0:0:')) return false;
  return true;
}

interface PinnedProbeResult {
  readonly status: number;
  readonly pendingAttempt: string | null;
  readonly robotsTag: string | null;
}

/**
 * Fetches through the already-validated address list so DNS rebinding
 * between lookup and socket connect cannot redirect the probe to a
 * private target. TLS identity still validates the hostname.
 *
 * @param hostname - Probed hostname used for SNI and certificate check.
 * @param path - Request path including the encoded attempt query.
 * @param pinned - DNS addresses already filtered by isPublicUnicastIp.
 * @param requestId - Correlation id for tracing headers.
 * @returns Status code plus the two headers the probe asserts on.
 */
function fetchPinned(
  hostname: string,
  path: string,
  pinned: readonly { address: string; family: number }[],
  requestId?: string,
): Promise<PinnedProbeResult> {
  return new Promise((resolve, reject) => {
    let cursor = 0;
    const req = httpsRequest(
      {
        hostname,
        port: 443,
        path,
        method: 'GET',
        lookup: (_host, lookupOptions, callback) => {
          if (pinned.length === 0) {
            callback(new Error('no_pinned_address'), '', 4);
            return;
          }
          const entry = pinned[cursor % pinned.length];
          if (entry === undefined) {
            callback(new Error('no_pinned_address'), '', 4);
            return;
          }
          if (lookupOptions?.all === true) {
            callback(null, pinned.map((item) => ({ address: item.address, family: item.family === 6 ? 6 : 4 })));
            return;
          }
          cursor += 1;
          callback(null, entry.address, entry.family === 6 ? 6 : 4);
        },
        headers: {
          'User-Agent': 'indicate-domain-probe/1',
          ...(requestId === undefined || requestId === '' ? {} : { [REQUEST_ID_HEADER]: requestId }),
        },
      },
      (res) => {
        res.resume();
        res.on('end', () => {
          resolve({
            status: res.statusCode ?? 0,
            pendingAttempt: Array.isArray(res.headers['x-indicate-pending-attempt'])
              ? (res.headers['x-indicate-pending-attempt'][0] ?? null)
              : ((res.headers['x-indicate-pending-attempt'] as string | undefined) ?? null),
            robotsTag: Array.isArray(res.headers['x-robots-tag'])
              ? (res.headers['x-robots-tag'][0] ?? null)
              : ((res.headers['x-robots-tag'] as string | undefined) ?? null),
          });
        });
      },
    );
    req.setTimeout(PROBE_TIMEOUT_MS, () => req.destroy(new Error('probe_timeout')));
    req.on('error', reject);
    req.end();
  });
}

/** HTTPS pending-hostname probe with SSRF guardrails: DNS pinned to public unicast, no redirects, attempt echoed via header. TOCTOU residual needs zone proof + domain association. */
export class HttpsPendingHostnameProbe implements PendingHostnameProbePort {
  async verifyPendingHostname(hostname: string, attemptId: string, requestId?: string): Promise<boolean> {
    const normalized = normalizeRequestHostname(hostname);
    if (!normalized.ok || !ATTEMPT_ID_PATTERN.test(attemptId)) return false;
    let pinned: { address: string; family: number }[];
    try {
      const addresses = await lookup(normalized.hostname, { all: true });
      if (addresses.length === 0 || !addresses.every((entry) => isPublicUnicastIp(entry.address))) {
        return false;
      }
      pinned = addresses.map((entry) => ({ address: entry.address, family: entry.family }));
    } catch {
      return false;
    }
    const started = Date.now();
    try {
      const result = await fetchPinned(
        normalized.hostname,
        `/domain-pending?attempt=${encodeURIComponent(attemptId)}`,
        pinned,
        requestId,
      );
      return (
        result.status === 425 &&
        result.robotsTag === 'noindex, nofollow' &&
        result.pendingAttempt === attemptId
      );
    } catch (error) {
      logEvent('error', {
        event: 'egress.error',
        ...(requestId === undefined ? {} : { requestId }),
        method: 'GET',
        route: 'egress:domain-pending-probe:verify',
        durationMs: Date.now() - started,
        context: { url: `https://${normalized.hostname}/domain-pending`, name: error instanceof Error ? error.name : 'UnknownError' },
      });
      return false;
    }
  }
}
