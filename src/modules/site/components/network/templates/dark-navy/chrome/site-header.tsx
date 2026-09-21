import Image from 'next/image';
import Link from 'next/link';

import type { NetworkSiteData } from '@/modules/delivery/models';
import { DarkNavyHeaderBar } from '@/modules/site/components/network/templates/dark-navy/chrome/header-bar';
import { DarkNavyDesktopNav, DarkNavyMobileNav } from '@/modules/site/components/network/templates/dark-navy/chrome/site-nav-menu';
import { getSiteCategoryNav } from '@/modules/site/components/network/templates/dark-navy/server/site-nav';

/**
 * 3-column navbar: [brand as needed | flexible menu | actions as needed].
 * Center: Home plus inline categories up to the limit, the rest under the "Lainnya" menu.
 */
export async function DarkNavyHeader({ site, path = '/' }: { readonly site: NetworkSiteData; readonly path?: string }) {
  const nav = await getSiteCategoryNav(site, 8);
  const showRegion =
    site.regionName !== null &&
    site.regionName !== undefined &&
    site.regionName !== '' &&
    !site.settings.name.toLowerCase().includes(site.regionName.toLowerCase());

  return (
    <header className="sticky top-0 z-40 border-b border-[#1b2c4f] bg-[#070f22]/95 backdrop-blur">
      <DarkNavyHeaderBar
        brand={
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
              <span className="flex min-w-0 items-center gap-1.5">
                <strong className="truncate font-sans text-lg font-extrabold tracking-tight text-[#eaf0fb]">
                  {site.settings.name}
                </strong>
                {showRegion ? (
                  <span className="flex-none rounded-md bg-[#2f7bff]/10 px-1.5 py-0.5 font-sans text-[11px] font-bold text-[#2f7bff]">
                    {site.regionName}
                  </span>
                ) : null}
              </span>
            </span>
          </Link>
        }
        nav={<DarkNavyDesktopNav categories={nav} path={path} />}
        sidebar={<DarkNavyMobileNav categories={nav} path={path} />}
      />
    </header>
  );
}
