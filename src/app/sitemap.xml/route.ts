import { connection } from 'next/server';
import { headers } from 'next/headers';
import { denied } from '@/core/routing/deny';
import { serializeSitemap } from '@/modules/site/seo';
import { getSiteCategoryChannels } from '@/modules/site/components/network/server/site-nav';
import { withApiAccess } from '@/core/observability/api-access';
import { SERVICE_PATHS } from '@/core/routing/control-plane-paths';
import { deliveryComposition } from '@/modules/delivery';

/**
 * Render the control-plane sitemap document.
 *
 * @param host - Dashboard hostname for absolute URLs.
 * @returns Sitemap XML covering root and service paths.
 */
function controlPlaneSitemap(host: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const entries = ['/', ...SERVICE_PATHS.filter((path) => path !== '/status')]
    .map((path) => `  <url><loc>https://${host}${path}</loc><lastmod>${today}</lastmod></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

async function handleGET() {
  await connection();
  const { resolver, content, config } = await deliveryComposition();
  const requestHeaders = await headers();
  const result = await resolver.classify(requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host'));
  if (result.kind === 'control' && result.surface === 'dashboard') {
    return new Response(controlPlaneSitemap(config.hosts.dashboard), {
      headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=600, stale-while-revalidate=600' },
    });
  }
  if (result.kind !== 'site') return denied(result.kind === 'invalid' ? 400 : result.kind === 'ambiguous' ? 500 : 404);
  const site = await content.load(result.context, {}, { path: '/sitemap.xml', locale: config.seo.defaultLocale });
  if (site === null) return denied(404);
  // Scope `index`, sama dengan halaman Indeks: tidak menambah query, hanya membaca
  // entri cache yang sudah dipanaskan `/indeks`.
  const channels = await getSiteCategoryChannels(site);
  return new Response(serializeSitemap(site, channels), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=600, stale-while-revalidate=600' },
  });
}

/**
 * Serve the sitemap document for control-plane and tenant hosts.
 *
 * @remarks Without the control-plane branch the robots.txt Sitemap line would advertise a 404. Sitemap stays dynamic per request per host with DB load (replacing force-dynamic); edge TTL 600 plus SWR 600 absorbs crawler bursts without repeating the full load.
 * @remarks `<changefreq>` and `<priority>` are deliberately absent: Google's own
 * documentation states it ignores both, so emitting them only implied a crawl
 * control the platform does not have.
 */
const GET = withApiAccess('GET /sitemap.xml', handleGET, { accessLog: 'errors-only' });
