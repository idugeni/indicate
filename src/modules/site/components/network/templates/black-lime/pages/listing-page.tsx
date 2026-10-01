import { buildSeoDocument } from '@/modules/site/seo';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { BlackLimeShell } from '@/modules/site/components/network/templates/black-lime/chrome/shell';
import { BlackLimeTicker } from '@/modules/site/components/network/templates/black-lime/cards/ticker';
import { BlackLimeHero } from '@/modules/site/components/network/templates/black-lime/cards/hero';
import { BlackLimeMostRead, BlackLimeQuotePanel } from '@/modules/site/components/network/templates/black-lime/cards/most-read';
import { BlackLimePicks } from '@/modules/site/components/network/templates/black-lime/cards/picks';
import { BlackLimeArchivePager } from '@/modules/site/components/network/templates/black-lime/cards/archive-pager';
import { BlackLimeNewsletter } from '@/modules/site/components/network/templates/black-lime/cards/newsletter';
import { JsonLd } from '@/modules/site/components/network/seo/json-ld';
import { Container } from '@/modules/site/components/network/ui/container';
import { BlackLimeEmpty } from '@/modules/site/components/network/templates/black-lime/ui/empty';
import { StatusLine } from '@/modules/site/components/network/ui/status-line';

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
  // Partition the remaining articles instead of re-slicing the same list. Ranking
  // the whole tail by view count used to hand "Paling Banyak Dibaca" the four
  // articles "Berita Terbaru" already showed, because a young site has near-zero
  // counts everywhere and the sort preserves the incoming order. Each article now
  // appears in exactly one section.
  const ranked = [...rest].sort((a, b) => b.viewCount - a.viewCount);
  const picked = new Set(picks.map((article) => article.id));
  const mostRead = ranked.filter((article) => !picked.has(article.id)).slice(0, 5);
  const shown = new Set([...picks, ...mostRead].map((article) => article.id));
  const archive = rest.filter((article) => !shown.has(article.id));
  const quote = site.settings.tagline ?? site.settings.description;

  return (
    <BlackLimeShell site={site} path={path ?? '/'}>
      <Container className="space-y-10 py-6 md:py-10">
        <StatusLine count={site.articles.length} title={title} />
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
              <BlackLimeQuotePanel siteName={site.settings.name} quote={quote} />
              <BlackLimeMostRead articles={mostRead} />
            </div>
            <BlackLimeNewsletter />
            <BlackLimeArchivePager
              articles={archive}
              heading="Semua Kabar"
              description="Jelajahi semua liputan kanal ini"
            />
          </>
        )}
      </Container>
      <JsonLd schemas={seo.jsonLd} />
    </BlackLimeShell>
  );
}
