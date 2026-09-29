import { buildSeoDocument } from '@/modules/site/seo';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { PurpleEditorialShell } from '@/modules/site/components/network/templates/purple-editorial/chrome/shell';
import { PurpleEditorialTicker } from '@/modules/site/components/network/templates/purple-editorial/cards/ticker';
import { PurpleEditorialHero } from '@/modules/site/components/network/templates/purple-editorial/cards/hero';
import { PurpleEditorialLatest } from '@/modules/site/components/network/templates/purple-editorial/cards/latest';
import { PurpleEditorialPicks } from '@/modules/site/components/network/templates/purple-editorial/cards/picks';
import { PurpleEditorialArchivePager } from '@/modules/site/components/network/templates/purple-editorial/cards/archive-pager';
import { PurpleEditorialNewsletter } from '@/modules/site/components/network/templates/purple-editorial/cards/newsletter';
import { JsonLd } from '@/modules/site/components/network/seo/json-ld';
import { Container } from '@/modules/site/components/network/ui/container';
import { PurpleEditorialEmpty } from '@/modules/site/components/network/templates/purple-editorial/ui/empty';
import { StatusLine } from '@/modules/site/components/network/ui/status-line';

export interface ListingProps {
  readonly site: NetworkSiteData;
  readonly title: string;
  readonly description?: string | undefined;
  readonly path?: string | undefined;
  readonly indexable?: boolean | undefined;
}

/**
 * Purple Digital Editorial (ungu) — template full mandiri: header, ticker, hero, kartu
 * pilihan, newsletter, dan footer milik template sendiri dengan palet
 * hardcoded. Sengaja TIDAK memakai `NetworkTemplate` bersama maupun
 * `site_settings.colors`, agar tampil persis seperti contoh.
 */
export function PurpleEditorialListing({ site, title, description, path, indexable }: ListingProps) {
  const seo = buildSeoDocument(site, { path: path ?? '/', indexable: indexable ?? true });
  const [hero, ...rest] = site.articles;
  const picks = rest.slice(0, 3);
  const latest = rest.slice(3, 7);
  const archive = rest.slice(7);
  const quote = site.settings.tagline ?? site.settings.description;

  return (
    <PurpleEditorialShell site={site} path={path ?? '/'}>
      <Container className="space-y-8 py-6 md:py-8">
        <StatusLine count={site.articles.length} title={title} />
        {site.articles.length > 0 ? <PurpleEditorialTicker articles={site.articles} /> : null}
        {site.articles.length === 0 ? (
          <PurpleEditorialEmpty title={title} />
        ) : (
          <>
            {hero ? <PurpleEditorialHero article={hero} /> : null}
            <PurpleEditorialPicks articles={picks} description={description ?? 'Informasi terkurasi untuk Anda'} />
            <PurpleEditorialLatest articles={latest} siteName={site.settings.name} quote={quote} />
            <PurpleEditorialNewsletter />
            <PurpleEditorialArchivePager
              articles={archive}
              heading="Arsip Berita"
              description="Jelajahi semua liputan kanal ini"
            />
          </>
        )}
      </Container>
      <JsonLd schemas={seo.jsonLd} />
    </PurpleEditorialShell>
  );
}
