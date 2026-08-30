import { NextResponse, type NextRequest } from 'next/server';

function normalizeStageOneHost(rawHost: string | null): string | null {
  if (rawHost === null || rawHost.includes(',') || rawHost.includes('/')) return null;
  const withoutPort = rawHost.replace(/:\d+$/, '');
  const withoutDot = withoutPort.endsWith('.') ? withoutPort.slice(0, -1) : withoutPort;
  return withoutDot.toLowerCase();
}

export function proxy(request: NextRequest) {
  const host = normalizeStageOneHost(request.headers.get('host'));
  if (host === null) {
    return new NextResponse('Invalid Host', { status: 400, headers: { 'X-Robots-Tag': 'noindex, nofollow' } });
  }

  const controlPlaneHost = (process.env.CMS_HOST ?? 'indicate.web.id').toLowerCase();
  const localHosts = new Set(['127.0.0.1', 'localhost']);
  if (host !== controlPlaneHost && !localHosts.has(host)) {
    return new NextResponse('Not Found', { status: 404, headers: { 'X-Robots-Tag': 'noindex, nofollow' } });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
