import Link from 'next/link';

import type { NetworkSiteData } from '@/modules/delivery/models';
import { resolveContactChannels } from '@/modules/site/company-contact';
import { channelIcon } from '@/modules/site/components/network/channel-icons';

/**
 * Bilah atas terang: tanggal hari ini + tagline di kiri, tautan info + sosmed di kanan.
 *
 * @param site - Data situs tenant untuk tagline dan kanal sosial.
 * @returns Bilah atas server-only di atas header utama.
 */
export function GreenMinimalTopBar({ site }: { readonly site: NetworkSiteData }) {
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
    <div className="hidden border-b border-slate-100 bg-[#f7faf7] md:block">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2 sm:px-6">
        <p className="m-0 flex min-w-0 items-center gap-2 font-sans text-xs text-slate-600">
          <time dateTime={new Date().toISOString()} className="flex-none font-medium capitalize text-slate-700">
            {today}
          </time>
          <span aria-hidden="true" className="h-0.5 w-6 flex-none rounded-full bg-[#1d7a38]/40" />
          <span className="truncate">{tagline}</span>
        </p>
        <div className="flex flex-none items-center gap-4">
          <nav aria-label="Tautan informasi" className="flex items-center gap-3 font-sans text-xs text-slate-600">
            <Link href="/tentang" className="transition-colors hover:text-[#1d7a38]">
              Tentang Kami
            </Link>
            <Link href="/tentang" className="transition-colors hover:text-[#1d7a38]">
              Redaksi
            </Link>
            <Link href="/kontak" className="transition-colors hover:text-[#1d7a38]">
              Kontak
            </Link>
          </nav>
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
                    className="flex h-6 w-6 items-center justify-center rounded-full text-slate-500 transition-colors hover:text-[#1d7a38]"
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
