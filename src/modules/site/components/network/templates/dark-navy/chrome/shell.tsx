import type { ReactNode } from 'react';

import type { NetworkSiteData } from '@/modules/delivery/models';
import { templateThemeStyle } from '@/modules/site/components/network/ui/template-theme';
import { DARK_NAVY } from '@/modules/site/components/network/templates/dark-navy/theme';
import { DarkNavyHeader } from '@/modules/site/components/network/templates/dark-navy/chrome/site-header';
import { DarkNavyFooter } from '@/modules/site/components/network/templates/dark-navy/chrome/site-footer';
import { DarkNavyBackToTop } from '@/modules/site/components/network/templates/dark-navy/chrome/back-to-top';

/**
 * Cangkang tunggal template: skip-link + header + main + footer + back-to-top
 * SELALU sama di semua halaman (listing, artikel, search, lapor, 404).
 * Satu-satunya cara merakit halaman dark-navy — perubahan chrome cukup di sini.
 */
export function DarkNavyShell({
  site,
  path = '/',
  children,
}: {
  readonly site: NetworkSiteData;
  readonly path?: string;
  readonly children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col supports-[min-height:100svh]:min-h-svh bg-[#070f22] font-sans text-[#eaf0fb] antialiased" data-template="dark-navy" style={templateThemeStyle(DARK_NAVY)}>
      <a
        href="#main-content"
        className="fixed left-4 top-[-5rem] z-50 rounded-lg bg-[#2f7bff] px-4 py-3 font-sans text-sm text-white transition-[top] duration-180 focus:top-4"
      >
        Lewati ke konten
      </a>
      <DarkNavyHeader site={site} path={path} />
      <main id="main-content" tabIndex={-1} className="flex-1">
        {children}
      </main>
      <DarkNavyFooter site={site} />
      <DarkNavyBackToTop />
    </div>
  );
}
