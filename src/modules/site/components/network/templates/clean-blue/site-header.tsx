import Image from 'next/image';
import Link from 'next/link';

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from '@/components/ui/navigation-menu';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { CleanBlueSearchToggle } from '@/modules/site/components/network/templates/clean-blue/search-toggle';
import { truncateTagline } from '@/modules/site/components/network/templates/clean-blue/shared';
import { getSiteCategoryNav } from '@/modules/site/components/network/templates/clean-blue/site-nav';

/**
 * Navbar 3 kolom: [brand kiri | menu tengah | aksi kanan].
 * Brand = nama saja (tanpa logo). Menu shadcn NavigationMenu, sumber
 * kategori shared (identik di semua halaman). Search mengembang ke kiri.
 */
export async function CleanBlueHeader({ site, path = '/' }: { readonly site: NetworkSiteData; readonly path?: string }) {
  const nav = await getSiteCategoryNav(site);
  const tagline = truncateTagline(site.settings.description);

  const linkClass = (active: boolean) =>
    `whitespace-nowrap px-3 py-2 font-sans text-sm transition-colors ${
      active
        ? 'font-semibold text-[#1a5fd0] underline decoration-2 underline-offset-8'
        : 'font-medium text-slate-600 hover:text-slate-900'
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/95 backdrop-blur">
      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-4 py-3 sm:px-6">
        <div className="min-w-0 justify-self-start">
          <Link href="/" className="flex min-w-0 items-center gap-2.5 leading-none no-underline">
            <Image
              unoptimized
              src={site.settings.logoUrl}
              alt=""
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
              <small className="mt-0.5 hidden truncate font-sans text-[11px] text-slate-600 sm:block">
                {tagline}
              </small>
            </span>
          </Link>
        </div>

        <NavigationMenu aria-label="Navigasi utama" className="hidden justify-self-center lg:flex">
          <NavigationMenuList className="gap-0.5">
            <NavigationMenuItem>
              <NavigationMenuLink href="/" aria-current={path === '/' ? 'page' : undefined} className={linkClass(path === '/')}>
                Beranda
              </NavigationMenuLink>
            </NavigationMenuItem>
            {nav.map((item) => (
              <NavigationMenuItem key={`${item.href}:${item.label}`}>
                <NavigationMenuLink
                  href={item.href}
                  aria-current={path === item.href ? 'page' : undefined}
                  className={linkClass(path === item.href)}
                >
                  {item.label}
                </NavigationMenuLink>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

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

      <nav aria-label="Navigasi utama seluler" className="no-scrollbar flex items-center gap-1 overflow-x-auto border-t border-slate-100 px-4 py-1.5 lg:hidden">
        <Link href="/" aria-current={path === '/' ? 'page' : undefined} className={linkClass(path === '/')}>
          Beranda
        </Link>
        {nav.map((item) => (
          <Link
            key={`${item.href}:${item.label}`}
            href={item.href}
            aria-current={path === item.href ? 'page' : undefined}
            className={linkClass(path === item.href)}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
