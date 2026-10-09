import { controlPlaneLlms } from '@/app/llms.txt/route-helpers';

/** Render the control-plane full dump: summary plus machine-surface index. */
export function controlPlaneLlmsFull(
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

/** Render the tenant full dump: up to 100 recent articles plus feed index. */
export function tenantLlmsFull(
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
