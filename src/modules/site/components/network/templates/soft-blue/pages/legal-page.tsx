import Link from 'next/link';

import { buildSeoDocument } from '@/modules/site/seo';
import { slugify, type DocSectionItem } from '@/modules/site/components/layout/content';
import { TENANT_RELATED_DOCS } from '@/modules/site/legal-documents';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { SoftBlueShell } from '@/modules/site/components/network/templates/soft-blue/chrome/shell';
import { SoftBlueContainer } from '@/modules/site/components/network/templates/soft-blue/ui/container';
import { SoftBlueJsonLd } from '@/modules/site/components/network/templates/soft-blue/seo/json-ld';

export interface SoftBlueLegalProps {
  readonly site: NetworkSiteData;
  readonly title: string;
  readonly description?: string | undefined;
  readonly path?: string | undefined;
  readonly sections: readonly DocSectionItem[];
  readonly effectiveDate: string;
}

/**
 * Render dokumen legal dalam chrome Clean Blue: judul, daftar isi jangkar,
 * lalu pasal mengalir bernomor — copy master sama untuk semua tenant.
 */
export function SoftBlueLegal({ site, title, description, path = '/', sections, effectiveDate }: SoftBlueLegalProps) {
  const seo = buildSeoDocument(site, { path });
  return (
    <SoftBlueShell site={site} path={path}>
      <SoftBlueContainer className="space-y-6 py-6 md:py-8">
        <div>
          <h1 className="m-0 flex items-center gap-2.5 font-sans text-2xl font-extrabold tracking-tight text-slate-900">
            <span aria-hidden="true" className="h-1 w-8 rounded-full bg-[#2563eb]" />
            {title}
          </h1>
          {description === undefined || description === '' ? null : (
            <p className="m-0 mt-1 max-w-2xl font-sans text-sm leading-relaxed text-slate-600">
              {description}
            </p>
          )}
          <p className="m-0 mt-2 font-mono text-[11px] tabular-nums text-slate-400">
            {sections.length} bagian · Berlaku untuk {site.context.normalizedHostname} · Berlaku sejak {effectiveDate}
          </p>
        </div>
        <nav aria-label="Daftar isi" className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/60 sm:p-5">
          <ol className="m-0 grid list-none gap-x-8 p-0 sm:grid-cols-2">
            {sections.map((section, index) => (
              <li key={`${index}:${section.heading}`} className="border-b border-slate-100 last:border-b-0">
                <a
                  href={`#${slugify(section.heading)}`}
                  className="group flex items-baseline gap-3 py-2 font-sans text-sm text-slate-600 transition-colors hover:text-[#2563eb]"
                >
                  <span className="flex-none font-mono text-[11px] tabular-nums text-[#2563eb]">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="group-hover:underline">{section.heading}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/60 sm:p-5">
          <p className="m-0 font-sans text-sm font-bold text-slate-900">Dokumen terkait</p>
          <ul className="m-0 mt-3 flex list-none flex-wrap gap-2 p-0">
            {TENANT_RELATED_DOCS.filter((doc) => doc.href !== path).map((doc) => (
              <li key={doc.href} className="m-0">
                <Link
                  href={doc.href}
                  className="inline-block rounded-full bg-white px-4 py-2 font-sans text-sm font-semibold text-[#2563eb] shadow-sm ring-1 ring-slate-200/60 transition-colors hover:bg-[#2563eb] hover:text-white"
                >
                  {doc.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-4">
          {sections.map((section, index) => (
            <article
              key={`${index}:${section.heading}`}
              id={slugify(section.heading)}
              className="scroll-mt-24 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60 sm:p-6"
            >
              <div className="flex items-baseline gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-6 w-6 flex-none items-center justify-center rounded-lg bg-[#dbeafe] font-mono text-[11px] font-bold tabular-nums text-[#2563eb]"
                >
                  {index + 1}
                </span>
                <h2 className="m-0 font-sans text-base font-bold tracking-tight text-slate-900">
                  {section.heading}
                </h2>
              </div>
              <p className="m-0 mt-3 text-justify font-sans text-sm leading-relaxed text-slate-600">{section.body}</p>
            </article>
          ))}
        </div>
      </SoftBlueContainer>
      <SoftBlueJsonLd schemas={seo.jsonLd} />
    </SoftBlueShell>
  );
}
