import Image from 'next/image';
import Link from 'next/link';
import { Rss } from 'lucide-react';

import type { NetworkSiteData } from '@/modules/delivery/models';
import { COMPANY_NAME, SOCIAL_ORDER } from '@/modules/site/company-contact';
import { channelIcon } from '@/modules/site/components/network/channel-icons';
import { getSiteCategoryNav } from '@/modules/site/components/network/templates/dark-navy/server/site-nav';
import { DarkNavyStoreBadges } from '@/modules/site/components/network/templates/dark-navy/chrome/store-badges';

const ABOUT_LINKS = [
  { label: 'Profil', href: '/tentang' },
  { label: 'Kontak', href: '/kontak' },
  { label: 'Kebijakan Privasi', href: '/kebijakan-privasi' },
  { label: 'Syarat & Ketentuan', href: '/syarat-ketentuan' },
] as const;

export async function DarkNavyFooter({ site }: { readonly site: NetworkSiteData }) {
  const categories = await getSiteCategoryNav(site, 6);
  const tagline = site.settings.tagline ?? site.settings.description;
  const year = new Date().getFullYear();
  const configuredSocials = SOCIAL_ORDER
    .map((name) => ({ name, href: (site.settings.socialLinks[name] ?? '').trim() }))
    .filter((social) => social.href !== '');

  return (
    <footer className="border-t border-[#1b2c4f] bg-[#070f22]">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-10 px-4 py-12 sm:grid-cols-2 sm:gap-10 sm:px-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="col-span-2 sm:col-span-1">
          <Link href="/" className="flex min-w-0 items-center gap-2.5 leading-none no-underline">
            <Image
              unoptimized
              src={site.settings.logoUrl}
              alt={site.settings.name}
              width={72}
              height={72}
              className="h-9 w-9 flex-none rounded-xl object-cover ring-1 ring-[#1b2c4f]"
            />
            <span className="grid min-w-0 leading-none">
              <strong className="truncate font-sans text-lg font-extrabold tracking-tight text-[#eaf0fb]">
                {site.settings.name}
              </strong>
              <small className="mt-0.5 font-sans text-[11px] text-[#9aa9c4]">
                {tagline}
              </small>
            </span>
          </Link>
          <p className="m-0 mt-4 max-w-xs font-sans text-sm leading-relaxed text-[#9aa9c4]">
            {site.settings.description}
          </p>
          {configuredSocials.length > 0 ? (
            <p className="m-0 mt-4 flex flex-wrap items-center gap-2">
              {configuredSocials.map(({ name, href }) => {
                const Icon = channelIcon(name);
                return (
                  <a
                    key={name}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${site.settings.name} di ${name}`}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-[#9aa9c4] ring-1 ring-[#1b2c4f] transition-colors hover:text-[#2f7bff]"
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </a>
                );
              })}
              <Link
                href="/rss.xml"
                aria-label="Umpan RSS"
                className="flex h-9 w-9 items-center justify-center rounded-full text-[#9aa9c4] ring-1 ring-[#1b2c4f] transition-colors hover:text-[#2f7bff]"
              >
                <Rss className="h-4 w-4" aria-hidden="true" />
              </Link>
            </p>
          ) : null}
        </div>

        <nav aria-label="Kategori">
          <h2 className="m-0 font-sans text-sm font-bold text-[#eaf0fb]">Kategori</h2>
          <ul className="m-0 mt-4 list-none space-y-2.5 p-0">
            {categories.map((item) => (
              <li key={`${item.href}:${item.label}`} className="m-0 p-0">
                <Link href={item.href} className="font-sans text-sm text-[#9aa9c4] transition-colors hover:text-[#2f7bff]">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Tentang kami">
          <h2 className="m-0 font-sans text-sm font-bold text-[#eaf0fb]">Tentang Kami</h2>
          <ul className="m-0 mt-4 list-none space-y-2.5 p-0">
            {ABOUT_LINKS.map((item) => (
              <li key={item.label} className="m-0 p-0">
                <Link href={item.href} className="font-sans text-sm text-[#9aa9c4] transition-colors hover:text-[#2f7bff]">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="col-span-2 sm:col-span-1">
          <h2 className="m-0 font-sans text-sm font-bold text-[#eaf0fb]">Aplikasi Mobile</h2>
          <p className="m-0 mt-4 font-sans text-sm leading-relaxed text-[#9aa9c4]">
            Dapatkan pengalaman membaca berita yang lebih baik di perangkat mobile Anda.
          </p>
          <DarkNavyStoreBadges />
        </div>
      </div>

      <div className="border-t border-[#1b2c4f]">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 py-4 text-center font-sans text-xs text-[#9aa9c4] sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:text-left">
          <p className="m-0">© {year} {site.settings.name}. Semua hak dilindungi undang-undang.</p>
          <p className="m-0 font-semibold tracking-wide text-[#5f6f8c]">{COMPANY_NAME}</p>
        </div>
      </div>
    </footer>
  );
}
