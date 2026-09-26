import { buildSeoDocument } from '@/modules/site/seo';
import { COMPANY_NAME, channelAction, channelHandle, isPrimaryContact, resolveContactChannels } from '@/modules/site/company-contact';
import { channelIcon } from '@/modules/site/components/network/channel-icons';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { CleanBlueShell } from '@/modules/site/components/network/templates/clean-blue/chrome/shell';
import { CleanBlueContainer } from '@/modules/site/components/network/templates/clean-blue/ui/container';
import { CleanBlueEmpty } from '@/modules/site/components/network/templates/clean-blue/ui/empty';
import { CleanBlueJsonLd } from '@/modules/site/components/network/templates/clean-blue/seo/json-ld';

export interface CleanBlueContactProps {
  readonly site: NetworkSiteData;
  readonly title: string;
  readonly description?: string | undefined;
  readonly path?: string | undefined;
}

/**
 * Saluran resmi tenant: default perusahaan bersama + override per situs;
 * tanpa kanal terdaftar tampil status kosong.
 */
export function CleanBlueContact({ site, title, description, path = '/' }: CleanBlueContactProps) {
  const seo = buildSeoDocument(site, { path });
  const channels = resolveContactChannels(site.settings.socialLinks);
  const primary = channels.filter((channel) => isPrimaryContact(channel.key));
  const socials = channels.filter((channel) => !isPrimaryContact(channel.key));
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
            {channels.length} kanal · {COMPANY_NAME} · {site.context.normalizedHostname}
          </p>
        </div>
        {channels.length === 0 ? (
          <CleanBlueEmpty title={title} />
        ) : (
          <div className="grid gap-4">
            <ul className="m-0 grid list-none gap-2.5 p-0 sm:grid-cols-2 lg:grid-cols-3">
              {primary.map((channel) => {
                const Icon = channelIcon(channel.key);
                const external = channel.href.startsWith('http');
                return (
                  <li key={channel.key} className="m-0">
                    <a
                      href={channel.href}
                      target={external ? '_blank' : undefined}
                      rel={external ? 'noopener noreferrer' : undefined}
                      className="flex h-full items-center gap-2.5 rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-slate-200/60 transition-colors hover:ring-[#1a5fd0]/50"
                    >
                      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[#1a5fd0]/10 text-[#1a5fd0]">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-sans text-sm font-bold text-slate-900">{channel.label}</span>
                        <span className="block truncate font-sans text-xs text-slate-500">{channelHandle(channel)}</span>
                      </span>
                      <span className="flex-none rounded-full bg-[#1a5fd0]/10 px-3 py-1.5 font-sans text-xs font-bold text-[#1a5fd0]">
                        {channelAction(channel.key)}
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
            {socials.length === 0 ? null : (
              <ul className="m-0 grid list-none grid-cols-2 gap-2.5 p-0 lg:grid-cols-4">
                {socials.map((channel) => {
                  const Icon = channelIcon(channel.key);
                  const external = channel.href.startsWith('http');
                  return (
                    <li key={channel.key} className="m-0">
                      <a
                        href={channel.href}
                        target={external ? '_blank' : undefined}
                        rel={external ? 'noopener noreferrer' : undefined}
                        className="flex h-full items-center gap-2.5 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200/60 transition-colors hover:ring-[#1a5fd0]/50"
                      >
                        <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[#1a5fd0]/10 text-[#1a5fd0]">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-sans text-sm font-bold text-slate-900">{channel.label}</span>
                          <span className="block truncate font-sans text-[11px] text-slate-500">{channelHandle(channel)}</span>
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </CleanBlueContainer>
      <CleanBlueJsonLd schemas={seo.jsonLd} />
    </CleanBlueShell>
  );
}
