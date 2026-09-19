import { buildSeoDocument } from '@/modules/site/seo';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { GreenMinimalShell } from '@/modules/site/components/network/templates/green-minimal/chrome/shell';
import { GreenMinimalTicker } from '@/modules/site/components/network/templates/green-minimal/cards/ticker';
import { GreenMinimalHero } from '@/modules/site/components/network/templates/green-minimal/cards/hero';
import { GreenMinimalLatest } from '@/modules/site/components/network/templates/green-minimal/cards/latest';
import { GreenMinimalLoadMore } from '@/modules/site/components/network/templates/green-minimal/cards/load-more';
import { GreenMinimalNewsletter } from '@/modules/site/components/network/templates/green-minimal/cards/newsletter';
import { GreenMinimalJsonLd } from '@/modules/site/components/network/templates/green-minimal/seo/json-ld';
import { GreenMinimalContainer } from '@/modules/site/components/network/templates/green-minimal/ui/container';
import { GreenMinimalEmpty } from '@/modules/site/components/network/templates/green-minimal/ui/empty';
import { GreenMinimalStatusLine } from '@/modules/site/components/network/templates/green-minimal/ui/status-line';

export interface ListingProps {
  readonly site: NetworkSiteData;
  readonly title: string;
  readonly description?: string | undefined;
  readonly path?: string | undefined;
  readonly indexable?: boolean | undefined;
}

/**
 * Green Minimal (hijau natural) — template full mandiri: header, ticker, hero, kartu
 * pilihan, newsletter, dan footer milik template sendiri dengan palet
 * hardcoded. Sengaja TIDAK memakai `NetworkTemplate` bersama maupun
 * `site_settings.colors`, agar tampil persis seperti contoh.
 */
export function GreenMinimalListing({ site, title, description, path, indexable }: ListingProps) {
  const seo = buildSeoDocument(site, { path: path ?? '/', indexable: indexable ?? true });
  const [hero, ...rest] = site.articles;
  const latest = rest.slice(0, 4);
  const archive = rest.slice(4);

  return (
    <GreenMinimalShell site={site} path={path ?? '/'}>
      <GreenMinimalContainer className="space-y-8 py-6 md:py-8">
        <GreenMinimalStatusLine count={site.articles.length} title={title} />
        {site.articles.length > 0 ? <GreenMinimalTicker articles={site.articles} /> : null}
        {site.articles.length === 0 ? (
          <GreenMinimalEmpty title={title} />
        ) : (
          <>
            {hero ? <GreenMinimalHero article={hero} /> : null}
            <GreenMinimalLatest articles={latest} description={description ?? 'Liputan terbaru dari redaksi'} />
            <GreenMinimalNewsletter />
            <GreenMinimalLoadMore
              articles={archive}
              heading="Arsip Berita"
              description="Jelajahi semua liputan kanal ini"
            />
          </>
        )}
      </GreenMinimalContainer>
      <GreenMinimalJsonLd schemas={seo.jsonLd} />
    </GreenMinimalShell>
  );
}
