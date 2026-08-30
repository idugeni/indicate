import { headers } from 'next/headers';
import { serializeSitemap } from '@/application/stage5/seo';
import { stage5Composition } from '../stage5-composition';
export const dynamic = 'force-dynamic';
const denied = (status: number) => new Response('', { status, headers: { 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'private, no-store' } });
export async function GET() { const { resolver, content, config } = stage5Composition(); const result = await resolver.classify((await headers()).get('host')); if (result.kind !== 'site') return denied(result.kind === 'invalid' ? 400 : result.kind === 'ambiguous' ? 500 : 404); const site = await content.load(result.context, {}, { path: '/sitemap.xml', locale: config.seo.defaultLocale }); if (site === null) return denied(404); return new Response(serializeSitemap(site), { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=300' } }); }
