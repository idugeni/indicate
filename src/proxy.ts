import { NextResponse, type NextRequest } from 'next/server';
import { getControlHosts, isProductionEdge } from '@/core/config/edge-hosts';
import { normalizeRequestHostname } from '@/core/hostname/normalize-request-hostname';
import { ensureRequestId, REQUEST_ID_HEADER } from '@/core/observability/request-id';
import { ensureTraceContext, TRACEPARENT_HEADER } from '@/core/observability/trace-context';
import { isServicePath } from '@/core/routing/control-plane-paths';
import { nextWithSessionRefresh } from '@/integrations/supabase/supabase-edge-session';
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

/** Mini App Telegram berjalan di WebView/iframe klien Telegram: skrip resmi harus lolos CSP dan frame-ancestors membuka host web Telegram. Jalur lain tetap terkunci. */
function isMiniAppPath(pathname: string): boolean {
  return pathname === '/tg/app' || pathname.startsWith('/tg/app/');
}

/** script-src keeps 'unsafe-inline' for Next.js flight payloads; XSS defense rests on React output escaping. Allows Cloudflare Web Analytics beacon auto-injected at the edge; Cloudflare already terminates TLS/proxies, so no new trust. Allows Turnstile challenge script + widget frame (sole iframe in the app, dashboard auth). Allows Google Fonts stylesheet for the invoice print page. Development adds 'unsafe-eval' for React/Turbopack dev runtimes; production stays without it. No plugins. */
function contentSecurityPolicy(pathname?: string): string {
  const miniApp = pathname !== undefined && isMiniAppPath(pathname);
  const scriptHosts = miniApp
    ? "'self' 'unsafe-inline' https://static.cloudflareinsights.com https://telegram.org https://challenges.cloudflare.com"
    : "'self' 'unsafe-inline' https://static.cloudflareinsights.com https://challenges.cloudflare.com";
  const scriptSrc = isProductionEdge() ? `script-src ${scriptHosts}` : `script-src ${scriptHosts} 'unsafe-eval'`;
  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "frame-src https://challenges.cloudflare.com",
    "img-src 'self' https: data: blob:",
    "font-src 'self' https: data:",
    "connect-src 'self' https:",
    "media-src 'self' https:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    miniApp ? 'frame-ancestors https://web.telegram.org https://webk.telegram.org https://weba.telegram.org' : "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; ');
}

const BASE_HEADERS: Record<string, string> = {
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
  'Origin-Agent-Cluster': '?1',
};

function securityHeaders(pathname?: string): Record<string, string> {
  const headers: Record<string, string> = {
    ...BASE_HEADERS,
    'Content-Security-Policy': contentSecurityPolicy(pathname),
  };
  if (isProductionEdge()) {
    headers['Strict-Transport-Security'] = 'max-age=63072000; includeSubDomains; preload';
  }
  return headers;
}

function withSecurityHeaders(response: NextResponse, pathname?: string): NextResponse {
  const headers = securityHeaders(pathname);
  for (const [name, value] of Object.entries(headers)) {
    response.headers.set(name, value);
  }
  if (pathname !== undefined && isMiniAppPath(pathname)) response.headers.delete('X-Frame-Options');
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
  return withSecurityHeaders(response, request.nextUrl.pathname);
}

function trailingSlashRedirect(request: NextRequest): NextResponse | null {
  const path = request.nextUrl.pathname;
  if (path.length <= 1 || !path.endsWith('/')) return null;
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
/**
 * Control/mini-app surfaces that must never render on tenant hostnames.
 *
 * @param path - Request pathname.
 * @returns True when the edge must answer 404 without reaching a route.
 * @remarks Auth pages are dashboard-only (brand/phishing boundary); the owner
 * Mini App and its API are dashboard-host only so tenant domains never serve
 * privileged UI or owner-callable backends.
 */
function isTenantDeniedPath(path: string): boolean {
  return (
    path.startsWith('/dashboard') ||
    path.startsWith('/auth') ||
    path.startsWith('/sign-in') ||
    path.startsWith('/sign-up') ||
    path.startsWith('/forgot-password') ||
    path.startsWith('/update-password') ||
    path === '/tg/app' ||
    path.startsWith('/tg/app/') ||
    path.startsWith('/api/tg/') ||
    path.startsWith('/api/dashboard') ||
    path.startsWith('/api/internal') ||
    path.startsWith('/api/health') ||
    path.startsWith('/api/v1/') ||
    path.startsWith('/api/webhooks/') ||
    isServicePath(path)
  );
}

/**
 * RSC surfaces that read the session server-side and need rotated cookies persisted.
 *
 * @param path - Request pathname.
 * @returns True when the edge must refresh the Supabase session before rendering.
 * @remarks Route handlers (`/auth/*`, `/api/*`) refresh through their own adapter
 * because their cookie writes succeed; public pages never carry a session, so only
 * the session-reading RSC pages pay the refresh round-trip.
 */
function isSessionRefreshPath(path: string): boolean {
  return path.startsWith('/dashboard') || path === '/update-password' || path.startsWith('/update-password/');
}
/**
 * Route edge requests to control or tenant surfaces.
 *
 * @param request - Incoming edge request.
 * @returns Response for the matched surface.
 * @remarks HSTS is emitted in production only to avoid pinning HTTPS on loopback origins. Trailing-slash redirect skips machine surfaces to keep API, feed, and asset URLs exact. Pembaca hilir mengutamakan x-forwarded-host (page.tsx, not-found.tsx, network-runtime.ts), jadi kedua header harus ditulis ulang — menulis `host` saja tidak berpengaruh di Vercel yang selalu menyetel keduanya. Host deployment Vercel (*.vercel.app) milik project ini diperlakukan sebagai permukaan dashboard: VERCEL_URL per deployment tidak stabil (unik per build), tetapi request *.vercel.app yang sampai ke project ini pasti deployment kita sendiri (routing Vercel per host; preview terkunci SSO dashboard); host asing lain tetap 404. Platform surfaces are IP-allowlisted fail closed; out-of-range callers get a non-disclosing 404 plus an edge audit record. A platform-only token must never enter dashboard surfaces without an on_behalf ticket proving scoped delegation. Beranda portal (`/`) dirender rute `(network)/tenant-home` agar ikut boundary segmen tenant (loading/error terang); URL kanonis tetap `/`.
 */
export async function proxy(request: NextRequest) {
  const rawHost = request.headers.get('host');
  const localAuthority = rawHost?.replace(/:\d+$/u, '').toLowerCase();
  const isLocalHost = localAuthority === '127.0.0.1' || localAuthority === 'localhost';
  if (isLocalHost) {
    const rewriteLocal = (requestHeaders: Headers) => {
      requestHeaders.set('host', getControlHosts().dashboard);
      requestHeaders.set('x-forwarded-host', getControlHosts().dashboard);
    };
    if (isSessionRefreshPath(request.nextUrl.pathname)) {
      return nextWithSessionRefresh(request, () => nextWithCorrelation(request, rewriteLocal));
    }
    return nextWithCorrelation(request, rewriteLocal);
  }
  if (localAuthority !== undefined && localAuthority.endsWith('.vercel.app')) {
    const rewritePreview = (requestHeaders: Headers) => {
      requestHeaders.set('host', getControlHosts().dashboard);
      requestHeaders.set('x-forwarded-host', getControlHosts().dashboard);
    };
    if (isSessionRefreshPath(request.nextUrl.pathname)) {
      return nextWithSessionRefresh(request, () => nextWithCorrelation(request, rewritePreview));
    }
    return nextWithCorrelation(request, rewritePreview);
  }
  const parsed = normalizeRequestHostname(rawHost);
  if (!parsed.ok) return deny(400, request.headers);
  const canonicalSlash = trailingSlashRedirect(request);
  if (canonicalSlash !== null) return canonicalSlash;
  const path = request.nextUrl.pathname;
  if (isPlatformPath(path)) {
    const allowlist = parsePlatformAllowedIps(process.env[PLATFORM_ALLOWED_IPS_ENV]);
    if (!isPlatformRequestAllowed({ headers: request.headers, allowlist })) {
      auditEdgeDeny(request, 'platform.ip.denied');
      return deny(404, request.headers);
    }
    return nextWithCorrelation(request);
  }
  if (isDashboardPath(path) && isPlatformTokenWithoutTicket(request.headers)) {
    auditEdgeDeny(request, 'dashboard.platform_token.denied');
    return deny(404, request.headers);
  }
  const { dashboard, api, webhook } = getControlHosts();

  if (path === '/docs' || path.startsWith('/docs/')) return deny(404, request.headers);

  if (parsed.hostname === dashboard) {
    if (path.startsWith('/api/network') || path.startsWith('/api/v1/') || path.startsWith('/api/webhooks/') || path === '/domain-pending') return deny(404, request.headers);
    if (isSessionRefreshPath(path)) return nextWithSessionRefresh(request, () => nextWithCorrelation(request));
    return nextWithCorrelation(request);
  }
  if (parsed.hostname === api) {
    if (path !== '/api/health' && !path.startsWith('/api/v1/')) return deny(404, request.headers);
    return nextWithCorrelation(request);
  }
  if (parsed.hostname === webhook) {
    if (path !== '/api/health' && !path.startsWith('/api/webhooks/')) return deny(404, request.headers);
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
  if (isTenantDeniedPath(path)) return deny(404, request.headers);
  if (TENANT_GONE.has(path)) return deny(404, request.headers);
  if (path === '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/tenant-home';
    const requestHeaders = new Headers(request.headers);
    const { requestId } = ensureRequestId(requestHeaders);
    requestHeaders.set(REQUEST_ID_HEADER, requestId);
    requestHeaders.set(TRACEPARENT_HEADER, ensureTraceContext(requestHeaders).headerValue);
    const rewritten = NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    rewritten.headers.set(REQUEST_ID_HEADER, requestId);
    return withSecurityHeaders(rewritten);
  }
  return nextWithCorrelation(request);
}
export const config = { matcher: ['/((?!_next/static|_next/image|_vercel|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|css|js|map|woff2?|ttf|eot|mp4|webm)$).*)'] };
