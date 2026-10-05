import type { NetworkSiteData } from '@/modules/delivery/models';
import { resolveContactChannels } from '@/modules/site/company-contact';
import { channelIcon } from '@/modules/site/components/network/channel-icons';

/**
 * Strip utilitas di atas navbar: tanggal hari ini, tagline, dan kanal sosial.
 *
 * @param site - Data situs tenant aktif.
 * @param surface - Warna latar strip dari tema template.
 * @param ring - Warna garis bawah dari tema template.
 * @param ink - Warna teks tanggal dari tema template.
 * @param muted - Warna teks tagline dan ikon dari tema template.
 * @param accent - Warna aksen hover dari tema template.
 * @returns Strip server-only, tersembunyi di bawah `md`.
 */
export function SiteTopBar({
  site,
  surface,
  ring,
  ink,
  muted,
}: {
  readonly site: NetworkSiteData;
  readonly surface: string;
  readonly ring: string;
  readonly ink: string;
  readonly muted: string;
}) {
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
    <div className="hidden md:block" style={{ backgroundColor: surface, borderBottom: `1px solid ${ring}` }}>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2 sm:px-6">
        <p className="m-0 flex-none font-sans text-xs font-medium capitalize" style={{ color: ink }}>
          <time dateTime={new Date().toISOString()}>{today}</time>
        </p>
        <div className="flex min-w-0 flex-none items-center gap-4">
          <p className="m-0 hidden truncate font-sans text-xs lg:block" style={{ color: muted }}>
            {tagline}
          </p>
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
                    className="flex h-6 w-6 items-center justify-center rounded-full transition-opacity hover:opacity-70"
                    style={{ color: muted }}
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
