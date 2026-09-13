import { connection } from 'next/server';
import { headers } from 'next/headers';
import { denied } from '@/core/routing/deny';
import { withApiAccess } from '@/core/observability/api-access';
import { deliveryComposition } from '@/modules/delivery';
import { getColorPresets } from '@/modules/content/site-content';
import { NETWORK_COLOR_PRESETS as NETWORK_COLOR_FALLBACK } from '@/ui/themes';
import { renderBrandMarkSvg } from '@/modules/site/brand-mark';

async function handleGET() {
  // Brand-mark prosedural per-host + DB (pengganti force-dynamic).
  await connection();
  const { resolver, content, config } = await deliveryComposition();
  const result = await resolver.classify((await headers()).get('host'));
  if (result.kind !== 'site') return denied(result.kind === 'invalid' ? 400 : result.kind === 'ambiguous' ? 500 : 404);
  const site = await content.load(result.context, {}, { path: '/api/network/brand-mark', locale: config.seo.defaultLocale });
  if (site === null) return denied(404);
  const presets = await getColorPresets();
  const matched = (presets.length > 0 ? presets : NETWORK_COLOR_FALLBACK).find(
    (p) => p.id === (site.settings.colors.presetId ?? 'emerald-forest'),
  );
  const svg = renderBrandMarkSvg({
    name: site.settings.name,
    primary: site.settings.colors.primary ?? matched?.primary ?? '#0b5d4b',
    accent: site.settings.colors.accent ?? matched?.accent ?? '#e9a23b',
  });
  return new Response(svg, {
    headers: { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=300' },
  });
}

export const GET = withApiAccess('GET /api/network/brand-mark', handleGET);
