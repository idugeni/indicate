import { buildSeoDocument } from '@/modules/site/seo';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { SoftBlueShell } from '@/modules/site/components/network/templates/soft-blue/chrome/shell';
import { SoftBlueTicker } from '@/modules/site/components/network/templates/soft-blue/cards/ticker';
import { SoftBlueHero } from '@/modules/site/components/network/templates/soft-blue/cards/hero';
import { SoftBluePicks } from '@/modules/site/components/network/templates/soft-blue/cards/picks';
import { SoftBlueLoadMore } from '@/modules/site/components/network/templates/soft-blue/cards/load-more';
import { SoftBlueNewsletter } from '@/modules/site/components/network/templates/soft-blue/cards/newsletter';
import { SoftBlueJsonLd } from '@/modules/site/components/network/templates/soft-blue/seo/json-ld';
import { SoftBlueContainer } from '@/modules/site/components/network/templates/soft-blue/ui/container';
import { SoftBlueEmpty } from '@/modules/site/components/network/templates/soft-blue/ui/empty';
import { SoftBlueStatusLine } from '@/modules/site/components/network/templates/soft-blue/ui/status-line';

export interface ListingProps {
  readonly site: NetworkSiteData;
  readonly title: string;
  readonly description?: string | undefined;
  readonly path?: string | undefined;
  readonly indexable?: boolean | undefined;
}

/**
 * Soft Blue Cards (biru lembut) — template full mandiri: header, ticker, hero, kartu
 * pilihan, newsletter, dan footer milik template sendiri dengan palet
 * hardcoded. Sengaja TIDAK memakai `NetworkTemplate` bersama maupun
 * `site_settings.colors`, agar tampil persis seperti contoh.
 */
export function SoftBlueListing({ site, title, description, path, indexable }: ListingProps) {
  const seo = buildSeoDocument(site, { path: path ?? '/', indexable: indexable ?? true });
  const [hero, ...rest] = site.articles;
  const archive = rest.slice(4);

  return (
    <SoftBlueShell site={site} path={path ?? '/'}>
      <SoftBlueContainer className="space-y-8 py-6 md:py-8">
        <SoftBlueStatusLine count={site.articles.length} title={title} />
        {site.articles.length > 0 ? <SoftBlueTicker articles={site.articles} /> : null}
        {site.articles.length === 0 ? (
          <SoftBlueEmpty title={title} />
        ) : (
          <>
            {hero ? <SoftBlueHero article={hero} /> : null}
            <SoftBluePicks articles={rest.slice(0, 4)} description={description ?? 'Informasi terkurasi untuk Anda'} />
            <SoftBlueNewsletter />
            <SoftBlueLoadMore
              articles={archive}
              heading="Arsip Berita"
              description="Jelajahi semua liputan kanal ini"
            />
          </>
        )}
      </SoftBlueContainer>
      <SoftBlueJsonLd schemas={seo.jsonLd} />
    </SoftBlueShell>
  );
}
