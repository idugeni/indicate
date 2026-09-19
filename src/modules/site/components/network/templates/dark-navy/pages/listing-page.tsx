import { buildSeoDocument } from '@/modules/site/seo';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { DarkNavyShell } from '@/modules/site/components/network/templates/dark-navy/chrome/shell';
import { DarkNavyTicker } from '@/modules/site/components/network/templates/dark-navy/cards/ticker';
import { DarkNavyHero } from '@/modules/site/components/network/templates/dark-navy/cards/hero';
import { DarkNavyLatest } from '@/modules/site/components/network/templates/dark-navy/cards/latest';
import { DarkNavyMostRead } from '@/modules/site/components/network/templates/dark-navy/cards/most-read';
import { DarkNavyLoadMore } from '@/modules/site/components/network/templates/dark-navy/cards/load-more';
import { DarkNavyNewsletter } from '@/modules/site/components/network/templates/dark-navy/cards/newsletter';
import { DarkNavyJsonLd } from '@/modules/site/components/network/templates/dark-navy/seo/json-ld';
import { DarkNavyContainer } from '@/modules/site/components/network/templates/dark-navy/ui/container';
import { DarkNavyEmpty } from '@/modules/site/components/network/templates/dark-navy/ui/empty';
import { DarkNavyStatusLine } from '@/modules/site/components/network/templates/dark-navy/ui/status-line';

export interface ListingProps {
  readonly site: NetworkSiteData;
  readonly title: string;
  readonly description?: string | undefined;
  readonly path?: string | undefined;
  readonly indexable?: boolean | undefined;
}

/**
 * Dark Navy Modern (dark navy + biru) — template full mandiri: header, ticker, hero, kartu
 * pilihan, newsletter, dan footer milik template sendiri dengan palet
 * hardcoded. Sengaja TIDAK memakai `NetworkTemplate` bersama maupun
 * `site_settings.colors`, agar tampil persis seperti contoh.
 */
export function DarkNavyListing({ site, title, description, path, indexable }: ListingProps) {
  const seo = buildSeoDocument(site, { path: path ?? '/', indexable: indexable ?? true });
  const rest = site.articles.slice(1);
  const latest = rest.slice(0, 5);
  const mostRead = [...rest].sort((a, b) => b.viewCount - a.viewCount).slice(0, 5);
  const archive = rest.slice(5);

  return (
    <DarkNavyShell site={site} path={path ?? '/'}>
      <DarkNavyContainer className="space-y-8 py-6 md:py-8">
        <DarkNavyStatusLine count={site.articles.length} title={title} />
        {site.articles.length > 0 ? <DarkNavyTicker articles={site.articles} /> : null}
        {site.articles.length === 0 ? (
          <DarkNavyEmpty title={title} />
        ) : (
          <>
            <DarkNavyHero articles={site.articles.slice(0, 5)} />
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
              <DarkNavyLatest
                articles={latest}
                description={description ?? 'Informasi terkini dari berbagai daerah dan dunia.'}
              />
              <div className="grid min-w-0 gap-6">
                <DarkNavyMostRead articles={mostRead} />
                <DarkNavyNewsletter compact />
              </div>
            </div>
            <DarkNavyLoadMore
              articles={archive}
              heading="Arsip Berita"
              description="Jelajahi semua liputan kanal ini"
            />
          </>
        )}
      </DarkNavyContainer>
      <DarkNavyJsonLd schemas={seo.jsonLd} />
    </DarkNavyShell>
  );
}
