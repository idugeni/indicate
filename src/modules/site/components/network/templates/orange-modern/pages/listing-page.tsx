import { buildSeoDocument } from '@/modules/site/seo';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { OrangeModernShell } from '@/modules/site/components/network/templates/orange-modern/chrome/shell';
import { OrangeModernTicker } from '@/modules/site/components/network/templates/orange-modern/cards/ticker';
import { OrangeModernHero } from '@/modules/site/components/network/templates/orange-modern/cards/hero';
import { OrangeModernLatest } from '@/modules/site/components/network/templates/orange-modern/cards/latest';
import { OrangeModernPicks } from '@/modules/site/components/network/templates/orange-modern/cards/picks';
import { OrangeModernLoadMore } from '@/modules/site/components/network/templates/orange-modern/cards/load-more';
import { OrangeModernNewsletter } from '@/modules/site/components/network/templates/orange-modern/cards/newsletter';
import { OrangeModernJsonLd } from '@/modules/site/components/network/templates/orange-modern/seo/json-ld';
import { OrangeModernContainer } from '@/modules/site/components/network/templates/orange-modern/ui/container';
import { OrangeModernEmpty } from '@/modules/site/components/network/templates/orange-modern/ui/empty';
import { OrangeModernStatusLine } from '@/modules/site/components/network/templates/orange-modern/ui/status-line';

export interface ListingProps {
  readonly site: NetworkSiteData;
  readonly title: string;
  readonly description?: string | undefined;
  readonly path?: string | undefined;
  readonly indexable?: boolean | undefined;
}

/**
 * Orange Modern (oranye) — template full mandiri: header, ticker, hero, kartu
 * pilihan, newsletter, dan footer milik template sendiri dengan palet
 * hardcoded. Sengaja TIDAK memakai `NetworkTemplate` bersama maupun
 * `site_settings.colors`, agar tampil persis seperti contoh.
 */
export function OrangeModernListing({ site, title, description, path, indexable }: ListingProps) {
  const seo = buildSeoDocument(site, { path: path ?? '/', indexable: indexable ?? true });
  const [hero, ...rest] = site.articles;
  const picks = rest.slice(0, 4);
  const latest = rest.slice(4, 8);
  const archive = rest.slice(8);

  return (
    <OrangeModernShell site={site} path={path ?? '/'}>
      <OrangeModernContainer className="space-y-8 py-6 md:py-8">
        <OrangeModernStatusLine count={site.articles.length} title={title} />
        {site.articles.length > 0 ? <OrangeModernTicker articles={site.articles} /> : null}
        {site.articles.length === 0 ? (
          <OrangeModernEmpty title={title} />
        ) : (
          <>
            {hero ? (
              <OrangeModernHero article={hero} sideNote={site.settings.tagline ?? null} />
            ) : null}
            <OrangeModernPicks
              articles={picks}
              heading="Berita Pilihan"
              columns={4}
              description={description ?? 'Informasi terkurasi untuk Anda'}
            />
            <OrangeModernLatest articles={latest} siteName={site.settings.name} />
            <OrangeModernNewsletter />
            <OrangeModernLoadMore
              articles={archive}
              heading="Arsip Berita"
              description="Jelajahi semua liputan kanal ini"
            />
          </>
        )}
      </OrangeModernContainer>
      <OrangeModernJsonLd schemas={seo.jsonLd} />
    </OrangeModernShell>
  );
}
