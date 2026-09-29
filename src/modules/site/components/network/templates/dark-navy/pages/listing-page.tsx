import { buildSeoDocument } from '@/modules/site/seo';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { DarkNavyShell } from '@/modules/site/components/network/templates/dark-navy/chrome/shell';
import { DarkNavyTicker } from '@/modules/site/components/network/templates/dark-navy/cards/ticker';
import { DarkNavyHero } from '@/modules/site/components/network/templates/dark-navy/cards/hero';
import { DarkNavyLatest } from '@/modules/site/components/network/templates/dark-navy/cards/latest';
import { DarkNavyMostRead } from '@/modules/site/components/network/templates/dark-navy/cards/most-read';
import { DarkNavyArchivePager } from '@/modules/site/components/network/templates/dark-navy/cards/archive-pager';
import { DarkNavyNewsletter } from '@/modules/site/components/network/templates/dark-navy/cards/newsletter';
import { JsonLd } from '@/modules/site/components/network/seo/json-ld';
import { Container } from '@/modules/site/components/network/ui/container';
import { DarkNavyEmpty } from '@/modules/site/components/network/templates/dark-navy/ui/empty';
import { StatusLine } from '@/modules/site/components/network/ui/status-line';

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
  // Partition rather than re-slice. Ranking the whole tail by view count made
  // "Paling Banyak Dibaca" repeat whatever "Terbaru" already showed, and once
  // view counts diverge it also pulled articles out of the archive while hiding
  // low-traffic ones from the page entirely. Each article now lands in exactly
  // one section.
  const ranked = [...rest].sort((a, b) => b.viewCount - a.viewCount);
  const latestIds = new Set(latest.map((article) => article.id));
  const mostRead = ranked.filter((article) => !latestIds.has(article.id)).slice(0, 5);
  const placed = new Set([...latest, ...mostRead].map((article) => article.id));
  const archive = rest.filter((article) => !placed.has(article.id));

  return (
    <DarkNavyShell site={site} path={path ?? '/'}>
      <Container className="space-y-8 py-6 md:py-8">
        <StatusLine count={site.articles.length} title={title} />
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
              <div className="grid min-w-0 gap-6 lg:sticky lg:top-20">
                <DarkNavyMostRead articles={mostRead} />
                <DarkNavyNewsletter compact />
              </div>
            </div>
            <DarkNavyArchivePager
              articles={archive}
              heading="Arsip Berita"
              description="Jelajahi semua liputan kanal ini"
            />
          </>
        )}
      </Container>
      <JsonLd schemas={seo.jsonLd} />
    </DarkNavyShell>
  );
}
