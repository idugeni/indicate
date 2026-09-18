import { connection } from 'next/server';
import { headers } from 'next/headers';

import { denied } from '@/core/routing/deny';
import { withApiAccess } from '@/core/observability/api-access';
import { deliveryComposition } from '@/modules/delivery';
import { resolveNetworkSite } from '@/modules/delivery/network-runtime';

/** Control-plane llms.txt (llmstxt.org): H1 + blockquote summary + H2 file lists, absolute URLs. */
function controlPlaneLlms(host: string): string {
  const origin = `https://${host}`;
  const lines = [
    '# Indicate',
    '',
    '> Indicate — One Signal, Multiple Distribution Channels. Platform sindikasi media multi-tenant: satu Dashboard terpusat mengoperasikan banyak portal berita di banyak domain dan region.',
    '',
    'Redaksi menulis satu artikel kanonik lalu menerbitkannya ke banyak situs sekaligus melalui antrean terisolasi per target, dengan isolasi tenant berbasis nama host eksak dan jejak audit hanya-tambah.',
    '',
    '## Layanan',
    `- [Layanan](${origin}/services): cakupan sindikasi, alur 5 langkah, dan jaminan tertulis.`,
    `- [Harga](${origin}/pricing): pembelian lewat kontak langsung tanpa katalog paket, beserta FAQ.`,
    `- [Tentang](${origin}/about): cerita, fakta operasional, dan prinsip Indicate.`,
    `- [FAQ](${origin}/faq): jawaban pembelian, langganan manual, domain, bantuan, dan pelaporan konten.`,
    `- [Kontak](${origin}/contact): kanal surel, WhatsApp, dan Telegram.`,
    '',
    '## Legalitas',
    `- [Kebijakan Privasi](${origin}/privacy): penanganan data pembaca, media privat, dan retensi.`,
    `- [Ketentuan Layanan](${origin}/terms): tanggung jawab konten, keamanan akun, isolasi data, dan audit.`,
    `- [Peta Situs](${origin}/sitemap.xml): daftar URL untuk perayap mesin pencari.`,
    '',
  ];
  return lines.join('\n');
}

/** llms.txt tenant: nama + deskripsi portal, kanal kategori, dan daftar liputan terkini. */
function tenantLlms(host: string, siteName: string, description: string, categories: readonly string[], articles: readonly { readonly title: string; readonly slug: string }[]): string {
  const origin = `https://${host}`;
  const lines = [
    `# ${siteName}`,
    '',
    `> ${description}`,
    '',
    `## Kanal (${origin}/)`,
    ...categories.map((name) => `- ${name}`),
    '',
    '## Liputan terkini',
    ...articles.slice(0, 30).map((article) => `- [${article.title}](${origin}/${article.slug})`),
    '',
    `- [Peta Situs](${origin}/sitemap.xml): daftar URL untuk perayap mesin pencari.`,
    '',
  ];
  return lines.join('\n');
}

async function handleGET() {
  // Klasifikasi per-host: tetap dinamis per request (pengganti force-dynamic).
  await connection();
  const { resolver, config } = await deliveryComposition();
  const result = await resolver.classify((await headers()).get('host'));
  if (result.kind === 'control' && result.surface === 'dashboard') {
    return new Response(controlPlaneLlms(config.hosts.dashboard), {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Cache-Control': 'public, max-age=0, s-maxage=300',
      },
    });
  }
  if (result.kind === 'control' && result.surface === 'docs') {
    const { docsLlms } = await import('@/modules/docs/site-map');
    return new Response(docsLlms(config.hosts.docs), {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Cache-Control': 'public, max-age=0, s-maxage=300',
      },
    });
  }
  if (result.kind === 'site') {
    const site = await resolveNetworkSite({}, '/llms.txt');
    const siteName = site.settings.seoSiteName ?? site.settings.name;
    const seen = new Map<string, string>();
    for (const article of site.articles) {
      if (article.categorySlug !== null && article.categoryName !== null && !seen.has(article.categorySlug)) {
        seen.set(article.categorySlug, article.categoryName);
      }
    }
    return new Response(
      tenantLlms(
        site.context.normalizedHostname,
        siteName,
        site.settings.seoDefaultDescription ?? site.settings.description,
        [...seen.values()],
        site.articles.map((article) => ({ title: article.title, slug: article.slug })),
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

export const GET = withApiAccess('GET /llms.txt', handleGET);
