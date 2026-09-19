import { buildSeoDocument } from '@/modules/site/seo';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { WarmEditorialShell } from '@/modules/site/components/network/templates/warm-editorial/chrome/shell';
import { WarmEditorialTicker } from '@/modules/site/components/network/templates/warm-editorial/cards/ticker';
import { WarmEditorialHero } from '@/modules/site/components/network/templates/warm-editorial/cards/hero';
import { WarmEditorialLatest } from '@/modules/site/components/network/templates/warm-editorial/cards/latest';
import { WarmEditorialPicks } from '@/modules/site/components/network/templates/warm-editorial/cards/picks';
import { WarmEditorialLoadMore } from '@/modules/site/components/network/templates/warm-editorial/cards/load-more';
import { WarmEditorialNewsletter } from '@/modules/site/components/network/templates/warm-editorial/cards/newsletter';
import { WarmEditorialJsonLd } from '@/modules/site/components/network/templates/warm-editorial/seo/json-ld';
import { WarmEditorialContainer } from '@/modules/site/components/network/templates/warm-editorial/ui/container';
import { WarmEditorialEmpty } from '@/modules/site/components/network/templates/warm-editorial/ui/empty';
import { WarmEditorialStatusLine } from '@/modules/site/components/network/templates/warm-editorial/ui/status-line';

export interface ListingProps {
  readonly site: NetworkSiteData;
  readonly title: string;
  readonly description?: string | undefined;
  readonly path?: string | undefined;
  readonly indexable?: boolean | undefined;
}

/**
 * Warm Editorial (terakota serif) — template full mandiri: header, ticker, hero, kartu
 * pilihan, newsletter, dan footer milik template sendiri dengan palet
 * hardcoded. Sengaja TIDAK memakai `NetworkTemplate` bersama maupun
 * `site_settings.colors`, agar tampil persis seperti contoh.
 */
export function WarmEditorialListing({ site, title, description, path, indexable }: ListingProps) {
  const seo = buildSeoDocument(site, { path: path ?? '/', indexable: indexable ?? true });
  const [hero, ...rest] = site.articles;
  const picks = rest.slice(0, 3);
  const latest = rest.slice(3, 7);
  const archive = rest.slice(7);
  const quote = site.settings.tagline ?? site.settings.description;

  return (
    <WarmEditorialShell site={site} path={path ?? '/'}>
      <WarmEditorialContainer className="space-y-8 py-6 md:py-8">
        <WarmEditorialStatusLine count={site.articles.length} title={title} />
        {site.articles.length > 0 ? <WarmEditorialTicker articles={site.articles} /> : null}
        {site.articles.length === 0 ? (
          <WarmEditorialEmpty title={title} />
        ) : (
          <>
            {hero ? <WarmEditorialHero article={hero} /> : null}
            <WarmEditorialPicks articles={picks} description={description ?? 'Informasi terkurasi untuk Anda'} />
            <WarmEditorialLatest articles={latest} siteName={site.settings.name} quote={quote} />
            <WarmEditorialNewsletter />
            <WarmEditorialLoadMore
              articles={archive}
              heading="Arsip Berita"
              description="Jelajahi semua liputan kanal ini"
            />
          </>
        )}
      </WarmEditorialContainer>
      <WarmEditorialJsonLd schemas={seo.jsonLd} />
    </WarmEditorialShell>
  );
}
