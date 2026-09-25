import type { ReactNode } from 'react';

import type { NetworkSiteData } from '@/modules/delivery/models';
import { templateThemeStyle } from '@/modules/site/components/network/ui/template-theme';
import { SOFT_BLUE } from '@/modules/site/components/network/templates/soft-blue/theme';
import { SoftBlueHeader } from '@/modules/site/components/network/templates/soft-blue/chrome/site-header';
import { SoftBlueFooter } from '@/modules/site/components/network/templates/soft-blue/chrome/site-footer';
import { SoftBlueBackToTop } from '@/modules/site/components/network/templates/soft-blue/chrome/back-to-top';

/**
 * Cangkang tunggal template: skip-link + header + main + footer + back-to-top
 * SELALU sama di semua halaman (listing, artikel, search, lapor, 404).
 * Satu-satunya cara merakit halaman soft-blue — perubahan chrome cukup di sini.
 */
export function SoftBlueShell({
  site,
  path = '/',
  children,
}: {
  readonly site: NetworkSiteData;
  readonly path?: string;
  readonly children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col supports-[min-height:100svh]:min-h-svh bg-[#f1f6ff] font-sans text-slate-900 antialiased" data-template="soft-blue" style={templateThemeStyle(SOFT_BLUE)}>
      <a
        href="#main-content"
        className="fixed left-4 top-[-5rem] z-50 rounded-lg bg-slate-900 px-4 py-3 font-sans text-sm text-white transition-[top] duration-180 focus:top-4"
      >
        Lewati ke konten
      </a>
      <SoftBlueHeader site={site} path={path} />
      <main id="main-content" tabIndex={-1} className="flex flex-1 flex-col">
        {children}
      </main>
      <SoftBlueFooter site={site} />
      <SoftBlueBackToTop />
    </div>
  );
}
