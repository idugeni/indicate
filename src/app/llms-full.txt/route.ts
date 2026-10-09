import { connection } from 'next/server';
import { headers } from 'next/headers';

import { denied } from '@/core/routing/deny';
import { withApiAccess } from '@/core/observability/api-access';
import { getNetworkSites, getPartnerOrganizations } from '@/modules/content/site-content';
import { deliveryComposition } from '@/modules/delivery';
import { resolveNetworkSite } from '@/modules/delivery/network-runtime';
import { controlPlaneLlmsFull, tenantLlmsFull } from './route-helpers';

async function handleGET() {
  await connection();
  const { resolver, config } = await deliveryComposition();
  const result = await resolver.classify((await headers()).get('host'));
  if (result.kind === 'control' && result.surface === 'dashboard') {
    const [sites, partners] = await Promise.all([getNetworkSites(), getPartnerOrganizations()]);
    return new Response(
      controlPlaneLlmsFull(
        config.hosts.dashboard,
        sites.filter((site) => site.siteLevel === 'apex').map((site) => ({ name: site.siteName, hostname: site.hostname })),
        partners.map((partner) => ({ name: partner.name })),
      ),
      {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Cache-Control': 'public, max-age=0, s-maxage=300',
        },
      },
    );
  }
  if (result.kind === 'site') {
    const site = await resolveNetworkSite({}, '/llms-full.txt');
    const siteName = site.settings.seoSiteName ?? site.settings.name;
    const seen = new Map<string, string>();
    for (const article of site.articles) {
      if (article.categorySlug !== null && article.categoryName !== null && !seen.has(article.categorySlug)) {
        seen.set(article.categorySlug, article.categoryName);
      }
    }
    return new Response(
      tenantLlmsFull(
        site.context.normalizedHostname,
        siteName,
        site.settings.seoDefaultDescription ?? site.settings.description,
        [...seen.values()],
        site.articles.map((article) => ({ title: article.title, slug: article.slug, href: article.href })),
      ),
      {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Cache-Control': 'public, max-age=0, s-maxage=300',
        },
      },
    );
  }
  return denied(result.kind === 'invalid' ? 400 : result.kind === 'ambiguous' ? 500 : 404);
}

/**
 * Serve the per-host full dump backing the WAF Allowed paths checklist.
 *
 * @remarks Same bounded reads as GET /llms.txt; the full variant only renders
 * more of the already-loaded list, never an extra query.
 */
export const GET = withApiAccess('GET /llms-full.txt', handleGET, { accessLog: 'errors-only' });
