import { Container } from '@/modules/site/components/layout/content';
import { BackToTop } from '@/modules/site/components/layout/back-to-top';
import { buildSeoDocument } from '@/modules/site/seo';
import { JsonLd } from '@/modules/site/components/network/json-ld';
import { EmptyListing, StatusLine } from '@/modules/site/components/network/templates/listing-shared';
import type { ListingProps } from '@/modules/site/components/network/templates/listing-shared';
import { CleanBlueHeader } from '@/modules/site/components/network/templates/clean-blue/site-header';
import { CleanBlueTicker } from '@/modules/site/components/network/templates/clean-blue/ticker';
import { CleanBlueHero } from '@/modules/site/components/network/templates/clean-blue/hero';
import { CleanBluePicks } from '@/modules/site/components/network/templates/clean-blue/picks';
import { CleanBlueNewsletter } from '@/modules/site/components/network/templates/clean-blue/newsletter';
import { CleanBlueFooter } from '@/modules/site/components/network/templates/clean-blue/site-footer';

/**
 * Clean Blue Editorial — template full mandiri: header, ticker, hero, kartu
 * pilihan, newsletter, dan footer milik template sendiri dengan palet
 * hardcoded. Sengaja TIDAK memakai `NetworkTemplate` bersama maupun
 * `site_settings.colors`, agar tampil persis seperti contoh.
 */
export function CleanBlueListing({ site, title, description, path, indexable }: ListingProps) {
  const seo = buildSeoDocument(site, { path: path ?? '/', indexable: indexable ?? true });
  const [hero, ...rest] = site.articles;
  const authorName = hero?.authorName ?? hero?.attribution ?? site.settings.name;

  return (
    <div className="min-h-screen bg-[#f5f8fd] font-sans text-slate-900 antialiased" data-template="clean-blue">
      <a
        href="#main-content"
        className="fixed left-4 top-[-5rem] z-50 rounded-lg bg-slate-900 px-4 py-3 font-sans text-sm text-white transition-[top] duration-180 focus:top-4"
      >
        Lewati ke konten
      </a>

      <CleanBlueHeader site={site} path={path ?? '/'} />

      <main id="main-content" tabIndex={-1}>
        <Container className="space-y-8 py-6 md:py-8">
          <StatusLine count={site.articles.length} title={title} />
          {hero ? <CleanBlueTicker article={hero} /> : null}
          {site.articles.length === 0 ? (
            <EmptyListing title={title} />
          ) : (
            <>
              {hero ? <CleanBlueHero article={hero} authorName={authorName} /> : null}
              <CleanBluePicks articles={rest.slice(0, 3)} description={description ?? 'Informasi terkurasi untuk Anda'} />
              <CleanBlueNewsletter />
            </>
          )}
        </Container>
      </main>

      <CleanBlueFooter site={site} />
      <BackToTop />
      <JsonLd schemas={seo.jsonLd} />
    </div>
  );
}
