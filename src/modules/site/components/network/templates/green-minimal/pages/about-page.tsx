import Link from 'next/link';
import { buildSeoDocument } from '@/modules/site/seo';
import { ABOUT_TRUST_LINKS, deriveAboutCategories } from '@/modules/site/about-profile';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { GreenMinimalShell } from '@/modules/site/components/network/templates/green-minimal/chrome/shell';
import { GreenMinimalContainer } from '@/modules/site/components/network/templates/green-minimal/ui/container';
import { GreenMinimalJsonLd } from '@/modules/site/components/network/templates/green-minimal/seo/json-ld';

export interface GreenMinimalAboutProps {
  readonly site: NetworkSiteData;
  readonly title: string;
  readonly description?: string | undefined;
  readonly path?: string | undefined;
}

/**
 * Profil portal tenant dari data situsnya sendiri: nama, deskripsi,
 * identitas penerbit dominan, statistik terbitan, kanal kategori,
 * dan hub kepercayaan — tanpa copy marketing pusat.
 */
export function GreenMinimalAbout({ site, title, description, path = '/' }: GreenMinimalAboutProps) {
  const seo = buildSeoDocument(site, { path });
  const categories = deriveAboutCategories(site);
  return (
    <GreenMinimalShell site={site} path={path}>
      <GreenMinimalContainer className="space-y-6 py-6 md:py-8">
        <div>
          <h1 className="m-0 flex items-center gap-2.5 font-sans text-2xl font-extrabold tracking-tight text-slate-900">
            <span aria-hidden="true" className="h-1 w-8 rounded-full bg-[#1d7a38]" />
            {title}
          </h1>
          {description === undefined || description === '' ? null : (
            <p className="m-0 mt-1 max-w-2xl font-sans text-sm leading-relaxed text-slate-600">
              {description}
            </p>
          )}
          <p className="m-0 mt-2 font-mono text-[11px] tabular-nums text-slate-400">
            {site.articles.length} artikel · {categories.length} kanal · {site.context.normalizedHostname}
            {site.regionName === null ? null : ` · Cakupan ${site.regionName}`}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
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
              <span aria-hidden="true" className="h-1 w-8 rounded-full bg-[#1d7a38]" />
              Jelajahi per kanal
            </h2>
            <ul className="m-0 mt-4 flex list-none flex-wrap gap-2 p-0">
              {categories.map((category) => (
                <li key={category.slug} className="m-0">
                  <Link
                    href={`/categories/${category.slug}`}
                    className="inline-block rounded-full bg-white px-4 py-2 font-sans text-sm font-semibold text-[#1d7a38] shadow-sm ring-1 ring-slate-200/60 transition-colors hover:bg-[#1d7a38] hover:text-white"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        <section aria-label="Kepercayaan dan kebijakan">
          <h2 className="m-0 flex items-center gap-2.5 font-sans text-xl font-extrabold tracking-tight text-slate-900">
            <span aria-hidden="true" className="h-1 w-8 rounded-full bg-[#1d7a38]" />
            Kepercayaan & kebijakan
          </h2>
          <ul className="m-0 mt-4 flex list-none flex-wrap gap-2 p-0">
            {ABOUT_TRUST_LINKS.map((link) => (
              <li key={link.href} className="m-0">
                <Link
                  href={link.href}
                  className="inline-block rounded-full bg-white px-4 py-2 font-sans text-sm font-semibold text-[#1d7a38] shadow-sm ring-1 ring-slate-200/60 transition-colors hover:bg-[#1d7a38] hover:text-white"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </GreenMinimalContainer>
      <GreenMinimalJsonLd schemas={seo.jsonLd} />
    </GreenMinimalShell>
  );
}
