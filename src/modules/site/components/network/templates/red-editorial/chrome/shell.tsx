import type { ReactNode } from 'react';

import type { NetworkSiteData } from '@/modules/delivery/models';
import { templateThemeStyle } from '@/modules/site/components/network/ui/template-theme';
import { RED_EDITORIAL } from '@/modules/site/components/network/templates/red-editorial/theme';
import { RedEditorialHeader } from '@/modules/site/components/network/templates/red-editorial/chrome/site-header';
import { RedEditorialFooter } from '@/modules/site/components/network/templates/red-editorial/chrome/site-footer';
import { RedEditorialBackToTop } from '@/modules/site/components/network/templates/red-editorial/chrome/back-to-top';

/**
 * Cangkang tunggal template: skip-link + header + main + footer + back-to-top
 * SELALU sama di semua halaman (listing, artikel, search, lapor, 404).
 * Satu-satunya cara merakit halaman red-editorial — perubahan chrome cukup di sini.
 */
export function RedEditorialShell({
  site,
  path = '/',
  children,
}: {
  readonly site: NetworkSiteData;
  readonly path?: string;
  readonly children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col supports-[min-height:100svh]:min-h-svh bg-[#fffafa] font-sans text-slate-900 antialiased" data-template="red-editorial" style={templateThemeStyle(RED_EDITORIAL)}>
      <a
        href="#main-content"
        className="fixed left-4 top-[-5rem] z-50 rounded-lg bg-slate-900 px-4 py-3 font-sans text-sm text-white transition-[top] duration-180 focus:top-4"
      >
        Lewati ke konten
      </a>
      <RedEditorialHeader site={site} path={path} />
      <main id="main-content" tabIndex={-1} className="flex-1">
        {children}
      </main>
      <RedEditorialFooter site={site} />
      <RedEditorialBackToTop />
    </div>
  );
}
