import Link from 'next/link';
import { headers } from 'next/headers';
import { PublicTemplate } from './public-template';
import { stage5Composition } from './stage5-composition';

export default async function NotFound() { const host = (await headers()).get('host'); const { resolver, content, config } = stage5Composition(); const classification = await resolver.classify(host); if (classification.kind === 'site') { const site = await content.load(classification.context, {}, { path: '/404', locale: config.seo.defaultLocale }); if (site !== null) return <PublicTemplate site={site}><section className="public-status" aria-labelledby="not-found-title"><p className="eyebrow">404</p><h1 id="not-found-title">Halaman tidak ditemukan</h1><p>Konten yang Anda cari tidak tersedia di {site.settings.name}.</p><Link href="/">Kembali ke beranda</Link></section></PublicTemplate>; } return <main className="public-status"><h1>Halaman tidak ditemukan</h1><p>Hostname atau halaman tidak dikenal.</p></main>; }
