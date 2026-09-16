import { buildSeoDocument } from '@/modules/site/seo';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { CleanBlueShell } from '@/modules/site/components/network/templates/clean-blue/chrome/shell';
import { CleanBlueTicker } from '@/modules/site/components/network/templates/clean-blue/cards/ticker';
import { CleanBlueHero } from '@/modules/site/components/network/templates/clean-blue/cards/hero';
import { CleanBluePicks } from '@/modules/site/components/network/templates/clean-blue/cards/picks';
import { CleanBlueLoadMore } from '@/modules/site/components/network/templates/clean-blue/cards/load-more';
import { CleanBlueNewsletter } from '@/modules/site/components/network/templates/clean-blue/cards/newsletter';
import { CleanBlueJsonLd } from '@/modules/site/components/network/templates/clean-blue/seo/json-ld';
import { CleanBlueContainer } from '@/modules/site/components/network/templates/clean-blue/ui/container';
import { CleanBlueEmpty } from '@/modules/site/components/network/templates/clean-blue/ui/empty';
import { CleanBlueStatusLine } from '@/modules/site/components/network/templates/clean-blue/ui/status-line';

export interface ListingProps {
  readonly site: NetworkSiteData;
  readonly title: string;
  readonly description?: string | undefined;
  readonly path?: string | undefined;
  readonly indexable?: boolean | undefined;
}

/**
 * Clean Blue Editorial — template full mandiri: header, ticker, hero, kartu
 * pilihan, newsletter, dan footer milik template sendiri dengan palet
 * hardcoded. Sengaja TIDAK memakai `NetworkTemplate` bersama maupun
 * `site_settings.colors`, agar tampil persis seperti contoh.
 */
export function CleanBlueListing({ site, title, description, path, indexable }: ListingProps) {
  const seo = buildSeoDocument(site, { path: path ?? '/', indexable: indexable ?? true });
  const [hero, ...rest] = site.articles;
  const archive = rest.slice(3);

  return (
    <CleanBlueShell site={site} path={path ?? '/'}>
      <CleanBlueContainer className="space-y-8 py-6 md:py-8">
        <CleanBlueStatusLine count={site.articles.length} title={title} />
        {site.articles.length > 0 ? <CleanBlueTicker articles={site.articles} /> : null}
        {site.articles.length === 0 ? (
          <CleanBlueEmpty title={title} />
        ) : (
          <>
            {hero ? <CleanBlueHero article={hero} /> : null}
            <CleanBluePicks articles={rest.slice(0, 3)} description={description ?? 'Informasi terkurasi untuk Anda'} />
            <CleanBlueNewsletter />
            <CleanBlueLoadMore
              articles={archive}
              heading="Arsip Berita"
              description="Jelajahi semua liputan kanal ini"
            />
          </>
        )}
      </CleanBlueContainer>
      <CleanBlueJsonLd schemas={seo.jsonLd} />
    </CleanBlueShell>
  );
}
