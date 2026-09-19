import { buildSeoDocument } from '@/modules/site/seo';
import { COMPANY_NAME, resolveContactChannels } from '@/modules/site/company-contact';
import { channelIcon } from '@/modules/site/components/network/channel-icons';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { RedEditorialShell } from '@/modules/site/components/network/templates/red-editorial/chrome/shell';
import { RedEditorialContainer } from '@/modules/site/components/network/templates/red-editorial/ui/container';
import { RedEditorialEmpty } from '@/modules/site/components/network/templates/red-editorial/ui/empty';
import { RedEditorialJsonLd } from '@/modules/site/components/network/templates/red-editorial/seo/json-ld';

export interface RedEditorialContactProps {
  readonly site: NetworkSiteData;
  readonly title: string;
  readonly description?: string | undefined;
  readonly path?: string | undefined;
}

/**
 * Saluran resmi tenant: default perusahaan bersama + override per situs;
 * tanpa kanal terdaftar tampil status kosong.
 */
export function RedEditorialContact({ site, title, description, path = '/' }: RedEditorialContactProps) {
  const seo = buildSeoDocument(site, { path });
  const channels = resolveContactChannels(site.settings.socialLinks);
  return (
    <RedEditorialShell site={site} path={path}>
      <RedEditorialContainer className="space-y-6 py-6 md:py-8">
        <div>
          <h1 className="m-0 flex items-center gap-2.5 font-sans text-2xl font-extrabold tracking-tight text-slate-900">
            <span aria-hidden="true" className="h-1 w-8 rounded-full bg-[#b91c1c]" />
            {title}
          </h1>
          {description === undefined || description === '' ? null : (
            <p className="m-0 mt-1 max-w-2xl font-sans text-sm leading-relaxed text-slate-600">
              {description}
            </p>
          )}
          <p className="m-0 mt-2 font-mono text-[11px] tabular-nums text-slate-400">
            {channels.length} kanal · {COMPANY_NAME} · {site.context.normalizedHostname}
          </p>
        </div>
        {channels.length === 0 ? (
          <RedEditorialEmpty title={title} />
        ) : (
          <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2">
            {channels.map((channel) => {
              const Icon = channelIcon(channel.key);
              const external = channel.href.startsWith('http');
              return (
                <li key={channel.key} className="m-0 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60">
                  <p className="m-0 flex items-center gap-2.5 font-sans text-base font-bold text-slate-900">
                    <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[#b91c1c]/10 text-[#b91c1c]">
                      <Icon className="h-4 w-4" />
                    </span>
                    {channel.label}
                  </p>
                  <a
                    href={channel.href}
                    target={external ? '_blank' : undefined}
                    rel={external ? 'noopener noreferrer' : undefined}
                    className="mt-2 inline-flex items-center gap-1 break-all font-sans text-sm font-semibold text-[#b91c1c] hover:underline"
                  >
                    {external ? 'Buka kanal' : channel.href}
                    {external ? <span aria-hidden="true">→</span> : null}
                    {external ? (
                      <span className="sr-only"> (tautan eksternal {channel.label}, membuka di tab baru)</span>
                    ) : null}
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </RedEditorialContainer>
      <RedEditorialJsonLd schemas={seo.jsonLd} />
    </RedEditorialShell>
  );
}
