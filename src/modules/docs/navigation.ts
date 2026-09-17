export interface DocsPage {
  readonly slug: string;
  readonly path: string;
  readonly title: string;
  readonly description: string;
  readonly section: string;
}

export const DOCS_PAGES: readonly DocsPage[] = [
  { slug: 'home', path: '/', title: 'Dokumentasi Indicate', description: 'Referensi integrasi resmi platform sindikasi media multi-tenant Indicate: API publik, webhook, bot Telegram, dan kontrak operasionalnya.', section: 'Mulai' },
  { slug: 'quickstart', path: '/quickstart', title: 'Mulai cepat', description: 'Lima langkah dari kunci API pertama hingga publikasi tayang di banyak portal.', section: 'Mulai' },
  { slug: 'authentication', path: '/authentication', title: 'Autentikasi & scope', description: 'API key Bearer, scope per aksi, rotasi, dan respons penolakan yang tidak membocorkan informasi.', section: 'Mulai' },
  { slug: 'api-reference', path: '/api-reference', title: 'Referensi API v1', description: 'Sembilan aksi POST /api/v1/commands: artikel, media, dan publikasi dengan skema payload dan contoh.', section: 'Referensi' },
  { slug: 'webhooks', path: '/webhooks', title: 'Webhook generik', description: 'Kontrak HMAC, freshness timestamp, replay-id idempoten, dan kode respons.', section: 'Referensi' },
  { slug: 'telegram', path: '/telegram', title: 'Bot Telegram', description: 'Perintah redaksi via chat: artikel, foto, publikasi, status, retry, dan unpublish.', section: 'Referensi' },
  { slug: 'errors', path: '/errors', title: 'Error & rate limit', description: 'Envelope error publik, pemetaan status HTTP, retry-after, dan kelas rate limit.', section: 'Operasi' },
  { slug: 'openapi', path: '/openapi', title: 'Spesifikasi OpenAPI', description: 'Unduh openapi.json yang dihasilkan dari modul yang sama dengan halaman ini.', section: 'Operasi' },
];

export const DOCS_SECTIONS: readonly string[] = ['Mulai', 'Referensi', 'Operasi'];

export function docsPage(slug: string): DocsPage | null {
  return DOCS_PAGES.find((page) => page.slug === slug) ?? null;
}
