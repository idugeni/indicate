import Link from 'next/link';

import { buildSeoDocument } from '@/modules/site/seo';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { SoftBlueShell } from '@/modules/site/components/network/templates/soft-blue/chrome/shell';
import { SoftBlueHero } from '@/modules/site/components/network/templates/soft-blue/cards/hero';
import { SoftBluePicks } from '@/modules/site/components/network/templates/soft-blue/cards/picks';
import { SoftBlueArchivePager } from '@/modules/site/components/network/templates/soft-blue/cards/archive-pager';
import { SoftBlueNewsletter } from '@/modules/site/components/network/templates/soft-blue/cards/newsletter';
import { JsonLd } from '@/modules/site/components/network/seo/json-ld';
import { Container } from '@/modules/site/components/network/ui/container';
import { SoftBlueEmpty } from '@/modules/site/components/network/templates/soft-blue/ui/empty';
import { StatusLine } from '@/modules/site/components/network/ui/status-line';
import { tickerHeadline } from '@/modules/site/components/network/ui/format';

export interface ListingProps {
  readonly site: NetworkSiteData;
  readonly title: string;
  readonly description?: string | undefined;
  readonly path?: string | undefined;
  readonly indexable?: boolean | undefined;
}

/**
 * Soft Blue Cards (biru lembut) — template full mandiri: header, strip headline statis,
 * hero, kartu pilihan, newsletter, dan footer milik template sendiri dengan palet
 * hardcoded. Sengaja TIDAK memakai `NetworkTemplate` bersama maupun
 * `site_settings.colors`, agar tampil persis seperti contoh.
 */
export function SoftBlueListing({ site, title, description, path, indexable }: ListingProps) {
  const seo = buildSeoDocument(site, { path: path ?? '/', indexable: indexable ?? true });
  const [hero, ...rest] = site.articles;
  const archive = rest.slice(4);

  return (
    <SoftBlueShell site={site} path={path ?? '/'}>
      <Container className="space-y-8 py-6 md:py-8">
        <StatusLine count={site.articles.length} title={title} />
        {site.articles.length > 0 ? (
          <div className="flex flex-col gap-2 rounded-2xl bg-[#e6efff] p-3 shadow-sm ring-1 ring-[#c9dcff]/70 sm:flex-row sm:items-center sm:gap-3">
            <span className="flex-none self-start rounded-full bg-[var(--tpl-primary,#2563eb)] px-3.5 py-1.5 font-sans text-xs font-bold tracking-wide text-white sm:self-auto">
              TERKINI
            </span>
            <ul className="m-0 flex min-w-0 flex-1 list-none flex-col gap-1.5 p-0 sm:flex-row sm:items-center sm:gap-5">
              {site.articles.slice(0, 3).map((article) => (
                <li
                  key={article.id}
                  className="min-w-0 font-sans text-sm font-medium leading-snug text-slate-800"
                >
                  <span className="mr-1.5 font-bold opacity-70">{article.attribution}</span>
                  <Link href={article.href} className="no-underline hover:text-[var(--tpl-primary,#2563eb)]">
                    {tickerHeadline(article)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {site.articles.length === 0 ? (
          <SoftBlueEmpty title={title} />
        ) : (
          <>
            <div className="grid items-start gap-8 lg:grid-cols-2">
              {hero ? <SoftBlueHero article={hero} /> : null}
              <SoftBluePicks articles={rest.slice(0, 4)} description={description ?? 'Informasi terkurasi untuk Anda'} />
            </div>
            <SoftBlueNewsletter />
            <SoftBlueArchivePager
              articles={archive}
              heading="Kabar Lainnya"
              description="Jelajahi semua liputan kanal ini"
            />
          </>
        )}
      </Container>
      <JsonLd schemas={seo.jsonLd} />
    </SoftBlueShell>
  );
}
