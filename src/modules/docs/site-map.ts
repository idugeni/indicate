import { DOCS_PAGES } from '@/modules/docs/navigation';

function absoluteDocsUrl(host: string, path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `https://${host}${normalizedPath}`;
}

function xml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

export function docsSitemap(host: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const entries = DOCS_PAGES.map(
    (page) =>
      `  <url><loc>${xml(absoluteDocsUrl(host, page.path))}</loc><lastmod>${today}</lastmod><changefreq>${page.slug === 'home' ? 'daily' : 'weekly'}</changefreq><priority>${page.slug === 'home' ? '1.0' : '0.7'}</priority></url>`,
  ).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

export function docsLlms(host: string): string {
  const lines = [
    '# Dokumentasi Indicate',
    '',
    '> Referensi integrasi resmi platform sindikasi media multi-tenant Indicate: API publik v1, webhook generik, dan bot Telegram redaksi.',
    '',
    '## Halaman',
    ...DOCS_PAGES.map((page) => `- [${page.title}](${absoluteDocsUrl(host, page.path)}): ${page.description}`),
    '',
    `- [Spesifikasi OpenAPI](${absoluteDocsUrl(host, '/openapi.json')}): kontrak mesin untuk sembilan aksi API.`,
    '',
  ];
  return lines.join('\n');
}
