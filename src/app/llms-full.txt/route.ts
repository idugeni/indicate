import { connection } from 'next/server';
import { headers } from 'next/headers';

import { denied } from '@/core/routing/deny';
import { withApiAccess } from '@/core/observability/api-access';
import { controlPlaneLlms } from '@/app/llms.txt/route';
import { getNetworkSites, getPartnerOrganizations } from '@/modules/content/site-content';
import { deliveryComposition } from '@/modules/delivery';
import { resolveNetworkSite } from '@/modules/delivery/network-runtime';

/**
 * Render the control-plane full dump: summary plus machine-surface index.
 *
 * @param host - Dashboard hostname for absolute URLs.
 * @param portals - Active apex portals for the directory section.
 * @param partners - Active partner organizations.
 * @returns Markdown body following the summary with feed and policy links.
 */
function controlPlaneLlmsFull(
  host: string,
  portals: readonly { readonly name: string; readonly hostname: string }[] = [],
  partners: readonly { readonly name: string }[] = [],
): string {
  const origin = `https://${host}`;
  return [
    controlPlaneLlms(host, portals, partners).trimEnd(),
    '',
    '## Full',
    `- [Peta Berita](${origin}/news-sitemap.xml): artikel 2 hari terakhir untuk Google News.`,
    `- [Robots](${origin}/robots.txt): aturan perayap dan baris Sitemap.`,
    `- [Keamanan](${origin}/.well-known/security.txt): kontak pelaporan kerentanan.`,
    `- [Ads](${origin}/ads.txt): penjual programatik resmi.`,
    '',
  ].join('\n');
}

/**
 * Render the tenant full dump: up to 100 recent articles plus feed index.
 *
 * @param host - Tenant hostname for absolute URLs.
 * @param siteName - Public portal name.
 * @param description - Public portal description.
 * @param categories - Active channel names.
 * @param articles - Already-loaded list items; no extra query beyond the page load.
 * @returns Markdown body with extended coverage list and feed links.
 */
function tenantLlmsFull(
  host: string,
  siteName: string,
  description: string,
  categories: readonly string[],
  articles: readonly { readonly title: string; readonly slug: string; readonly href: string }[],
): string {
  const origin = `https://${host}`;
  const lines = [
    `# ${siteName}`,
    '',
    `> ${description}`,
    '',
    `## Kanal (${origin}/)`,
    ...categories.map((name) => `- ${name}`),
    '',
    '## Liputan lengkap',
    ...articles.slice(0, 100).map((article) => `- [${article.title}](${article.href.startsWith('https://') ? article.href : `${origin}/${article.slug}`})`),
    '',
    `- [RSS](${origin}/rss.xml): 50 artikel terbaru untuk pembaca feed dan arsip.`,
    `- [Peta Berita](${origin}/news-sitemap.xml): artikel 2 hari terakhir untuk Google News.`,
    `- [Peta Situs](${origin}/sitemap.xml): daftar URL untuk perayap mesin pencari.`,
    '',
  ];
  return lines.join('\n');
}

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
const GET = withApiAccess('GET /llms-full.txt', handleGET, { accessLog: 'errors-only' });
