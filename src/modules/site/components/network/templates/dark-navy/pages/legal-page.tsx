import Link from 'next/link';

import { buildSeoDocument } from '@/modules/site/seo';
import { slugify, type DocSectionItem } from '@/modules/site/components/layout/content';
import { TENANT_RELATED_DOCS } from '@/modules/site/legal-documents';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { DarkNavyShell } from '@/modules/site/components/network/templates/dark-navy/chrome/shell';
import { DarkNavyContainer } from '@/modules/site/components/network/templates/dark-navy/ui/container';
import { DarkNavyJsonLd } from '@/modules/site/components/network/templates/dark-navy/seo/json-ld';

export interface DarkNavyLegalProps {
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
export function DarkNavyLegal({ site, title, description, path = '/', sections, effectiveDate }: DarkNavyLegalProps) {
  const seo = buildSeoDocument(site, { path });
  return (
    <DarkNavyShell site={site} path={path}>
      <DarkNavyContainer className="space-y-6 py-6 md:py-8">
        <div>
          <h1 className="m-0 flex items-center gap-2.5 font-sans text-2xl font-extrabold tracking-tight text-[#eaf0fb]">
            <span aria-hidden="true" className="h-1 w-8 rounded-full bg-[#2f7bff]" />
            {title}
          </h1>
          {description === undefined || description === '' ? null : (
            <p className="m-0 mt-1 max-w-2xl font-sans text-sm leading-relaxed text-[#9aa9c4]">
              {description}
            </p>
          )}
          <p className="m-0 mt-2 font-mono text-[11px] tabular-nums text-[#5f6f8c]">
            {sections.length} bagian · Berlaku untuk {site.context.normalizedHostname} · Berlaku sejak {effectiveDate}
          </p>
        </div>
        <nav aria-label="Daftar isi" className="rounded-2xl bg-[#0e1a33] p-4 shadow-sm ring-1 ring-[#1b2c4f]/60 sm:p-5">
          <ol className="m-0 grid list-none gap-x-8 p-0 sm:grid-cols-2">
            {sections.map((section, index) => (
              <li key={`${index}:${section.heading}`} className="border-b border-[#1b2c4f] last:border-b-0">
                <a
                  href={`#${slugify(section.heading)}`}
                  className="group flex items-baseline gap-3 py-2 font-sans text-sm text-[#9aa9c4] transition-colors hover:text-[#2f7bff]"
                >
                  <span className="flex-none font-mono text-[11px] tabular-nums text-[#2f7bff]">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="group-hover:underline">{section.heading}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <div className="rounded-2xl bg-[#0e1a33] p-4 shadow-sm ring-1 ring-[#1b2c4f]/60 sm:p-5">
          <p className="m-0 font-sans text-sm font-bold text-[#eaf0fb]">Dokumen terkait</p>
          <ul className="m-0 mt-3 flex list-none flex-wrap gap-2 p-0">
            {TENANT_RELATED_DOCS.filter((doc) => doc.href !== path).map((doc) => (
              <li key={doc.href} className="m-0">
                <Link
                  href={doc.href}
                  className="inline-block rounded-full bg-[#0e1a33] px-4 py-2 font-sans text-sm font-semibold text-[#2f7bff] shadow-sm ring-1 ring-[#1b2c4f]/60 transition-colors hover:bg-[#2f7bff] hover:text-white"
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
              className="scroll-mt-24 rounded-2xl bg-[#0e1a33] p-5 shadow-sm ring-1 ring-[#1b2c4f]/60 sm:p-6"
            >
              <div className="flex items-baseline gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-6 w-6 flex-none items-center justify-center rounded-lg bg-[#14294f] font-mono text-[11px] font-bold tabular-nums text-[#2f7bff]"
                >
                  {index + 1}
                </span>
                <h2 className="m-0 font-sans text-base font-bold tracking-tight text-[#eaf0fb]">
                  {section.heading}
                </h2>
              </div>
              <p className="m-0 mt-3 text-justify font-sans text-sm leading-relaxed text-[#9aa9c4]">{section.body}</p>
            </article>
          ))}
        </div>
      </DarkNavyContainer>
      <DarkNavyJsonLd schemas={seo.jsonLd} />
    </DarkNavyShell>
  );
}
