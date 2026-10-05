import { buildSeoDocument } from '@/modules/site/seo';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { OrangeModernShell } from '@/modules/site/components/network/templates/orange-modern/chrome/shell';
import { OrangeModernHero } from '@/modules/site/components/network/templates/orange-modern/cards/hero';
import { OrangeModernLatest } from '@/modules/site/components/network/templates/orange-modern/cards/latest';
import { OrangeModernPicks } from '@/modules/site/components/network/templates/orange-modern/cards/picks';
import { OrangeModernArchivePager } from '@/modules/site/components/network/templates/orange-modern/cards/archive-pager';
import { OrangeModernNewsletter } from '@/modules/site/components/network/templates/orange-modern/cards/newsletter';
import { OrangeModernTicker } from '@/modules/site/components/network/templates/orange-modern/cards/ticker';
import { JsonLd } from '@/modules/site/components/network/seo/json-ld';
import { Container } from '@/modules/site/components/network/ui/container';
import { AdSlot } from '@/modules/ads/ad-slot';
import { OrangeModernEmpty } from '@/modules/site/components/network/templates/orange-modern/ui/empty';
import { StatusLine } from '@/modules/site/components/network/ui/status-line';

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
        {site.articles.length > 0 ? <OrangeModernTicker articles={site.articles} /> : null}
        {site.articles.length === 0 ? (
          <OrangeModernEmpty title={title} />
        ) : (
          <>
            <div className="grid gap-8">
              <OrangeModernHero articles={hero ? [hero] : []} />
              <OrangeModernPicks
                articles={picks}
                heading="Berita Pilihan"
                columns={4}
                description={description ?? 'Informasi terkurasi untuk Anda'}
              />
            </div>
            <AdSlot site={site} slot="hero-ad" />
            <OrangeModernLatest articles={latest} siteName={site.settings.name} quote={quote} />
            <AdSlot site={site} slot="in-feed" />
            <OrangeModernNewsletter />
            <OrangeModernArchivePager
              articles={archive}
              heading="Berita Lainnya"
              description="Jelajahi semua liputan kanal ini"
            />
          </>
        )}
      </Container>
      <JsonLd schemas={seo.jsonLd} />
    </OrangeModernShell>
  );
}
