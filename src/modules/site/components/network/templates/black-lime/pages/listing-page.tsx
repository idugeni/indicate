import { buildSeoDocument } from '@/modules/site/seo';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { BlackLimeShell } from '@/modules/site/components/network/templates/black-lime/chrome/shell';
import { BlackLimeTicker } from '@/modules/site/components/network/templates/black-lime/cards/ticker';
import { BlackLimeHero } from '@/modules/site/components/network/templates/black-lime/cards/hero';
import { BlackLimeMostRead, BlackLimeQuotePanel } from '@/modules/site/components/network/templates/black-lime/cards/most-read';
import { BlackLimePicks } from '@/modules/site/components/network/templates/black-lime/cards/picks';
import { BlackLimeLoadMore } from '@/modules/site/components/network/templates/black-lime/cards/load-more';
import { BlackLimeNewsletter } from '@/modules/site/components/network/templates/black-lime/cards/newsletter';
import { BlackLimeJsonLd } from '@/modules/site/components/network/templates/black-lime/seo/json-ld';
import { BlackLimeContainer } from '@/modules/site/components/network/templates/black-lime/ui/container';
import { BlackLimeEmpty } from '@/modules/site/components/network/templates/black-lime/ui/empty';
import { BlackLimeStatusLine } from '@/modules/site/components/network/templates/black-lime/ui/status-line';

export interface ListingProps {
  readonly site: NetworkSiteData;
  readonly title: string;
  readonly description?: string | undefined;
  readonly path?: string | undefined;
  readonly indexable?: boolean | undefined;
}

/**
 * Black Lime Pulse (dark + lime) — template full mandiri: header, ticker, hero, kartu
 * pilihan, newsletter, dan footer milik template sendiri dengan palet
 * hardcoded. Sengaja TIDAK memakai `NetworkTemplate` bersama maupun
 * `site_settings.colors`, agar tampil persis seperti contoh.
 */
export function BlackLimeListing({ site, title, description, path, indexable }: ListingProps) {
  const seo = buildSeoDocument(site, { path: path ?? '/', indexable: indexable ?? true });
  const [hero, ...rest] = site.articles;
  const picks = rest.slice(0, 4);
  const mostRead = [...rest].sort((a, b) => b.viewCount - a.viewCount).slice(0, 5);
  const archive = rest.slice(4);

  return (
    <BlackLimeShell site={site} path={path ?? '/'}>
      <BlackLimeContainer className="space-y-8 py-6 md:py-8">
        <BlackLimeStatusLine count={site.articles.length} title={title} />
        {site.articles.length > 0 ? <BlackLimeTicker articles={site.articles} /> : null}
        {site.articles.length === 0 ? (
          <BlackLimeEmpty title={title} />
        ) : (
          <>
            {hero ? <BlackLimeHero article={hero} /> : null}
            <BlackLimePicks
              articles={picks}
              heading="Berita Terbaru"
              columns={4}
              linkHref={null}
              description={description ?? 'Kabar terkini untuk Anda'}
            />
            <div className="grid items-start gap-5 lg:grid-cols-2">
              <BlackLimeQuotePanel siteName={site.settings.name} />
              <BlackLimeMostRead articles={mostRead} />
            </div>
            <BlackLimeNewsletter />
            <BlackLimeLoadMore
              articles={archive}
              heading="Arsip Berita"
              description="Jelajahi semua liputan kanal ini"
            />
          </>
        )}
      </BlackLimeContainer>
      <BlackLimeJsonLd schemas={seo.jsonLd} />
    </BlackLimeShell>
  );
}
