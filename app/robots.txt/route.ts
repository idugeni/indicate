import { headers } from 'next/headers';
import { serializeRobots } from '@/application/stage5/seo';
import { stage5Composition } from '../stage5-composition';
export const dynamic = 'force-dynamic';
const denied = (status: number) => new Response('User-agent: *\nDisallow: /\n', { status, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'private, no-store' } });
export async function GET() { const host = (await headers()).get('host'); const { resolver, content, config } = stage5Composition(); const result = await resolver.classify(host); if (result.kind !== 'site') return denied(result.kind === 'invalid' ? 400 : result.kind === 'ambiguous' ? 500 : 404); const site = await content.load(result.context, {}, { path: '/robots.txt', locale: config.seo.defaultLocale }); if (site === null) return denied(404); return new Response(serializeRobots(site), { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=300' } }); }
