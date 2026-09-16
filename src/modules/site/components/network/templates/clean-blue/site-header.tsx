import Image from 'next/image';
import Link from 'next/link';

import type { NetworkSiteData } from '@/modules/delivery/models';
import { CleanBlueDesktopNav, CleanBlueMobileNav } from '@/modules/site/components/network/templates/clean-blue/site-nav-menu';
import { CleanBlueSearchToggle } from '@/modules/site/components/network/templates/clean-blue/search-toggle';
import { getSiteCategoryNav } from '@/modules/site/components/network/templates/clean-blue/site-nav';

/**
 * Navbar 3 kolom: [brand kiri | menu tengah | aksi kanan].
 * Brand = logo + nama (tanpa tagline). Menu ramping: Beranda, mega menu
 * Kategori, dropdown Info (legal). Search ikon mengembang.
 */
export async function CleanBlueHeader({ site, path = '/' }: { readonly site: NetworkSiteData; readonly path?: string }) {
  const nav = await getSiteCategoryNav(site, 12);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/95 backdrop-blur">
      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-4 py-3 sm:px-6">
        <div className="min-w-0 justify-self-start">
          <Link href="/" className="flex min-w-0 items-center gap-2.5 leading-none no-underline">
            <Image
              unoptimized
              src={site.settings.logoUrl}
              alt={site.settings.name}
              width={72}
              height={72}
              className="h-9 w-9 flex-none rounded-xl object-cover ring-1 ring-slate-200"
            />
            <span className="grid min-w-0 leading-none">
              <span className="flex min-w-0 items-center gap-1.5">
                <strong className="truncate font-sans text-lg font-extrabold tracking-tight text-slate-900">
                  {site.settings.name}
                </strong>
                {site.regionName === null ||
                site.regionName === undefined ||
                site.regionName === '' ||
                site.settings.name.toLowerCase().includes(site.regionName.toLowerCase()) ? null : (
                  <span className="flex-none rounded-md bg-[#1a5fd0]/10 px-1.5 py-0.5 font-sans text-[11px] font-bold text-[#1a5fd0]">
                    {site.regionName}
                  </span>
                )}
              </span>
            </span>
          </Link>
        </div>

        <CleanBlueDesktopNav categories={nav} path={path} />

        <div className="flex items-center justify-end gap-2.5 justify-self-end">
          <CleanBlueSearchToggle />
          <Link
            href="#newsletter"
            className="hidden h-10 flex-none items-center justify-center whitespace-nowrap rounded-full bg-[#1a5fd0] px-5 font-sans text-sm font-bold text-white transition-colors hover:bg-[#155cb8] sm:inline-flex"
          >
            Langganan
          </Link>
        </div>
      </div>

      <CleanBlueMobileNav categories={nav} path={path} />
    </header>
  );
}
