import { connection } from 'next/server';
import { headers } from 'next/headers';
import { denied } from '@/core/routing/deny';
import { serializeRss } from '@/modules/site/seo';
import { withApiAccess } from '@/core/observability/api-access';
import { deliveryComposition } from '@/modules/delivery';
async function handleGET() {
  // Feed per-host + DB: tetap dinamis per request (pengganti force-dynamic).
  await connection();
  const { resolver, content, config } = await deliveryComposition(); const result = await resolver.classify((await headers()).get('host')); if (result.kind !== 'site') return denied(result.kind === 'invalid' ? 400 : result.kind === 'ambiguous' ? 500 : 404); const site = await content.load(result.context, {}, { path: '/rss.xml', locale: config.seo.defaultLocale }); if (site === null) return denied(404); return new Response(serializeRss(site), { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=300' } }); }

export const GET = withApiAccess('GET /rss.xml', handleGET);
