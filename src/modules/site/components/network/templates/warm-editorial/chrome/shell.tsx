import type { ReactNode } from 'react';

import type { NetworkSiteData } from '@/modules/delivery/models';
import { WarmEditorialHeader } from '@/modules/site/components/network/templates/warm-editorial/chrome/site-header';
import { WarmEditorialFooter } from '@/modules/site/components/network/templates/warm-editorial/chrome/site-footer';
import { WarmEditorialBackToTop } from '@/modules/site/components/network/templates/warm-editorial/chrome/back-to-top';

/**
 * Cangkang tunggal template: skip-link + header + main + footer + back-to-top
 * SELALU sama di semua halaman (listing, artikel, search, lapor, 404).
 * Satu-satunya cara merakit halaman warm-editorial — perubahan chrome cukup di sini.
 */
export function WarmEditorialShell({
  site,
  path = '/',
  children,
}: {
  readonly site: NetworkSiteData;
  readonly path?: string;
  readonly children: ReactNode;
}) {
  return (
    <div className="min-h-screen supports-[min-height:100svh]:min-h-svh bg-[#fdf7f0] font-sans text-slate-900 antialiased" data-template="warm-editorial">
      <a
        href="#main-content"
        className="fixed left-4 top-[-5rem] z-50 rounded-lg bg-slate-900 px-4 py-3 font-sans text-sm text-white transition-[top] duration-180 focus:top-4"
      >
        Lewati ke konten
      </a>
      <WarmEditorialHeader site={site} path={path} />
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
      <WarmEditorialFooter site={site} />
      <WarmEditorialBackToTop />
    </div>
  );
}
