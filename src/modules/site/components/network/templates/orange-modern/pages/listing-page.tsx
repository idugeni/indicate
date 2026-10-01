import Link from 'next/link';

import { buildSeoDocument } from '@/modules/site/seo';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { OrangeModernShell } from '@/modules/site/components/network/templates/orange-modern/chrome/shell';
import { OrangeModernHero } from '@/modules/site/components/network/templates/orange-modern/cards/hero';
import { OrangeModernLatest } from '@/modules/site/components/network/templates/orange-modern/cards/latest';
import { OrangeModernPicks } from '@/modules/site/components/network/templates/orange-modern/cards/picks';
import { OrangeModernArchivePager } from '@/modules/site/components/network/templates/orange-modern/cards/archive-pager';
import { OrangeModernNewsletter } from '@/modules/site/components/network/templates/orange-modern/cards/newsletter';
import { JsonLd } from '@/modules/site/components/network/seo/json-ld';
import { Container } from '@/modules/site/components/network/ui/container';
import { OrangeModernEmpty } from '@/modules/site/components/network/templates/orange-modern/ui/empty';
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
 * Orange Modern (oranye) — template full mandiri: header, strip headline statis, hero,
 * kartu pilihan, newsletter, dan footer milik template sendiri dengan palet
 * hardcoded. Sengaja TIDAK memakai `NetworkTemplate` bersama maupun
 * `site_settings.colors`, agar tampil persis seperti contoh.
 */
export function OrangeModernListing({ site, title, description, path, indexable }: ListingProps) {
  const seo = buildSeoDocument(site, { path: path ?? '/', indexable: indexable ?? true });
  const [hero, ...rest] = site.articles;
  const picks = rest.slice(0, 4);
  const latest = rest.slice(4, 8);
  const archive = rest.slice(8);
  const quote = site.settings.tagline ?? site.settings.description;

  return (
    <OrangeModernShell site={site} path={path ?? '/'}>
      <Container className="space-y-6 py-6 md:py-8">
        <StatusLine count={site.articles.length} title={title} />
        {site.articles.length > 0 ? (
          <div className="flex flex-col gap-2 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200/70 sm:flex-row sm:items-center sm:gap-3">
            <span className="flex-none self-start rounded-full bg-[var(--tpl-primary,#ea580c)] px-3.5 py-1.5 font-sans text-xs font-bold tracking-wide text-white sm:self-auto">
              TERKINI
            </span>
            <ul className="m-0 flex min-w-0 flex-1 list-none flex-col gap-1.5 p-0 sm:flex-row sm:items-center sm:gap-5">
              {site.articles.slice(0, 3).map((article) => (
                <li
                  key={article.id}
                  className="min-w-0 font-sans text-sm font-medium leading-snug text-slate-800"
                >
                  <span className="mr-1.5 font-bold opacity-70">{article.attribution}</span>
                  <Link href={article.href} className="no-underline hover:text-[var(--tpl-primary,#ea580c)]">
                    {tickerHeadline(article)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {site.articles.length === 0 ? (
          <OrangeModernEmpty title={title} />
        ) : (
          <>
            <div className="grid gap-8">
              {hero ? (
                <OrangeModernHero article={hero} />
              ) : null}
              <OrangeModernPicks
                articles={picks}
                heading="Berita Pilihan"
                columns={4}
                description={description ?? 'Informasi terkurasi untuk Anda'}
              />
            </div>
            <OrangeModernLatest articles={latest} siteName={site.settings.name} quote={quote} />
            <OrangeModernNewsletter />
            <OrangeModernArchivePager
              articles={archive}
              heading="Arsip Berita"
              description="Jelajahi semua liputan kanal ini"
            />
          </>
        )}
      </Container>
      <JsonLd schemas={seo.jsonLd} />
    </OrangeModernShell>
  );
}
