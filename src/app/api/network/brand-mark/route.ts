import { connection } from 'next/server';
import { headers } from 'next/headers';
import { unstable_cache } from 'next/cache';
import { denied } from '@/core/routing/deny';
import { withApiAccess } from '@/core/observability/api-access';
import { deliveryComposition } from '@/modules/delivery';
import type { ResolvedSiteContext } from '@/modules/delivery/models';
import { CLEAN_BLUE } from '@/modules/site/components/network/templates/clean-blue/shared';
import { renderBrandMarkSvg } from '@/modules/site/brand-mark';

/**
 * Brand ringan: 1 baris site_settings (nama + colors) via unstable_cache
 * per-host, BUKAN full content.load (100 artikel). Dipanggil tiap pageview
 * sebagai <img> sehingga penghematannya multiplikatif terhadap homepage.
 * Tag memakai kosakata invalidasi yang sama (host:/site:/org:) agar
 * publish/unpublish mem-fan-out otomatis.
 */
async function loadCachedBrand(context: ResolvedSiteContext): Promise<{ name: string; colors: Readonly<Record<string, string>> } | null> {
  const cached = unstable_cache(
    async () => {
      const { repository } = await deliveryComposition();
      return repository.loadSiteBrand(context);
    },
    [`brand:${context.normalizedHostname}:${context.siteId}:${context.routingVersion}:${context.contentVersion}`],
    {
      tags: [`host:${context.normalizedHostname}`, `site:${context.siteId}`, `org:${context.organizationId}`],
      revalidate: 600,
    },
  );
  return cached();
}

async function handleGET() {
  // Brand-mark prosedural per-host + DB (pengganti force-dynamic).
  await connection();
  const { resolver } = await deliveryComposition();
  const requestHeaders = await headers();
  const result = await resolver.classify(requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host'));
  if (result.kind !== 'site') return denied(result.kind === 'invalid' ? 400 : result.kind === 'ambiguous' ? 500 : 404);
  const brand = await loadCachedBrand(result.context);
  if (brand === null) return denied(404);
  const svg = renderBrandMarkSvg({
    name: brand.name,
    primary: brand.colors.primary ?? CLEAN_BLUE.primary,
    accent: brand.colors.accent ?? CLEAN_BLUE.primary,
  });
  return new Response(svg, {
    headers: { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=600, stale-while-revalidate=600' },
  });
}

export const GET = withApiAccess('GET /api/network/brand-mark', handleGET);
