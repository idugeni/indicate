import Link from 'next/link';

import { buildSeoDocument } from '@/modules/site/seo';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { GreenMinimalShell } from '@/modules/site/components/network/templates/green-minimal/chrome/shell';
import { GreenMinimalLatest } from '@/modules/site/components/network/templates/green-minimal/cards/latest';
import { GreenMinimalArchivePager } from '@/modules/site/components/network/templates/green-minimal/cards/archive-pager';
import { GreenMinimalNewsletter } from '@/modules/site/components/network/templates/green-minimal/cards/newsletter';
import { JsonLd } from '@/modules/site/components/network/seo/json-ld';
import { Container } from '@/modules/site/components/network/ui/container';
import { GreenMinimalEmpty } from '@/modules/site/components/network/templates/green-minimal/ui/empty';
import { tickerHeadline } from '@/modules/site/components/network/ui/format';

export interface ListingProps {
  readonly site: NetworkSiteData;
  readonly title: string;
  readonly description?: string | undefined;
  readonly path?: string | undefined;
  readonly indexable?: boolean | undefined;
}

/**
 * Green Minimal (hijau natural) — template full mandiri: header, strip headline statis,
 * daftar terbaru, newsletter, dan footer milik template sendiri dengan palet
 * hardcoded. Sengaja TIDAK memakai `NetworkTemplate` bersama maupun
 * `site_settings.colors`, agar tampil persis seperti contoh.
 */
export function GreenMinimalListing({ site, title, description, path, indexable }: ListingProps) {
  const seo = buildSeoDocument(site, { path: path ?? '/', indexable: indexable ?? true });
  const latest = site.articles.slice(0, 4);
  const archive = site.articles.slice(4);

  return (
    <GreenMinimalShell site={site} path={path ?? '/'}>
      <Container className="space-y-10 py-8 md:py-10">
        {site.articles.length > 0 ? (
          <div className="flex flex-col gap-2 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200/70 sm:flex-row sm:items-center sm:gap-3">
            <span className="flex-none self-start rounded-full bg-[var(--tpl-primary,#1d7a38)] px-3.5 py-1.5 font-sans text-xs font-bold tracking-wide text-white sm:self-auto">
              TERKINI
            </span>
            <ul className="m-0 flex min-w-0 flex-1 list-none flex-col gap-1.5 p-0 sm:flex-row sm:items-center sm:gap-5">
              {site.articles.slice(0, 3).map((article) => (
                <li
                  key={article.id}
                  className="min-w-0 font-sans text-sm font-medium leading-snug text-slate-800"
                >
                  <span className="mr-1.5 font-bold opacity-70">{article.attribution}</span>
                  <Link href={article.href} className="no-underline hover:text-[var(--tpl-primary,#1d7a38)]">
                    {tickerHeadline(article)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {site.articles.length === 0 ? (
          <GreenMinimalEmpty title={title} />
        ) : (
          <>
            <GreenMinimalLatest articles={latest} description={description ?? 'Liputan terbaru dari redaksi'} />
            <GreenMinimalNewsletter />
            <GreenMinimalArchivePager
              articles={archive}
              heading="Arsip Berita"
              description="Jelajahi semua liputan kanal ini"
            />
          </>
        )}
      </Container>
      <JsonLd schemas={seo.jsonLd} />
    </GreenMinimalShell>
  );
}
