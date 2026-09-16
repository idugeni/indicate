import { NextResponse, type NextRequest } from 'next/server';
import { getControlHosts, isProductionEdge } from '@/core/config/edge-hosts';
import { normalizeRequestHostname } from '@/core/hostname/normalize-request-hostname';
import { ensureRequestId, REQUEST_ID_HEADER } from '@/core/observability/request-id';
import { ensureTraceContext, TRACEPARENT_HEADER } from '@/core/observability/trace-context';
import { isServicePath } from '@/core/routing/control-plane-paths';
import {
  PLATFORM_ALLOWED_IPS_ENV,
  extractClientIp,
  isDashboardPath,
  isPlatformPath,
  isPlatformRequestAllowed,
  isPlatformTokenWithoutTicket,
  parsePlatformAllowedIps,
} from '@/core/routing/platform-guard';

const noindex = { 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'private, no-store' };

/** script-src keeps 'unsafe-inline' for Next.js flight payloads; XSS defense rests on React output escaping. No plugins, no framing, same-origin targets. */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' https: data: blob:",
  "font-src 'self' https: data:",
  "connect-src 'self' https:",
  "media-src 'self' https:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ');

const BASE_HEADERS: Record<string, string> = {
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
  'Origin-Agent-Cluster': '?1',
  'Content-Security-Policy': CONTENT_SECURITY_POLICY,
};

// HSTS in production only: emitting it from localhost would pin HTTPS on loopback origins.
function securityHeaders(): Record<string, string> {
  if (isProductionEdge()) {
    return {
      ...BASE_HEADERS,
      'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    };
  }
  return BASE_HEADERS;
}

function withSecurityHeaders(response: NextResponse): NextResponse {
  const headers = securityHeaders();
  for (const [name, value] of Object.entries(headers)) {
    response.headers.set(name, value);
  }
  return response;
}

function deny(status: number, incoming: Headers): NextResponse {
  const response = new NextResponse(status === 400 ? 'Invalid Host' : 'Not Found', { status, headers: noindex });
  response.headers.set(REQUEST_ID_HEADER, ensureRequestId(incoming).requestId);
  return withSecurityHeaders(response);
}

/** Mask IP ke /24 (IPv4) / /48 (IPv6) sebelum log: minimalisasi UU PDP, retensi drain 30 hari. */
function maskClientIp(ip: string | null): string | null {
  if (ip === null || ip === '') return null;
  if (ip.includes('.')) {
    const parts = ip.split('.');
    if (parts.length !== 4) return 'redacted';
    return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
  }
  const head = ip.split(':').slice(0, 3).join(':');
  return head === '' ? 'redacted' : `${head}::/48`;
}

/** Edge denials can't write to the DB, so they emit structured log lines for the log drain instead. */
function auditEdgeDeny(request: NextRequest, event: string): void {
  const { requestId } = ensureRequestId(request.headers);
  console.error(JSON.stringify({
    ts: new Date().toISOString(),
    level: 'warn',
    service: 'indicate-web',
    event,
    requestId,
    method: request.method,
    path: request.nextUrl.pathname,
    ip: maskClientIp(extractClientIp(request.headers)),
  }));
}

/** Carries stable x-request-id + W3C traceparent downstream; echoes the id so edge → route → DB records join. */
function nextWithCorrelation(request: NextRequest, mutate?: (headers: Headers) => void): NextResponse {
  const requestHeaders = new Headers(request.headers);
  if (mutate !== undefined) mutate(requestHeaders);
  const { requestId } = ensureRequestId(requestHeaders);
  requestHeaders.set(REQUEST_ID_HEADER, requestId);
  requestHeaders.set(TRACEPARENT_HEADER, ensureTraceContext(requestHeaders).headerValue);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set(REQUEST_ID_HEADER, requestId);
  return withSecurityHeaders(response);
}

function trailingSlashRedirect(request: NextRequest): NextResponse | null {
  const path = request.nextUrl.pathname;
  if (path.length <= 1 || !path.endsWith('/')) return null;
  // Machine surfaces keep exact paths; API, feed, and asset URLs are never rewritten.
  if (
    path.startsWith('/api/') ||
    path.startsWith('/_next/') ||
    /\.[a-z0-9]{2,5}\/$/u.test(path)
  ) {
    return null;
  }
  const url = request.nextUrl.clone();
  url.pathname = path.slice(0, -1);
  const redirect = NextResponse.redirect(url, 308);
  redirect.headers.set(REQUEST_ID_HEADER, ensureRequestId(request.headers).requestId);
  return withSecurityHeaders(redirect);
}
/**
 * Slug control-plane yang bocor ke host tenant: yang punya padanan tenant
 * dialihkan permanen, sisanya (murni marketing pusat) ditolak 404.
 */
const TENANT_ALIASES: Record<string, string> = {
  '/about': '/tentang',
  '/contact': '/kontak',
  '/privacy': '/kebijakan-privasi',
  '/terms': '/syarat-ketentuan',
};
const TENANT_GONE = new Set(['/services', '/pricing', '/faq']);
export function proxy(request: NextRequest) {
  const rawHost = request.headers.get('host');
  const localAuthority = rawHost?.replace(/:\d+$/u, '').toLowerCase();
  const isLocalHost = localAuthority === '127.0.0.1' || localAuthority === 'localhost';
  if (isLocalHost) {
    return nextWithCorrelation(request, (requestHeaders) => {
      // Pembaca hilir mengutamakan x-forwarded-host (page.tsx, not-found.tsx,
      // network-runtime.ts), jadi kedua header harus ditulis ulang — menulis
      // `host` saja tidak berpengaruh di Vercel yang selalu menyetel keduanya.
      requestHeaders.set('host', getControlHosts().dashboard);
      requestHeaders.set('x-forwarded-host', getControlHosts().dashboard);
    });
  }
  // Host deployment Vercel (*.vercel.app) milik project ini diperlakukan sebagai
  // permukaan dashboard: VERCEL_URL per deployment tidak stabil (unik per build),
  // tetapi request *.vercel.app yang sampai ke project ini pasti deployment kita
  // sendiri (routing Vercel per host; preview terkunci SSO dashboard).
  // Host asing lain tetap 404.
  if (localAuthority !== undefined && localAuthority.endsWith('.vercel.app')) {
    return nextWithCorrelation(request, (requestHeaders) => {
      requestHeaders.set('host', getControlHosts().dashboard);
      requestHeaders.set('x-forwarded-host', getControlHosts().dashboard);
    });
  }
  const parsed = normalizeRequestHostname(rawHost);
  if (!parsed.ok) return deny(400, request.headers);
  const canonicalSlash = trailingSlashRedirect(request);
  if (canonicalSlash !== null) return canonicalSlash;
  const path = request.nextUrl.pathname;
  // F1-Auth: platform surfaces are IP-allowlisted (fail closed). Out-of-range
  // callers are denied with a non-disclosing 404 plus an edge audit record.
  if (isPlatformPath(path)) {
    const allowlist = parsePlatformAllowedIps(process.env[PLATFORM_ALLOWED_IPS_ENV]);
    if (!isPlatformRequestAllowed({ headers: request.headers, allowlist })) {
      auditEdgeDeny(request, 'platform.ip.denied');
      return deny(404, request.headers);
    }
    return nextWithCorrelation(request);
  }
  // F1-Auth: a platform-only token must never enter dashboard surfaces
  // without an on_behalf ticket proving scoped delegation.
  if (isDashboardPath(path) && isPlatformTokenWithoutTicket(request.headers)) {
    auditEdgeDeny(request, 'dashboard.platform_token.denied');
    return deny(404, request.headers);
  }
  const { dashboard, api, webhook } = getControlHosts();

  if (parsed.hostname === dashboard) {
    if (path.startsWith('/api/network') || path.startsWith('/api/v1/') || path.startsWith('/api/webhooks/') || path === '/domain-pending') return deny(404, request.headers);
    return nextWithCorrelation(request);
  }
  if (parsed.hostname === api) {
    if (!path.startsWith('/api/v1/')) return deny(404, request.headers);
    return nextWithCorrelation(request);
  }
  if (parsed.hostname === webhook) {
    if (!path.startsWith('/api/webhooks/')) return deny(404, request.headers);
    return nextWithCorrelation(request);
  }
  const alias = TENANT_ALIASES[path];
  if (alias !== undefined) {
    const url = request.nextUrl.clone();
    url.pathname = alias;
    const redirect = NextResponse.redirect(url, 308);
    redirect.headers.set(REQUEST_ID_HEADER, ensureRequestId(request.headers).requestId);
    return withSecurityHeaders(redirect);
  }
  if (path.startsWith('/dashboard') || path.startsWith('/auth') || path.startsWith('/sign-in') || path.startsWith('/api/dashboard') || path.startsWith('/api/internal') || path.startsWith('/api/health') || path.startsWith('/api/v1/') || path.startsWith('/api/webhooks/') || isServicePath(path)) return deny(404, request.headers);
  if (TENANT_GONE.has(path)) return deny(404, request.headers);
  return nextWithCorrelation(request);
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
