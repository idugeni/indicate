import { buildSeoDocument } from '@/modules/site/seo';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { WarmEditorialShell } from '@/modules/site/components/network/templates/warm-editorial/chrome/shell';
import { WarmEditorialHero } from '@/modules/site/components/network/templates/warm-editorial/cards/hero';
import { WarmEditorialLatest } from '@/modules/site/components/network/templates/warm-editorial/cards/latest';
import { WarmEditorialArchivePager } from '@/modules/site/components/network/templates/warm-editorial/cards/archive-pager';
import { WarmEditorialNewsletter } from '@/modules/site/components/network/templates/warm-editorial/cards/newsletter';
import { JsonLd } from '@/modules/site/components/network/seo/json-ld';
import { Container } from '@/modules/site/components/network/ui/container';
import { WarmEditorialEmpty } from '@/modules/site/components/network/templates/warm-editorial/ui/empty';

export interface ListingProps {
  readonly site: NetworkSiteData;
  readonly title: string;
  readonly description?: string | undefined;
  readonly path?: string | undefined;
  readonly indexable?: boolean | undefined;
}

/**
 * Warm Editorial (terakota serif) — template full mandiri: header, hero, kartu
 * pilihan, newsletter, dan footer milik template sendiri dengan palet
 * hardcoded. Sengaja TIDAK memakai `NetworkTemplate` bersama maupun
 * `site_settings.colors`, agar tampil persis seperti contoh.
 */
export function WarmEditorialListing({ site, title, description, path, indexable }: ListingProps) {
  const seo = buildSeoDocument(site, { path: path ?? '/', indexable: indexable ?? true });
  const [hero, ...rest] = site.articles;
  const latest = rest.slice(0, 4);
  const archive = rest.slice(4);
  const quote = site.settings.tagline ?? site.settings.description;

  return (
    <WarmEditorialShell site={site} path={path ?? '/'}>
      <Container className="space-y-10 py-8 md:py-10">
        {site.articles.length === 0 ? (
          <WarmEditorialEmpty title={title} />
        ) : (
          <>
            {hero ? <WarmEditorialHero article={hero} /> : null}
            <WarmEditorialLatest articles={latest} siteName={site.settings.name} quote={quote} description={description ?? 'Kabar terkini yang baru diterbitkan'} />
            <WarmEditorialNewsletter />
            <WarmEditorialArchivePager
              articles={archive}
              heading="Arsip Berita"
              description="Jelajahi semua liputan kanal ini"
            />
          </>
        )}
      </Container>
      <JsonLd schemas={seo.jsonLd} />
    </WarmEditorialShell>
  );
}
