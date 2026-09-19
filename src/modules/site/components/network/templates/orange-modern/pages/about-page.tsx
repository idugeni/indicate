import Link from 'next/link';
import { buildSeoDocument } from '@/modules/site/seo';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { OrangeModernShell } from '@/modules/site/components/network/templates/orange-modern/chrome/shell';
import { OrangeModernContainer } from '@/modules/site/components/network/templates/orange-modern/ui/container';
import { OrangeModernJsonLd } from '@/modules/site/components/network/templates/orange-modern/seo/json-ld';

export interface OrangeModernAboutProps {
  readonly site: NetworkSiteData;
  readonly title: string;
  readonly description?: string | undefined;
  readonly path?: string | undefined;
}

/**
 * Profil portal tenant dari data situsnya sendiri: nama, deskripsi,
 * statistik terbitan, dan kanal kategori — tanpa copy marketing pusat.
 */
export function OrangeModernAbout({ site, title, description, path = '/' }: OrangeModernAboutProps) {
  const seo = buildSeoDocument(site, { path });
  const seen = new Map<string, string>();
  for (const article of site.articles) {
    if (article.categorySlug !== null && article.categoryName !== null && !seen.has(article.categorySlug)) {
      seen.set(article.categorySlug, article.categoryName);
    }
  }
  const categories = [...seen.entries()];
  return (
    <OrangeModernShell site={site} path={path}>
      <OrangeModernContainer className="space-y-6 py-6 md:py-8">
        <div>
          <h1 className="m-0 flex items-center gap-2.5 font-sans text-2xl font-extrabold tracking-tight text-slate-900">
            <span aria-hidden="true" className="h-1 w-8 rounded-full bg-[#ea580c]" />
            {title}
          </h1>
          {description === undefined || description === '' ? null : (
            <p className="m-0 mt-1 max-w-2xl font-sans text-sm leading-relaxed text-slate-600">
              {description}
            </p>
          )}
          <p className="m-0 mt-2 font-mono text-[11px] tabular-nums text-slate-400">
            {site.articles.length} artikel · {categories.length} kanal · {site.context.normalizedHostname}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60">
            <p className="m-0 font-mono text-2xl font-bold tabular-nums text-slate-900">{site.articles.length}</p>
            <p className="m-0 mt-1 font-sans text-sm text-slate-600">Artikel terbit di kanal ini</p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60">
            <p className="m-0 font-mono text-2xl font-bold tabular-nums text-slate-900">{categories.length}</p>
            <p className="m-0 mt-1 font-sans text-sm text-slate-600">Kanal liputan aktif</p>
          </div>
        </div>
        {categories.length === 0 ? null : (
          <section aria-label="Kanal liputan">
            <h2 className="m-0 flex items-center gap-2.5 font-sans text-xl font-extrabold tracking-tight text-slate-900">
              <span aria-hidden="true" className="h-1 w-8 rounded-full bg-[#ea580c]" />
              Jelajahi per kanal
            </h2>
            <ul className="m-0 mt-4 flex list-none flex-wrap gap-2 p-0">
              {categories.map(([slug, name]) => (
                <li key={slug} className="m-0">
                  <Link
                    href={`/categories/${slug}`}
                    className="inline-block rounded-full bg-white px-4 py-2 font-sans text-sm font-semibold text-[#ea580c] shadow-sm ring-1 ring-slate-200/60 transition-colors hover:bg-[#ea580c] hover:text-white"
                  >
                    {name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </OrangeModernContainer>
      <OrangeModernJsonLd schemas={seo.jsonLd} />
    </OrangeModernShell>
  );
}
