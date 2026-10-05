import { buildSeoDocument } from '@/modules/site/seo';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { CleanBlueShell } from '@/modules/site/components/network/templates/clean-blue/chrome/shell';
import { CleanBlueHero } from '@/modules/site/components/network/templates/clean-blue/cards/hero';
import { CleanBluePicks } from '@/modules/site/components/network/templates/clean-blue/cards/picks';
import { CleanBlueArchivePager } from '@/modules/site/components/network/templates/clean-blue/cards/archive-pager';
import { CleanBlueNewsletter } from '@/modules/site/components/network/templates/clean-blue/cards/newsletter';
import { CleanBlueTicker } from '@/modules/site/components/network/templates/clean-blue/cards/ticker';
import { JsonLd } from '@/modules/site/components/network/seo/json-ld';
import { Container } from '@/modules/site/components/network/ui/container';
import { AdSlot } from '@/modules/ads/ad-slot';
import { CleanBlueEmpty } from '@/modules/site/components/network/templates/clean-blue/ui/empty';
import { StatusLine } from '@/modules/site/components/network/ui/status-line';

export interface ListingProps {
  readonly site: NetworkSiteData;
  readonly title: string;
  readonly description?: string | undefined;
  readonly path?: string | undefined;
  readonly indexable?: boolean | undefined;
}

/**
 * Clean Blue Editorial — template full mandiri: header, strip headline statis, hero,
 * kartu pilihan, newsletter, dan footer milik template sendiri dengan palet
 * hardcoded. Sengaja TIDAK memakai `NetworkTemplate` bersama maupun
 * `site_settings.colors`, agar tampil persis seperti contoh.
 */
export function CleanBlueListing({ site, title, description, path, indexable }: ListingProps) {
  const seo = buildSeoDocument(site, { path: path ?? '/', indexable: indexable ?? true });
  const [hero, ...rest] = site.articles;
  const archive = rest.slice(2);

  return (
    <CleanBlueShell site={site} path={path ?? '/'}>
      <Container className="space-y-8 py-6 md:py-8">
        <StatusLine count={site.articles.length} title={title} />
        {site.articles.length > 0 ? <CleanBlueTicker articles={site.articles} /> : null}
        {site.articles.length === 0 ? (
          <CleanBlueEmpty title={title} />
        ) : (
          <>
            <div className="grid gap-8">
              <CleanBlueHero articles={hero ? [hero] : []} />
              <CleanBluePicks articles={rest.slice(0, 2)} description={description ?? 'Informasi terkurasi untuk Anda'} />
            </div>
            <AdSlot site={site} slot="hero-ad" />
            <CleanBlueNewsletter />
            <AdSlot site={site} slot="in-feed" />
            <CleanBlueArchivePager
              articles={archive}
              heading="Jelajahi Liputan"
              description="Jelajahi semua liputan kanal ini"
            />
          </>
        )}
      </Container>
      <JsonLd schemas={seo.jsonLd} />
    </CleanBlueShell>
  );
}
