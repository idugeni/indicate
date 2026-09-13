import Image from 'next/image';
import Link from 'next/link';
import { Apple, Play, Rss } from 'lucide-react';

import type { NetworkSiteData } from '@/modules/delivery/models';
import { categoryNav } from '@/modules/site/components/network/templates/clean-blue/shared';

const ABOUT_LINKS = [
  { label: 'Profil', href: '/about' },
  { label: 'Redaksi', href: '/about' },
  { label: 'Karier', href: '/contact' },
  { label: 'Kontak', href: '/contact' },
  { label: 'Kebijakan Privasi', href: '/privacy' },
  { label: 'Syarat & Ketentuan', href: '/terms' },
] as const;

export function CleanBlueFooter({ site }: { readonly site: NetworkSiteData }) {
  const categories = categoryNav(site, 6);
  const tagline = site.settings.description.length > 64
    ? `${site.settings.description.slice(0, 64).trimEnd()}…`
    : site.settings.description;
  const initial = (site.settings.name || 'N').trim().slice(0, 1).toUpperCase();
  const year = new Date().getFullYear();
  const socialEntries = Object.entries(site.settings.socialLinks).slice(0, 5);

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)]">
        <div>
          <Link href="/" aria-label={`${site.settings.name} beranda`} className="inline-flex items-center gap-2.5 no-underline">
            {site.settings.logoUrl ? (
              <Image
                unoptimized
                src={site.settings.logoUrl}
                alt=""
                aria-hidden="true"
                width={36}
                height={36}
                className="h-9 w-9 flex-none rounded-xl object-contain"
              />
            ) : (
              <span
                aria-hidden="true"
                className="flex h-9 w-9 flex-none items-center justify-center rounded-xl font-sans text-lg font-extrabold text-white"
                style={{ backgroundColor: '#1f6feb' }}
              >
                {initial}
              </span>
            )}
            <span className="grid leading-none">
              <strong className="font-sans text-lg font-extrabold tracking-tight text-slate-900">
                {site.settings.name}
              </strong>
              <small className="mt-0.5 font-sans text-[11px] text-slate-500">
                {tagline}
              </small>
            </span>
          </Link>
          <p className="m-0 mt-4 max-w-xs font-sans text-sm leading-relaxed text-slate-600">
            {site.settings.description}
          </p>
          <p className="m-0 mt-5 flex flex-wrap items-center gap-2">
            {socialEntries.map(([name, href]) => (
              <a
                key={name}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center rounded-full px-3.5 font-sans text-xs font-semibold capitalize text-slate-600 ring-1 ring-slate-200 transition-colors hover:text-[#1f6feb]"
              >
                {name}
              </a>
            ))}
            <Link
              href="/rss.xml"
              aria-label="Umpan RSS"
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 ring-1 ring-slate-200 transition-colors hover:text-[#1f6feb]"
            >
              <Rss className="h-4 w-4" aria-hidden="true" />
            </Link>
          </p>
        </div>

        <nav aria-label="Kategori">
          <h2 className="m-0 font-sans text-sm font-bold text-slate-900">Kategori</h2>
          <ul className="m-0 mt-4 list-none space-y-2.5 p-0">
            {categories.map((item) => (
              <li key={`${item.href}:${item.label}`} className="m-0 p-0">
                <Link href={item.href} className="font-sans text-sm text-slate-600 transition-colors hover:text-[#1f6feb]">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Tentang kami">
          <h2 className="m-0 font-sans text-sm font-bold text-slate-900">Tentang Kami</h2>
          <ul className="m-0 mt-4 list-none space-y-2.5 p-0">
            {ABOUT_LINKS.map((item) => (
              <li key={item.label} className="m-0 p-0">
                <Link href={item.href} className="font-sans text-sm text-slate-600 transition-colors hover:text-[#1f6feb]">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="m-0 font-sans text-sm font-bold text-slate-900">Aplikasi Mobile</h2>
          <p className="m-0 mt-4 font-sans text-sm leading-relaxed text-slate-600">
            Dapatkan pengalaman membaca berita yang lebih baik di perangkat mobile Anda.
          </p>
          <p className="m-0 mt-4 flex flex-wrap gap-2.5">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-white transition-colors hover:bg-slate-700"
            >
              <Apple className="h-5 w-5" aria-hidden="true" />
              <span className="grid leading-tight">
                <small className="font-sans text-[9px] uppercase">Download on the</small>
                <strong className="font-sans text-sm font-bold">App Store</strong>
              </span>
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-white transition-colors hover:bg-slate-700"
            >
              <Play className="h-5 w-5" aria-hidden="true" />
              <span className="grid leading-tight">
                <small className="font-sans text-[9px] uppercase">Temukan di</small>
                <strong className="font-sans text-sm font-bold">Google Play</strong>
              </span>
            </Link>
          </p>
        </div>
      </div>

      <div className="border-t border-slate-200">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 font-sans text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="m-0">© {year} {site.settings.name}. Semua hak dilindungi.</p>
          <p className="m-0 flex items-center gap-4">
            <Link href="/privacy" className="transition-colors hover:text-slate-900">Privasi</Link>
            <Link href="/terms" className="transition-colors hover:text-slate-900">Syarat</Link>
            <Link href="/contact" className="transition-colors hover:text-slate-900">Kontak</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
