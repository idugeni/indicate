import Image from 'next/image';
import Link from 'next/link';

import type { NetworkSiteData } from '@/modules/delivery/models';
import { BlackLimeHeaderBar } from '@/modules/site/components/network/templates/black-lime/chrome/header-bar';
import { BlackLimeDesktopNav, BlackLimeMobileNav } from '@/modules/site/components/network/templates/black-lime/chrome/site-nav-menu';
import { getSiteCategoryNav } from '@/modules/site/components/network/templates/black-lime/server/site-nav';

/**
 * 3-column navbar: [brand as needed | flexible menu | actions as needed].
 * Center: Home plus inline categories up to the limit, the rest under the "Lainnya" menu.
 */
export async function BlackLimeHeader({ site, path = '/' }: { readonly site: NetworkSiteData; readonly path?: string }) {
  const nav = await getSiteCategoryNav(site, 8);
  const showRegion =
    site.regionName !== null &&
    site.regionName !== undefined &&
    site.regionName !== '' &&
    !site.settings.name.toLowerCase().includes(site.regionName.toLowerCase());

  return (
    <header className="sticky top-0 z-40 border-b border-[#242b1f] bg-[#0a0c07]/95 backdrop-blur">
      <BlackLimeHeaderBar
        brand={
          <Link href="/" className="flex min-w-0 items-center gap-2.5 leading-none no-underline">
            <Image
              unoptimized
              src={site.settings.logoUrl}
              alt={site.settings.name}
              width={72}
              height={72}
              className="h-9 w-9 flex-none rounded-xl object-cover ring-1 ring-[#242b1f]"
            />
            <span className="grid min-w-0 leading-none">
              <span className="flex min-w-0 items-center gap-1.5">
                <strong className="truncate font-sans text-lg font-extrabold tracking-tight text-slate-100">
                  {site.settings.name}
                </strong>
                {showRegion ? (
                  <span className="flex-none rounded-md bg-[#c5f82a]/10 px-1.5 py-0.5 font-sans text-[11px] font-bold text-[#c5f82a]">
                    {site.regionName}
                  </span>
                ) : null}
              </span>
            </span>
          </Link>
        }
        nav={<BlackLimeDesktopNav categories={nav} path={path} />}
        sidebar={<BlackLimeMobileNav categories={nav} path={path} />}
      />
    </header>
  );
}
