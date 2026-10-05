import { buildSeoDocument } from '@/modules/site/seo';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { SoftBlueShell } from '@/modules/site/components/network/templates/soft-blue/chrome/shell';
import { SoftBlueHero } from '@/modules/site/components/network/templates/soft-blue/cards/hero';
import { SoftBluePicks } from '@/modules/site/components/network/templates/soft-blue/cards/picks';
import { SoftBlueArchivePager } from '@/modules/site/components/network/templates/soft-blue/cards/archive-pager';
import { SoftBlueNewsletter } from '@/modules/site/components/network/templates/soft-blue/cards/newsletter';
import { SoftBlueTicker } from '@/modules/site/components/network/templates/soft-blue/cards/ticker';
import { JsonLd } from '@/modules/site/components/network/seo/json-ld';
import { Container } from '@/modules/site/components/network/ui/container';
import { AdSlot } from '@/modules/ads/ad-slot';
import { SoftBlueEmpty } from '@/modules/site/components/network/templates/soft-blue/ui/empty';
import { StatusLine } from '@/modules/site/components/network/ui/status-line';

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
        {site.articles.length > 0 ? <SoftBlueTicker articles={site.articles} /> : null}
        {site.articles.length === 0 ? (
          <SoftBlueEmpty title={title} />
        ) : (
          <>
            <div className="grid items-start gap-8 lg:grid-cols-2">
              <SoftBlueHero articles={hero ? [hero] : []} />
              <SoftBluePicks articles={rest.slice(0, 4)} description={description ?? 'Informasi terkurasi untuk Anda'} />
            </div>
            <AdSlot site={site} slot="hero-ad" />
            <SoftBlueNewsletter />
            <AdSlot site={site} slot="in-feed" />
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
