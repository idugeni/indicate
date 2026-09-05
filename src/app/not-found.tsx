import Link from 'next/link';
import { headers } from 'next/headers';
import { buttonVariants } from '@/components/ui/button';
import { NetworkTemplate } from '@/modules/site/components/network/network-listing';
import { deliveryComposition } from '@/modules/delivery';

async function resolveNotFoundSite() {
  try {
    const requestHeaders = await headers();
    const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host');

    if (!host) return null;

    const { resolver, content, config } = await deliveryComposition();
    const classification = await resolver.classify(host);

    if (classification.kind !== 'site') return null;

    const site = await content.load(
      classification.context,
      {},
      { path: '/404', locale: config.seo.defaultLocale }
    );

    return site;
  } catch {
    return null;
  }
}

export default async function NotFound() {
  const site = await resolveNotFoundSite();

  if (site !== null) {
    return (
      <NetworkTemplate site={site}>
        <section className="public-status" aria-labelledby="not-found-title">
          <p className="m-0 font-mono text-xs font-medium uppercase tracking-wider text-brass">404</p>
          <h1 id="not-found-title">Halaman tidak ditemukan</h1>
          <p>Konten yang Anda cari tidak tersedia di {site.settings.name}.</p>
          <Link href="/">Kembali ke beranda</Link>
        </section>
      </NetworkTemplate>
    );
  }

  return (
    <main className="flex min-h-screen items-center bg-bg p-6 text-paper">
      <div className="mx-auto w-full max-w-md rounded-lg border border-hairline bg-bg-raised p-8 text-center">
        <p className="m-0 font-mono text-xs font-medium uppercase tracking-wider text-brass">404 · Not found</p>
        <h1 className="m-0 mt-2 font-sans text-2xl font-bold tracking-tight">Halaman tidak ditemukan</h1>
        <p className="m-0 mt-2 font-sans text-sm leading-relaxed text-paper-dim">
          Hostname atau alamat yang Anda tuju tidak dikenal atau telah dipindahkan dari jaringan.
        </p>
        <div className="mt-5">
          <Link href="/" className={buttonVariants({ className: 'mt-2' })}>
            Kembali ke beranda
          </Link>
        </div>
      </div>
    </main>
  );
}