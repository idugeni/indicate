import { connection } from 'next/server';
import { headers } from 'next/headers';
import { denied } from '@/core/routing/deny';
import { serializeSitemap } from '@/modules/site/seo';
import { withApiAccess } from '@/core/observability/api-access';
import { SERVICE_PATHS } from '@/core/routing/control-plane-paths';
import { deliveryComposition } from '@/modules/delivery';

// Control-plane sitemap branch: without it the robots.txt Sitemap: line would advertise a 404.
function controlPlaneSitemap(host: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const entries = ['/', ...SERVICE_PATHS]
    .map(
      (path) =>
        `  <url><loc>https://${host}${path}</loc><lastmod>${today}</lastmod><changefreq>${path === '/' ? 'daily' : 'weekly'}</changefreq><priority>${path === '/' ? '1.0' : '0.7'}</priority></url>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

async function handleGET() {
  // Sitemap per-host + DB: tetap dinamis per request (pengganti force-dynamic).
  // Edge TTL 600 + SWR 600: crawler burst tidak mengulang full load.
  await connection();
  const { resolver, content, config } = await deliveryComposition();
  const requestHeaders = await headers();
  const result = await resolver.classify(requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host'));
  if (result.kind === 'control' && result.surface === 'dashboard') {
    return new Response(controlPlaneSitemap(config.hosts.dashboard), {
      headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=600, stale-while-revalidate=600' },
    });
  }
  if (result.kind === 'control' && result.surface === 'docs') {
    const { docsSitemap } = await import('@/modules/docs/site-map');
    return new Response(docsSitemap(config.hosts.docs), {
      headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=600, stale-while-revalidate=600' },
    });
  }
  if (result.kind !== 'site') return denied(result.kind === 'invalid' ? 400 : result.kind === 'ambiguous' ? 500 : 404);
  const site = await content.load(result.context, {}, { path: '/sitemap.xml', locale: config.seo.defaultLocale });
  if (site === null) return denied(404);
  return new Response(serializeSitemap(site), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=600, stale-while-revalidate=600' },
  });
}

export const GET = withApiAccess('GET /sitemap.xml', handleGET);
