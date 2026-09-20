import { connection } from 'next/server';
import { headers } from 'next/headers';
import { denied } from '@/core/routing/deny';
import { serializeNewsSitemap } from '@/modules/site/seo';
import { withApiAccess } from '@/core/observability/api-access';
import { deliveryComposition } from '@/modules/delivery';

async function handleGET() {
  await connection();
  const { resolver, content, config } = await deliveryComposition();
  const requestHeaders = await headers();
  const result = await resolver.classify(requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host'));
  if (result.kind !== 'site') return denied(result.kind === 'invalid' ? 400 : result.kind === 'ambiguous' ? 500 : 404);
  const site = await content.load(result.context, {}, { path: '/news-sitemap.xml', locale: config.seo.defaultLocale });
  if (site === null) return denied(404);
  return new Response(serializeNewsSitemap(site), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=600, stale-while-revalidate=600' },
  });
}

/**
 * Sajikan news sitemap per host.
 *
 * @remarks Tetap dinamis per request karena klasifikasi per-host + DB; pengganti force-dynamic.
 */
export const GET = withApiAccess('GET /news-sitemap.xml', handleGET, { accessLog: 'errors-only' });
