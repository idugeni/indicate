import { buildSeoDocument } from '@/modules/site/seo';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { RedEditorialShell } from '@/modules/site/components/network/templates/red-editorial/chrome/shell';
import { RedEditorialTicker } from '@/modules/site/components/network/templates/red-editorial/cards/ticker';
import { RedEditorialHero } from '@/modules/site/components/network/templates/red-editorial/cards/hero';
import { RedEditorialPicks } from '@/modules/site/components/network/templates/red-editorial/cards/picks';
import { RedEditorialLoadMore } from '@/modules/site/components/network/templates/red-editorial/cards/load-more';
import { RedEditorialNewsletter } from '@/modules/site/components/network/templates/red-editorial/cards/newsletter';
import { RedEditorialJsonLd } from '@/modules/site/components/network/templates/red-editorial/seo/json-ld';
import { RedEditorialContainer } from '@/modules/site/components/network/templates/red-editorial/ui/container';
import { RedEditorialEmpty } from '@/modules/site/components/network/templates/red-editorial/ui/empty';
import { RedEditorialStatusLine } from '@/modules/site/components/network/templates/red-editorial/ui/status-line';

export interface ListingProps {
  readonly site: NetworkSiteData;
  readonly title: string;
  readonly description?: string | undefined;
  readonly path?: string | undefined;
  readonly indexable?: boolean | undefined;
}

/**
 * Red Editorial (merah serif) — template full mandiri: header, ticker, hero, kartu
 * pilihan, newsletter, dan footer milik template sendiri dengan palet
 * hardcoded. Sengaja TIDAK memakai `NetworkTemplate` bersama maupun
 * `site_settings.colors`, agar tampil persis seperti contoh.
 */
export function RedEditorialListing({ site, title, description, path, indexable }: ListingProps) {
  const seo = buildSeoDocument(site, { path: path ?? '/', indexable: indexable ?? true });
  const [hero, ...rest] = site.articles;
  const picks = rest.slice(0, 4);
  const archive = rest.slice(4);

  return (
    <RedEditorialShell site={site} path={path ?? '/'}>
      <RedEditorialContainer className="space-y-8 py-6 md:py-8">
        <RedEditorialStatusLine count={site.articles.length} title={title} />
        {site.articles.length > 0 ? <RedEditorialTicker articles={site.articles} /> : null}
        {site.articles.length === 0 ? (
          <RedEditorialEmpty title={title} />
        ) : (
          <>
            {hero ? <RedEditorialHero article={hero} /> : null}
            <RedEditorialPicks articles={picks} description={description ?? 'Informasi terkurasi untuk Anda'} />
            <RedEditorialNewsletter />
            <RedEditorialLoadMore
              articles={archive}
              heading="Arsip Berita"
              description="Jelajahi semua liputan kanal ini"
            />
          </>
        )}
      </RedEditorialContainer>
      <RedEditorialJsonLd schemas={seo.jsonLd} />
    </RedEditorialShell>
  );
}
