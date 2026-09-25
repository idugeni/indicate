import { buildSeoDocument } from '@/modules/site/seo';
import { COMPANY_NAME, channelAction, channelHandle, isPrimaryContact, resolveContactChannels } from '@/modules/site/company-contact';
import { channelIcon } from '@/modules/site/components/network/channel-icons';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { BlackLimeShell } from '@/modules/site/components/network/templates/black-lime/chrome/shell';
import { BlackLimeContainer } from '@/modules/site/components/network/templates/black-lime/ui/container';
import { BlackLimeEmpty } from '@/modules/site/components/network/templates/black-lime/ui/empty';
import { BlackLimeJsonLd } from '@/modules/site/components/network/templates/black-lime/seo/json-ld';

export interface BlackLimeContactProps {
  readonly site: NetworkSiteData;
  readonly title: string;
  readonly description?: string | undefined;
  readonly path?: string | undefined;
}

/**
 * Saluran resmi tenant: default perusahaan bersama + override per situs;
 * tanpa kanal terdaftar tampil status kosong.
 */
export function BlackLimeContact({ site, title, description, path = '/' }: BlackLimeContactProps) {
  const seo = buildSeoDocument(site, { path });
  const channels = resolveContactChannels(site.settings.socialLinks);
  const primary = channels.filter((channel) => isPrimaryContact(channel.key));
  const socials = channels.filter((channel) => !isPrimaryContact(channel.key));
  return (
    <BlackLimeShell site={site} path={path}>
      <BlackLimeContainer className="space-y-6 py-6 md:py-8">
        <div>
          <h1 className="m-0 flex items-center gap-2.5 font-sans text-2xl font-extrabold tracking-tight text-[#f2f5e9]">
            <span aria-hidden="true" className="h-1 w-8 rounded-full bg-[#c5f82a]" />
            {title}
          </h1>
          {description === undefined || description === '' ? null : (
            <p className="m-0 mt-1 max-w-2xl font-sans text-sm leading-relaxed text-[#a3ad9a]">
              {description}
            </p>
          )}
          <p className="m-0 mt-2 font-mono text-[11px] tabular-nums text-[#646b5e]">
            {channels.length} kanal · {COMPANY_NAME} · {site.context.normalizedHostname}
          </p>
        </div>
        {channels.length === 0 ? (
          <BlackLimeEmpty title={title} />
        ) : (
          <div className="space-y-3">
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
                      className="flex h-full items-center gap-2.5 rounded-2xl bg-[#131711] p-3.5 shadow-sm ring-1 ring-[#242b1f]/60 transition-colors hover:ring-[#c5f82a]/50"
                    >
                      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[#c5f82a]/10 text-[#c5f82a]">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-sans text-sm font-bold text-[#f2f5e9]">{channel.label}</span>
                        <span className="block truncate font-sans text-xs text-[#a3ad9a]">{channelHandle(channel)}</span>
                      </span>
                      <span className="flex-none rounded-full bg-[#c5f82a]/10 px-3 py-1.5 font-sans text-xs font-bold text-[#c5f82a]">
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
                        className="flex h-full items-center gap-2.5 rounded-2xl bg-[#131711] p-3 shadow-sm ring-1 ring-[#242b1f]/60 transition-colors hover:ring-[#c5f82a]/50"
                      >
                        <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[#c5f82a]/10 text-[#c5f82a]">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-sans text-sm font-bold text-[#f2f5e9]">{channel.label}</span>
                          <span className="block truncate font-sans text-[11px] text-[#a3ad9a]">{channelHandle(channel)}</span>
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </BlackLimeContainer>
      <BlackLimeJsonLd schemas={seo.jsonLd} />
    </BlackLimeShell>
  );
}
