import { connection } from 'next/server';
import { headers } from 'next/headers';
import { unstable_cache } from 'next/cache';
import { deniedRobotsTxt } from '@/core/routing/deny';
import { serializeRobots } from '@/modules/site/seo';
import { withApiAccess } from '@/core/observability/api-access';
import { LEGAL_ROUTES, SITE_ROUTES } from '@/ui/site/marketing-content';
import { deliveryComposition } from '@/modules/delivery';
import type { ResolvedSiteContext } from '@/modules/delivery/models';
// Control-plane robots: advertise public service paths, keep auth/machine surfaces out of the index.
const controlPlaneRobots = (host: string) => [
  'User-agent: *',
  'Allow: /$',
  ...[...SITE_ROUTES, ...LEGAL_ROUTES].map((route) => `Allow: ${route.href}`),
  'Disallow: /dashboard',
  'Disallow: /sign-in',
  'Disallow: /auth',
  'Disallow: /api/',
  'Disallow: /domain-pending',
  // Explicit tenant-only denylist: keep tenant surfaces out of the control-plane index without a catch-all.
  'Disallow: /categories',
  'Disallow: /kebijakan-privasi',
  'Disallow: /syarat-ketentuan',
  'Disallow: /tentang',
  'Disallow: /kontak',
  'Disallow: /search',
  'Disallow: /rss.xml',
  `Sitemap: https://${host}/sitemap.xml`,
  '',
].join('\n');
async function loadCachedRobots(context: ResolvedSiteContext): Promise<readonly string[] | null> {
  const cached = unstable_cache(
    async () => {
      const { repository } = await deliveryComposition();
      return repository.loadSiteRobots(context);
    },
    [`site-robots:${context.normalizedHostname}:${context.siteId}:${context.routingVersion}:${context.contentVersion}`],
    {
      tags: [`host:${context.normalizedHostname}`, `site:${context.siteId}`, `org:${context.organizationId}`],
      revalidate: 600,
    },
  );
  return cached();
}

async function handleGET() {
  await connection();
  const requestHeaders = await headers();
  const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host');
  const { resolver, config } = await deliveryComposition();
  const result = await resolver.classify(host);
  if (result.kind === 'control' && result.surface === 'dashboard') {
    return new Response(controlPlaneRobots(config.hosts.dashboard), {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=600, stale-while-revalidate=600' },
    });
  }
  if (result.kind !== 'site') return deniedRobotsTxt(result.kind === 'invalid' ? 400 : result.kind === 'ambiguous' ? 500 : 404);
  const robots = await loadCachedRobots(result.context);
  if (robots === null) return deniedRobotsTxt(404);
  return new Response(serializeRobots({ context: result.context, settings: { robots } }), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=600, stale-while-revalidate=600' },
  });
}

export const GET = withApiAccess('GET /robots.txt', handleGET);
