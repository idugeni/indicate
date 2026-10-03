import { buildSeoDocument } from '@/modules/site/seo';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { GreenMinimalShell } from '@/modules/site/components/network/templates/green-minimal/chrome/shell';
import { GreenMinimalLatest } from '@/modules/site/components/network/templates/green-minimal/cards/latest';
import { GreenMinimalArchivePager } from '@/modules/site/components/network/templates/green-minimal/cards/archive-pager';
import { GreenMinimalNewsletter } from '@/modules/site/components/network/templates/green-minimal/cards/newsletter';
import { GreenMinimalTicker } from '@/modules/site/components/network/templates/green-minimal/cards/ticker';
import { JsonLd } from '@/modules/site/components/network/seo/json-ld';
import { Container } from '@/modules/site/components/network/ui/container';
import { GreenMinimalEmpty } from '@/modules/site/components/network/templates/green-minimal/ui/empty';

export interface ListingProps {
  readonly site: NetworkSiteData;
  readonly title: string;
  readonly description?: string | undefined;
  readonly path?: string | undefined;
  readonly indexable?: boolean | undefined;
}

/**
 * Green Minimal (hijau natural) — template full mandiri: header, strip headline statis,
 * daftar terbaru, newsletter, dan footer milik template sendiri dengan palet
 * hardcoded. Sengaja TIDAK memakai `NetworkTemplate` bersama maupun
 * `site_settings.colors`, agar tampil persis seperti contoh.
 */
export function GreenMinimalListing({ site, title, description, path, indexable }: ListingProps) {
  const seo = buildSeoDocument(site, { path: path ?? '/', indexable: indexable ?? true });
  const latest = site.articles.slice(0, 4);
  const archive = site.articles.slice(4);

  return (
    <GreenMinimalShell site={site} path={path ?? '/'}>
      <Container className="space-y-10 py-8 md:py-10">
        {site.articles.length > 0 ? <GreenMinimalTicker articles={site.articles} /> : null}
        {site.articles.length === 0 ? (
          <GreenMinimalEmpty title={title} />
        ) : (
          <>
            <GreenMinimalLatest articles={latest} description={description ?? 'Liputan terbaru dari redaksi'} />
            <GreenMinimalNewsletter />
            <GreenMinimalArchivePager
              articles={archive}
              heading="Semua Liputan"
              description="Jelajahi semua liputan kanal ini"
            />
          </>
        )}
      </Container>
      <JsonLd schemas={seo.jsonLd} />
    </GreenMinimalShell>
  );
}
