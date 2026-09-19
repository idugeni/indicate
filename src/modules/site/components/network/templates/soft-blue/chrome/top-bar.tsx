import type { NetworkSiteData } from '@/modules/delivery/models';
import { resolveContactChannels } from '@/modules/site/company-contact';
import { channelIcon } from '@/modules/site/components/network/channel-icons';

/**
 * Bilah atas terang: tanggal hari ini di kiri, tagline + sosmed di kanan.
 *
 * @param site - Data situs tenant untuk tagline dan kanal sosial.
 * @returns Bilah atas server-only di atas header utama.
 */
export function SoftBlueTopBar({ site }: { readonly site: NetworkSiteData }) {
  const today = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(new Date());
  const tagline = site.settings.tagline ?? site.settings.description;
  const socials = resolveContactChannels(site.settings.socialLinks).slice(0, 4);

  return (
    <div className="hidden bg-[#f1f6ff] md:block">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2 sm:px-6">
        <p className="m-0 flex-none font-sans text-xs font-medium capitalize text-slate-600">
          <time dateTime={new Date().toISOString()}>{today}</time>
        </p>
        <div className="flex min-w-0 flex-none items-center gap-4">
          <p className="m-0 hidden truncate font-sans text-xs text-slate-500 lg:block">{tagline}</p>
          {socials.length > 0 ? (
            <p className="m-0 flex items-center gap-1.5">
              {socials.map((channel) => {
                const Icon = channelIcon(channel.key);
                return (
                  <a
                    key={channel.key}
                    href={channel.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${site.settings.name} di ${channel.key}`}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-slate-500 transition-colors hover:text-[#2563eb]"
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                );
              })}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
