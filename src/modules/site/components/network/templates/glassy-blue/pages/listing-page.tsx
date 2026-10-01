import { buildSeoDocument } from '@/modules/site/seo';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { GlassyBlueShell } from '@/modules/site/components/network/templates/glassy-blue/chrome/shell';
import { GlassyBlueTicker } from '@/modules/site/components/network/templates/glassy-blue/cards/ticker';
import { GlassyBlueHero } from '@/modules/site/components/network/templates/glassy-blue/cards/hero';
import { GlassyBlueCategoryPills } from '@/modules/site/components/network/templates/glassy-blue/cards/category-pills';
import { GlassyBlueLatestNews } from '@/modules/site/components/network/templates/glassy-blue/cards/latest-news';
import { GlassyBluePicks } from '@/modules/site/components/network/templates/glassy-blue/cards/picks';
import { GlassyBlueArchivePager } from '@/modules/site/components/network/templates/glassy-blue/cards/archive-pager';
import { GlassyBlueNewsletter } from '@/modules/site/components/network/templates/glassy-blue/cards/newsletter';
import { JsonLd } from '@/modules/site/components/network/seo/json-ld';
import { Container } from '@/modules/site/components/network/ui/container';
import { GlassyBlueEmpty } from '@/modules/site/components/network/templates/glassy-blue/ui/empty';
import { StatusLine } from '@/modules/site/components/network/ui/status-line';
import { getSiteCategoryNav } from '@/modules/site/components/network/server/site-nav';

export interface ListingProps {
  readonly site: NetworkSiteData;
  readonly title: string;
  readonly description?: string | undefined;
  readonly path?: string | undefined;
  readonly indexable?: boolean | undefined;
}

/**
 * Glassy Blue (kaca biru terang) — template full mandiri: header, ticker, hero, kartu
 * pilihan, newsletter, dan footer milik template sendiri dengan palet
 * hardcoded. Sengaja TIDAK memakai `NetworkTemplate` bersama maupun
 * `site_settings.colors`, agar tampil persis seperti contoh.
 */
export async function GlassyBlueListing({ site, title, description, path, indexable }: ListingProps) {
  const seo = buildSeoDocument(site, { path: path ?? '/', indexable: indexable ?? true });
  const nav = await getSiteCategoryNav(site, 7);
  const rest = site.articles.slice(1);
  const picks = rest.slice(0, 3);
  const latest = rest.slice(3, 7);
  const spotlight = rest[7] ?? null;
  const archive = rest.slice(spotlight === null ? 7 : 8);

  return (
    <GlassyBlueShell site={site} path={path ?? '/'}>
      <Container className="space-y-10 py-6 md:py-8">
        <StatusLine count={site.articles.length} title={title} />
        {site.articles.length > 0 ? <GlassyBlueTicker articles={site.articles} /> : null}
        {site.articles.length === 0 ? (
          <GlassyBlueEmpty title={title} />
        ) : (
          <>
            <GlassyBlueHero articles={site.articles.slice(0, 5)} />
            <GlassyBlueCategoryPills items={nav} activePath={path ?? '/'} />
            <GlassyBluePicks
              articles={picks}
              heading="Berita Pilihan"
              description={description ?? 'Informasi terkurasi untuk Anda'}
            />
            <GlassyBlueLatestNews
              articles={latest}
              spotlight={spotlight}
              description="Kabar terkini yang baru diterbitkan"
            />
            <GlassyBlueNewsletter />
            <GlassyBlueArchivePager
              articles={archive}
              heading="Liputan Lengkap"
              description="Jelajahi semua liputan kanal ini"
            />
          </>
        )}
      </Container>
      <JsonLd schemas={seo.jsonLd} />
    </GlassyBlueShell>
  );
}
