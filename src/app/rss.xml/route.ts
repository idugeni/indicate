import { connection } from 'next/server';
import { headers } from 'next/headers';
import { denied } from '@/core/routing/deny';
import { serializeRss } from '@/modules/site/seo';
import { withApiAccess } from '@/core/observability/api-access';
import { deliveryComposition } from '@/modules/delivery';
async function handleGET() {
  await connection();
  const requestHeaders = await headers(); const { resolver, content, config } = await deliveryComposition(); const result = await resolver.classify(requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host')); if (result.kind !== 'site') return denied(result.kind === 'invalid' ? 400 : result.kind === 'ambiguous' ? 500 : 404); const site = await content.load(result.context, {}, { path: '/rss.xml', locale: config.seo.defaultLocale }); if (site === null) return denied(404); const feed = await content.loadFeed(result.context, 50); return new Response(serializeRss({ context: result.context, siteName: site.settings.seoSiteName || site.settings.name, description: site.settings.seoDefaultDescription || site.settings.description, articles: feed }), { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=600, stale-while-revalidate=600' } }); }

/**
 * Serve the per-host RSS feed.
 *
 * @remarks Stays dynamic per request because of the per-host feed + DB; replacement for force-dynamic.
 */
export const GET = withApiAccess('GET /rss.xml', handleGET, { accessLog: 'errors-only' });
