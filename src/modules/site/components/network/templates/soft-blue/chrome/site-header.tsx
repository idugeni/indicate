import Image from 'next/image';
import Link from 'next/link';

import type { NetworkSiteData } from '@/modules/delivery/models';
import { SoftBlueHeaderBar } from '@/modules/site/components/network/templates/soft-blue/chrome/header-bar';
import { SoftBlueTopBar } from '@/modules/site/components/network/templates/soft-blue/chrome/top-bar';
import { SoftBlueDesktopNav, SoftBlueMobileNav } from '@/modules/site/components/network/templates/soft-blue/chrome/site-nav-menu';
import { getSiteCategoryNav } from '@/modules/site/components/network/templates/soft-blue/server/site-nav';

/**
 * Navbar 3 kolom: [brand secukupnya | menu fleksibel | aksi secukupnya].
 * Tengah: Beranda + kategori inline hingga batas, sisanya ke menu "Lainnya".
 */
export async function SoftBlueHeader({ site, path = '/' }: { readonly site: NetworkSiteData; readonly path?: string }) {
  const nav = await getSiteCategoryNav(site, 24);
  const showRegion =
    site.regionName !== null &&
    site.regionName !== undefined &&
    site.regionName !== '' &&
    !site.settings.name.toLowerCase().includes(site.regionName.toLowerCase());

  return (
    <>
      <SoftBlueTopBar site={site} />
      <div className="sticky top-0 z-40 px-4 pt-3 sm:px-6">
        <div className="mx-auto max-w-6xl rounded-2xl bg-white/95 shadow-sm ring-1 ring-slate-200/70 backdrop-blur">
          <SoftBlueHeaderBar
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
                  <span className="flex-none rounded-md bg-[#2563eb]/10 px-1.5 py-0.5 font-sans text-[11px] font-bold text-[#2563eb]">
                    {site.regionName}
                  </span>
                ) : null}
              </span>
            </span>
          </Link>
        }
        nav={<SoftBlueDesktopNav categories={nav} path={path} />}
        sidebar={<SoftBlueMobileNav categories={nav} path={path} />}
          />
        </div>
      </div>
    </>
  );
}
