import { NextResponse, type NextRequest } from 'next/server';
import { normalizeRequestHostname } from '@/shared/hostname/normalize-request-hostname';

const noindex = { 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'private, no-store' };
export function proxy(request: NextRequest) {
  const rawHost = request.headers.get('host');
  const localAuthority = rawHost?.replace(/:\d+$/u, '').toLowerCase();
  const explicitlyLocal = process.env.NODE_ENV !== 'production' && (process.env.APP_ENVIRONMENT === 'test' || process.env.APP_ENVIRONMENT === 'development');
  if (explicitlyLocal && (localAuthority === '127.0.0.1' || localAuthority === 'localhost')) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('host', (process.env.CMS_HOST ?? 'indicate.web.id').toLowerCase());
    return NextResponse.next({ request: { headers: requestHeaders } });
  }
  const parsed = normalizeRequestHostname(rawHost);
  if (!parsed.ok) return new NextResponse('Invalid Host', { status: 400, headers: noindex });
  const path = request.nextUrl.pathname;
  const cms = (process.env.CMS_HOST ?? 'indicate.web.id').toLowerCase();
  const api = (process.env.API_HOST ?? 'api.indicate.web.id').toLowerCase();
  const webhook = (process.env.WEBHOOK_HOST ?? 'webhook.indicate.web.id').toLowerCase();

  if (parsed.hostname === cms) {
    if (path.startsWith('/api/public') || path.startsWith('/api/v1/') || path.startsWith('/api/webhooks/') || path === '/domain-pending') return new NextResponse('Not Found', { status: 404, headers: noindex });
    return NextResponse.next();
  }
  if (parsed.hostname === api) {
    if (!path.startsWith('/api/v1/')) return new NextResponse('Not Found', { status: 404, headers: noindex });
    return NextResponse.next();
  }
  if (parsed.hostname === webhook) {
    if (!path.startsWith('/api/webhooks/')) return new NextResponse('Not Found', { status: 404, headers: noindex });
    return NextResponse.next();
  }
  if (process.env.NODE_ENV !== 'production' && process.env.APP_ENVIRONMENT === 'test') {
    const roots = (process.env.MVP_ROOT_HOSTS ?? '')
      .split(',')
      .map((hostname) => hostname.trim().toLowerCase())
      .filter(Boolean);
    const isConfiguredPublicHost = roots.some(
      (root) => parsed.hostname === root || (parsed.hostname.endsWith(`.${root}`) && parsed.hostname.split('.').length === root.split('.').length + 1),
    );
    if (!isConfiguredPublicHost) return new NextResponse('Not Found', { status: 404, headers: noindex });
  }
  if (path.startsWith('/cms') || path.startsWith('/auth') || path.startsWith('/sign-in') || path.startsWith('/api/cms') || path.startsWith('/api/internal') || path.startsWith('/api/health') || path.startsWith('/api/v1/') || path.startsWith('/api/webhooks/')) return new NextResponse('Not Found', { status: 404, headers: noindex });
  return NextResponse.next();
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
