import { buildSeoDocument } from '@/modules/site/seo';
import {
  CleanBlueContainer,
  CleanBlueEmpty,
  CleanBlueStatusLine,
  type ListingProps,
} from '@/modules/site/components/network/templates/clean-blue/shared';
import { CleanBlueJsonLd } from '@/modules/site/components/network/templates/clean-blue/json-ld';
import { CleanBlueShell } from '@/modules/site/components/network/templates/clean-blue/shell';
import { CleanBlueTicker } from '@/modules/site/components/network/templates/clean-blue/ticker';
import { CleanBlueHero } from '@/modules/site/components/network/templates/clean-blue/hero';
import { CleanBluePicks } from '@/modules/site/components/network/templates/clean-blue/picks';
import { CleanBlueNewsletter } from '@/modules/site/components/network/templates/clean-blue/newsletter';
import { CleanBluePagination } from '@/modules/site/components/network/templates/clean-blue/pagination';

/**
 * Clean Blue Editorial — template full mandiri: header, ticker, hero, kartu
 * pilihan, newsletter, dan footer milik template sendiri dengan palet
 * hardcoded. Sengaja TIDAK memakai `NetworkTemplate` bersama maupun
 * `site_settings.colors`, agar tampil persis seperti contoh.
 */
export function CleanBlueListing({ site, title, description, path, indexable, page = 1, basePath }: ListingProps) {
  const seo = buildSeoDocument(site, { path: path ?? '/', indexable: indexable ?? true });
  const [hero, ...rest] = site.articles;
  // Arsip: halaman 1 menampung 9 kartu setelah picks, halaman berikut 9 per halaman.
  const totalPages = rest.length <= 12 ? 1 : 1 + Math.ceil((rest.length - 12) / 9);
  const safePage = Math.max(1, Math.min(page, totalPages));
  const archive = safePage === 1 ? rest.slice(3, 12) : rest.slice(3 + (safePage - 1) * 9, 3 + safePage * 9);
  const base = basePath ?? path ?? '/';

  return (
    <CleanBlueShell site={site} path={path ?? '/'}>
      <CleanBlueContainer className="space-y-8 py-6 md:py-8">
        <CleanBlueStatusLine count={site.articles.length} title={title} />
        {site.articles.length > 0 ? <CleanBlueTicker articles={site.articles} /> : null}
        {site.articles.length === 0 ? (
          <CleanBlueEmpty title={title} />
        ) : (
          <>
            {safePage === 1 ? (
              <>
                {hero ? <CleanBlueHero article={hero} /> : null}
                <CleanBluePicks articles={rest.slice(0, 3)} description={description ?? 'Informasi terkurasi untuk Anda'} />
                <CleanBlueNewsletter />
              </>
            ) : null}
            <CleanBluePicks
              articles={archive}
              heading={safePage === 1 ? 'Arsip Berita' : `Arsip Berita — Halaman ${safePage}`}
              description={safePage === 1 ? 'Jelajahi semua liputan kanal ini' : `Menampilkan halaman ${safePage} dari ${totalPages}`}
              linkHref={null}
            />
            <CleanBluePagination page={safePage} totalPages={totalPages} basePath={base} />
          </>
        )}
      </CleanBlueContainer>
      <CleanBlueJsonLd schemas={seo.jsonLd} />
    </CleanBlueShell>
  );
}
