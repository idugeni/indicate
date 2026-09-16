import { buildSeoDocument } from '@/modules/site/seo';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { CleanBlueShell } from '@/modules/site/components/network/templates/clean-blue/shell';
import { CleanBlueContainer, CleanBlueEmpty } from '@/modules/site/components/network/templates/clean-blue/shared';
import { CleanBlueJsonLd } from '@/modules/site/components/network/templates/clean-blue/json-ld';

export interface CleanBlueContactProps {
  readonly site: NetworkSiteData;
  readonly title: string;
  readonly description?: string | undefined;
  readonly path?: string | undefined;
}

/**
 * Saluran resmi tenant dari `socialLinks` situsnya sendiri; tanpa kanal
 * terdaftar tampil status kosong, bukan kontak marketing pusat.
 */
export function CleanBlueContact({ site, title, description, path = '/' }: CleanBlueContactProps) {
  const seo = buildSeoDocument(site, { path });
  const channels = Object.entries(site.settings.socialLinks);
  return (
    <CleanBlueShell site={site} path={path}>
      <CleanBlueContainer className="space-y-6 py-6 md:py-8">
        <div>
          <h1 className="m-0 flex items-center gap-2.5 font-sans text-2xl font-extrabold tracking-tight text-slate-900">
            <span aria-hidden="true" className="h-1 w-8 rounded-full bg-[#1a5fd0]" />
            {title}
          </h1>
          {description === undefined || description === '' ? null : (
            <p className="m-0 mt-1 max-w-2xl font-sans text-sm leading-relaxed text-slate-600">
              {description}
            </p>
          )}
          <p className="m-0 mt-2 font-mono text-[11px] tabular-nums text-slate-400">
            {channels.length} kanal · {site.context.normalizedHostname}
          </p>
        </div>
        {channels.length === 0 ? (
          <CleanBlueEmpty title={title} />
        ) : (
          <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2">
            {channels.map(([name, href]) => (
              <li key={name} className="m-0 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60">
                <p className="m-0 font-sans text-base font-bold capitalize text-slate-900">{name}</p>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 break-all font-sans text-sm font-semibold text-[#1a5fd0] hover:underline"
                >
                  Buka kanal
                  <span aria-hidden="true">→</span>
                  <span className="sr-only"> (tautan eksternal {name}, membuka di tab baru)</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </CleanBlueContainer>
      <CleanBlueJsonLd schemas={seo.jsonLd} />
    </CleanBlueShell>
  );
}
