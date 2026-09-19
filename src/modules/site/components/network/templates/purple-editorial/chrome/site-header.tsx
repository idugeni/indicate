import Image from 'next/image';
import Link from 'next/link';

import type { NetworkSiteData } from '@/modules/delivery/models';
import { PurpleEditorialHeaderBar } from '@/modules/site/components/network/templates/purple-editorial/chrome/header-bar';
import { PurpleEditorialTopBar } from '@/modules/site/components/network/templates/purple-editorial/chrome/top-bar';
import { PurpleEditorialDesktopNav, PurpleEditorialMobileNav } from '@/modules/site/components/network/templates/purple-editorial/chrome/site-nav-menu';
import { getSiteCategoryNav } from '@/modules/site/components/network/templates/purple-editorial/server/site-nav';

/**
 * Navbar 3 kolom: [brand secukupnya | menu fleksibel | aksi secukupnya].
 * Tengah: Beranda + kategori inline hingga batas, sisanya ke menu "Lainnya".
 */
export async function PurpleEditorialHeader({ site, path = '/' }: { readonly site: NetworkSiteData; readonly path?: string }) {
  const nav = await getSiteCategoryNav(site, 24);
  const showRegion =
    site.regionName !== null &&
    site.regionName !== undefined &&
    site.regionName !== '' &&
    !site.settings.name.toLowerCase().includes(site.regionName.toLowerCase());

  return (
    <>
      <PurpleEditorialTopBar site={site} />
      <div className="sticky top-0 z-40 border-b border-slate-100 bg-white/95 backdrop-blur">
      <PurpleEditorialHeaderBar
        brand={
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
                {showRegion ? (
                  <span className="flex-none rounded-md bg-[#7c3aed]/10 px-1.5 py-0.5 font-sans text-[11px] font-bold text-[#7c3aed]">
                    {site.regionName}
                  </span>
                ) : null}
              </span>
            </span>
          </Link>
        }
        nav={<PurpleEditorialDesktopNav categories={nav} path={path} />}
        sidebar={<PurpleEditorialMobileNav categories={nav} path={path} />}
      />
      </div>
    </>
  );
}
