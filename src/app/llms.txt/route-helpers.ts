/** Control-plane llms.txt (llmstxt.org): H1 + blockquote summary + H2 file lists, absolute URLs. */
export function controlPlaneLlms(
  host: string,
  portals: readonly { readonly name: string; readonly hostname: string }[] = [],
  partners: readonly { readonly name: string }[] = [],
): string {
  const origin = `https://${host}`;
  const lines = [
    '# Indicate',
    '',
    '> Indicate - Publishing infrastructure. Platform penerbitan jaringan media multi-tenant: satu Dashboard terpusat mengoperasikan banyak portal berita di banyak domain dan region.',
    '',
    'Redaksi menulis satu artikel kanonik lalu menerbitkannya ke banyak situs sekaligus melalui antrean terisolasi per target, dengan isolasi tenant berbasis nama host eksak dan jejak audit hanya-tambah.',
    '',
    '## Layanan',
    `- [Layanan](${origin}/services): cakupan penerbitan, alur 5 langkah, dan jaminan tertulis.`,
    `- [Harga](${origin}/pricing): pembelian lewat kontak langsung tanpa katalog paket, beserta FAQ.`,
    `- [Jaringan](${origin}/network): direktori seluruh portal berita aktif di jaringan Indicate.`,
    `- [Partner](${origin}/partners): organisasi pelanggan yang berlangganan aktif.`,
    `- [Tentang](${origin}/about): cerita, fakta operasional, dan prinsip Indicate.`,
    `- [FAQ](${origin}/faq): jawaban pembelian, langganan manual, domain, bantuan, dan pelaporan konten.`,
    `- [Kontak](${origin}/contact): kanal surel, WhatsApp, dan Telegram.`,
    '',
    ...(portals.length === 0
      ? []
      : [
          `## Jaringan (${origin}/network)`,
          ...portals.slice(0, 100).map((portal) => `- [${portal.name}](https://${portal.hostname})`),
          '',
        ]),
    ...(partners.length === 0
      ? []
      : [
          '## Partner',
          ...partners.slice(0, 100).map((partner) => `- ${partner.name}`),
          '',
        ]),
    '## Legalitas',
    `- [Kebijakan Privasi](${origin}/privacy): penanganan data pembaca, media privat, dan retensi.`,
    `- [Ketentuan Layanan](${origin}/terms): tanggung jawab konten, keamanan akun, isolasi data, dan audit.`,
    `- [Peta Situs](${origin}/sitemap.xml): daftar URL untuk perayap mesin pencari.`,
    '',
  ];
  return lines.join('\n');
}

/** Tenant llms.txt: portal name + description, category channels, and latest coverage list. */
export function tenantLlms(host: string, siteName: string, description: string, categories: readonly string[], articles: readonly { readonly title: string; readonly slug: string; readonly href: string }[]): string {
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
    ...articles.slice(0, 30).map((article) => `- [${article.title}](${article.href.startsWith('https://') ? article.href : `${origin}/${article.slug}`})`),
    '',
    `- [Peta Situs](${origin}/sitemap.xml): daftar URL untuk perayap mesin pencari.`,
    '',
  ];
  return lines.join('\n');
}
